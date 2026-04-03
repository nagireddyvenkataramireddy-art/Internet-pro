
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { getRecords } from '../services/storage';
import { formatMoney, formatDate, formatDateTimePretty, formatDatePretty, formatNumber } from '../constants';

declare const Chart: any;

const Stats: React.FC = () => {
  const [searchName, setSearchName] = useState('');
  const [expandedPersons, setExpandedPersons] = useState<Record<string, boolean>>({});
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  
  const monthlyChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const monthlyChartInstance = useRef<any>(null);
  const pieChartInstance = useRef<any>(null);

  // Exclude Book records from Stats
  const records = getRecords().filter(r => r.category !== 'book');

  const filteredRecords = useMemo(() => {
    return records
      .filter(r => r.name.toLowerCase().includes(searchName.toLowerCase()))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reverse();
  }, [records, searchName]);

  // 1. TOP SUMMARY CALCULATIONS
  const summary = useMemo(() => {
    let lendPrincipal = 0, lendInterest = 0, lendTotal = 0;
    let borrowPrincipal = 0, borrowInterest = 0, borrowTotal = 0;

    records.forEach(r => {
        if (r.isLend) {
            lendPrincipal += r.principal;
            lendInterest += r.interest;
            lendTotal += r.totalAmount;
        } else {
            borrowPrincipal += r.principal;
            borrowInterest += r.interest;
            borrowTotal += r.totalAmount;
        }
    });

    return { 
        lendPrincipal, lendInterest, lendTotal, 
        borrowPrincipal, borrowInterest, borrowTotal, 
        net: lendTotal - borrowTotal 
    };
  }, [records]);

  // 2. PERSON MAP
  const personMap = useMemo(() => {
      const map: Record<string, { 
          lendP: number, lendI: number, lendT: number, 
          borrowP: number, borrowI: number, borrowT: number 
      }> = {};
      
      filteredRecords.forEach(r => {
          if(!map[r.name]) map[r.name] = { lendP:0, lendI:0, lendT:0, borrowP:0, borrowI:0, borrowT:0 };
          const p = map[r.name];
          if(r.isLend) {
              p.lendP += r.principal;
              p.lendI += r.interest;
              p.lendT += r.totalAmount;
          } else {
              p.borrowP += r.principal;
              p.borrowI += r.interest;
              p.borrowT += r.totalAmount;
          }
      });
      return map;
  }, [filteredRecords]);

  // 3. MONTHLY DATA
  const monthlyData = useMemo(() => {
     const map: Record<string, { lend: number, borrow: number }> = {};
     filteredRecords.forEach(r => {
         const d = new Date(r.date);
         if(isNaN(d.getTime())) return;
         const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
         if(!map[key]) map[key] = { lend: 0, borrow: 0 };
         if(r.isLend) map[key].lend += r.totalAmount;
         else map[key].borrow += r.totalAmount;
     });
     
     return Object.keys(map).sort().reverse().map(key => {
         const [y, m] = key.split('-');
         const dateObj = new Date(parseInt(y), parseInt(m)-1);
         const label = dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
         return {
             key,
             label,
             lend: map[key].lend,
             borrow: map[key].borrow,
             net: map[key].lend - map[key].borrow
         };
     });
  }, [filteredRecords]);

  // CHARTS
  useEffect(() => {
      // Monthly Bar Chart
      if (monthlyChartRef.current) {
          if (monthlyChartInstance.current) monthlyChartInstance.current.destroy();
          const ctx = monthlyChartRef.current.getContext('2d');
          
          const chartData = [...monthlyData].reverse();
          
          if (ctx) {
              monthlyChartInstance.current = new Chart(ctx, {
                  type: 'bar',
                  data: {
                      labels: chartData.map(d => d.label),
                      datasets: [{
                          label: 'Net Movement',
                          data: chartData.map(d => d.net),
                          backgroundColor: chartData.map(d => d.net >= 0 ? '#4caf50' : '#ef5350'),
                          borderRadius: 4
                      }]
                  },
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                          x: { grid: { display: false } },
                          y: { beginAtZero: true }
                      }
                  }
              });
          }
      }

      // Pie Chart
      if (pieChartRef.current) {
          if (pieChartInstance.current) pieChartInstance.current.destroy();
          const ctx = pieChartRef.current.getContext('2d');
          
          const totalLend = summary.lendTotal;
          const totalBorrow = summary.borrowTotal;
          
          if (ctx && (totalLend > 0 || totalBorrow > 0)) {
              pieChartInstance.current = new Chart(ctx, {
                  type: 'doughnut',
                  data: {
                      labels: ['Lend', 'Borrow'],
                      datasets: [{
                          data: [totalLend, totalBorrow],
                          backgroundColor: ['#4caf50', '#ef5350'],
                          borderWidth: 0
                      }]
                  },
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' } }
                  }
              });
          }
      }

      return () => {
          if (monthlyChartInstance.current) monthlyChartInstance.current.destroy();
          if (pieChartInstance.current) pieChartInstance.current.destroy();
      };
  }, [monthlyData, summary]);

  // Handlers
  const togglePerson = (name: string) => {
      setExpandedPersons(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleMonth = (key: string) => {
      setExpandedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getFreqShort = (f?: string) => {
      if(f === 'Yearly') return '12 M';
      if(f === 'Half-Yearly') return '6 M';
      if(f === 'Quarterly') return '3 M';
      if(f === 'Monthly') return '1 M';
      return '12 M';
  };

  const downloadPDF = (name: string, data: any) => {
      const net = data.lendT - data.borrowT;
      const content = `
          <h2>${name} - Summary</h2>
          <hr/>
          <h3>Lend Details</h3>
          <p>Principal: ${formatMoney(data.lendP)}</p>
          <p>Interest: ${formatMoney(data.lendI)}</p>
          <p><strong>Total Given: ${formatMoney(data.lendT)}</strong></p>
          <hr/>
          <h3>Borrow Details</h3>
          <p>Principal: ${formatMoney(data.borrowP)}</p>
          <p>Interest: ${formatMoney(data.borrowI)}</p>
          <p><strong>Total Taken: ${formatMoney(data.borrowT)}</strong></p>
          <hr/>
          <h2>Net Position: ${formatMoney(net)}</h2>
      `;
      const win = window.open("", "_blank");
      if(win) {
          win.document.write(`<html><head><title>${name}</title></head><body style="font-family:sans-serif; padding:20px;">${content}</body></html>`);
          win.document.close();
          // Wait for content to render before printing
          setTimeout(() => {
              win.print();
          }, 500);
      }
  };

  return (
    <div className="page" style={{paddingTop:'10px'}}>
        <div className="container">
            <h2 className="title" style={{textAlign:'left', fontSize:'24px', marginBottom:'15px'}}>Financial Summary</h2>

            {/* TOP SUMMARY CARDS */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
                <div className="dash-card" style={{borderLeft: '4px solid #2e7d32', position: 'relative', overflow: 'hidden'}}>
                    <div style={{position: 'absolute', right: '-10px', top: '-10px', fontSize: '60px', opacity: '0.1', color: '#2e7d32'}}>
                        <i className="bi bi-graph-up-arrow"></i>
                    </div>
                    <div className="dash-label" style={{color: '#1b5e20', display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <i className="bi bi-arrow-up-circle-fill"></i> Lend (Given)
                    </div>
                    <div className="dash-val" style={{color: '#2e7d32'}}>{formatMoney(summary.lendPrincipal)}</div>
                    <div className="dash-sub" style={{color: '#4caf50'}}>
                        <i className="bi bi-plus-circle"></i> Interest: {formatMoney(summary.lendInterest)}
                    </div>
                </div>
                <div className="dash-card" style={{borderLeft: '4px solid #c62828', position: 'relative', overflow: 'hidden'}}>
                    <div style={{position: 'absolute', right: '-10px', top: '-10px', fontSize: '60px', opacity: '0.1', color: '#c62828'}}>
                        <i className="bi bi-graph-down-arrow"></i>
                    </div>
                    <div className="dash-label" style={{color: '#b71c1c', display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <i className="bi bi-arrow-down-circle-fill"></i> Borrow (Taken)
                    </div>
                    <div className="dash-val" style={{color: '#c62828'}}>{formatMoney(summary.borrowPrincipal)}</div>
                    <div className="dash-sub" style={{color: '#ef5350'}}>
                        <i className="bi bi-dash-circle"></i> Interest: {formatMoney(summary.borrowInterest)}
                    </div>
                </div>
            </div>
            
            <div className="final-card" style={{background: summary.net >= 0 ? '#f1f8e9' : '#ffebee', border: summary.net >= 0 ? '1px solid #c8e6c9' : '1px solid #ffcdd2'}}>
                 <div className="dash-label" style={{display:'flex', justifyContent:'center', alignItems:'center', gap:'8px'}}>
                    <i className={`bi ${summary.net >= 0 ? 'bi-wallet-fill' : 'bi-exclamation-triangle-fill'}`}></i>
                    Final Net Position
                 </div>
                 <div className="final-val" style={{color: summary.net >= 0 ? '#2e7d32' : '#c62828'}}>
                    {formatMoney(summary.net)}
                 </div>
            </div>

            {/* SEARCH */}
            <div className="summary-header" style={{fontSize:'16px'}}>Search Name</div>
            <input 
                type="text" 
                placeholder="Type name to filter..." 
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                style={{width:'100%', padding:'12px', borderRadius:'12px', border:'1px solid #ccc', marginBottom:'20px', fontSize:'15px'}}
            />

            {/* TRANSACTION LIST (Styled like History Card) */}
            <div className="record-list">
              {filteredRecords.map(record => (
                <div key={record.id} style={{
                    background: 'white', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(0,0,0,0.08)', 
                    marginBottom: '15px', 
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}>
                    {/* Header */}
                    <div style={{
                        background: record.isLend ? 'linear-gradient(to right, #e8f5e9, #f1f8e9)' : 'linear-gradient(to right, #ffebee, #fef2f2)', 
                        padding: '12px 16px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        fontSize: '15px', 
                        fontWeight: '600',
                        color: record.isLend ? '#2e7d32' : '#c62828',
                        borderBottom: `1px solid ${record.isLend ? '#c8e6c9' : '#ffcdd2'}`
                    }}>
                        <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <i className={`bi ${record.isLend ? 'bi-arrow-up-right-circle-fill' : 'bi-arrow-down-left-circle-fill'}`}></i>
                            {record.name}
                        </span>
                        <span style={{fontSize:'12px', opacity: 0.8, fontWeight: 'normal', background: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: '12px'}}>
                            {formatDateTimePretty(record.created || record.date).split(' -')[0]}
                        </span>
                    </div>

                    {/* Grid Body */}
                    <div style={{padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                        {/* Row 1 */}
                        <div>
                            <div style={{fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', color:'#555', textTransform:'uppercase'}}>
                                <i className="bi bi-calendar-check"></i> Given Date
                            </div>
                            <div style={{color: '#1565c0', fontSize: '14px', fontWeight:'600', marginTop:'2px', paddingLeft: '2px'}}>
                                {formatDatePretty(record.fromDate || record.date)}
                            </div>
                        </div>
                        <div>
                            <div style={{fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', color:'#555', textTransform:'uppercase'}}>
                                <i className="bi bi-currency-rupee"></i> Principal
                            </div>
                            <div style={{color: '#333', fontSize: '15px', fontWeight:'700', marginTop:'2px', paddingLeft: '2px'}}>
                                {formatNumber(record.principal)}
                            </div>
                        </div>
                        
                        {/* Row 2 */}
                        <div>
                            <div style={{fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', color:'#555', textTransform:'uppercase'}}>
                                <i className="bi bi-calendar-x"></i> Return Date
                            </div>
                            <div style={{color: '#1565c0', fontSize: '14px', fontWeight:'600', marginTop:'2px', paddingLeft: '2px'}}>
                                {record.toDate ? formatDatePretty(record.toDate) : "Ongoing"}
                            </div>
                        </div>
                        <div>
                            <div style={{fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px', color:'#555', textTransform:'uppercase'}}>
                                <i className="bi bi-clock"></i> Duration
                            </div>
                            <div style={{color: '#333', fontSize: '14px', fontWeight:'500', marginTop:'2px', paddingLeft: '2px'}}>
                                {record.durationText}
                            </div>
                        </div>
                    </div>

                    {/* Interest Strip */}
                    <div style={{
                        background: '#fff9c4', 
                        padding: '10px 14px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        borderTop: '1px solid #f0e6c0', 
                        borderBottom: '1px solid #f0e6c0'
                    }}>
                        <div style={{textAlign: 'center', flex:1}}>
                            <div style={{fontSize: '11px', fontWeight: 'bold', color:'#f57f17'}}>RATE</div>
                            <div style={{fontSize: '13px', color: '#333', fontWeight:'600'}}>
                                {record.rate} {record.rateType === 'rupees' ? '₹' : '%'}
                            </div>
                        </div>
                        <div style={{textAlign: 'center', flex:1.5}}>
                            <div style={{fontSize: '11px', fontWeight: 'bold', color:'#f57f17'}}>TYPE</div>
                            <div style={{fontSize: '13px', color: '#333', fontWeight:'600'}}>
                                {record.interestType === 'Compound' ? `Compound (${getFreqShort(record.compoundFrequency)})` : 'Simple'}
                            </div>
                        </div>
                        <div style={{textAlign: 'center', flex:1.5}}>
                            <div style={{fontSize: '11px', fontWeight: 'bold', color:'#f57f17'}}>INTEREST</div>
                            <div style={{fontSize: '14px', color: '#e65100', fontWeight: '700'}}>
                                {formatNumber(record.interest)}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{padding: '12px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold', color: record.isLend ? '#1b5e20' : '#b71c1c', background: record.isLend ? '#f1f8e9' : '#fff5f5'}}>
                        Total: {formatNumber(record.totalAmount)}
                    </div>
                </div>
              ))}
            </div>

            {/* PROFIT / LOSS SUMMARY */}
            <h3 className="summary-header">Net Position</h3>
            <div style={{
                background: summary.net >= 0 ? 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' : 'linear-gradient(135deg, #ffebee, #ffcdd2)',
                padding: '20px',
                borderRadius: '16px',
                marginBottom: '25px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                border: summary.net >= 0 ? '1px solid #a5d6a7' : '1px solid #ef9a9a'
            }}>
                <div>
                     <div style={{fontSize: '14px', color: summary.net >= 0 ? '#1b5e20' : '#b71c1c', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px'}}>
                        Total Profit / Loss
                     </div>
                     <div style={{fontSize: '28px', fontWeight: '800', color: summary.net >= 0 ? '#1b5e20' : '#b71c1c'}}>
                        {summary.net >= 0 ? '+' : ''}{formatMoney(summary.net)}
                     </div>
                </div>
                <div style={{textAlign: 'right'}}>
                    <div className="badge-percent" style={{
                        background: summary.net >= 0 ? '#2e7d32' : '#c62828',
                        fontSize: '14px',
                        padding: '6px 12px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                        {summary.lendTotal > 0 ? ((Math.abs(summary.net) / summary.lendTotal) * 100).toFixed(2) : '0.00'}%
                    </div>
                    <div style={{fontSize: '11px', marginTop: '6px', color: summary.net >= 0 ? '#1b5e20' : '#b71c1c', opacity: 0.8}}>
                        Margin
                    </div>
                </div>
            </div>

            {/* PERSON-WISE SUMMARY */}
            <h3 className="summary-header">Person-wise Summary</h3>
            {Object.keys(personMap).length === 0 && <p style={{color:'#fff', opacity: 0.8}}>No records found.</p>}
            
            {Object.keys(personMap).map(name => {
                const data = personMap[name];
                const net = data.lendT - data.borrowT;
                const isExpanded = expandedPersons[name];

                return (
                    <div key={name} className="person-card">
                        <div className="person-header" onClick={() => togglePerson(name)} 
                             style={{
                                background: net >= 0 ? 'linear-gradient(to right, #f1f8e9, #fff)' : 'linear-gradient(to right, #ffebee, #fff)',
                                borderLeft: `5px solid ${net >= 0 ? '#4caf50' : '#ef5350'}`
                             }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', 
                                background: net >= 0 ? '#e8f5e9' : '#ffebee', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: net >= 0 ? '#2e7d32' : '#c62828',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                            }}>
                                <i className={`bi ${net >= 0 ? 'bi-graph-up-arrow' : 'bi-graph-down-arrow'}`} style={{fontSize: '18px'}}></i>
                            </div>
                            <span style={{fontWeight:'600', flex:1, fontSize: '16px', color: '#333'}}>{name}</span>
                            <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`} style={{color: '#777'}}></i>
                        </div>
                        
                        {isExpanded && (
                            <div style={{padding:'16px'}}>
                                <div className="details-block" style={{marginBottom: '15px'}}>
                                    <div className="details-title" style={{color: '#2e7d32', borderColor: '#c8e6c9'}}>
                                        <i className="bi bi-arrow-up-circle"></i> Lend Details
                                    </div>
                                    <div className="detail-row"><span>Principal:</span> <span>{formatMoney(data.lendP)}</span></div>
                                    <div className="detail-row"><span>Interest:</span> <span>{formatMoney(data.lendI)}</span></div>
                                    <div className="detail-row" style={{fontWeight:'bold', marginTop:'2px', color:'#1b5e20'}}>
                                        <span>Total:</span> <span>{formatMoney(data.lendT)}</span>
                                    </div>
                                </div>

                                <div className="details-block">
                                    <div className="details-title" style={{color: '#c62828', borderColor: '#ffcdd2'}}>
                                        <i className="bi bi-arrow-down-circle"></i> Borrow Details
                                    </div>
                                    <div className="detail-row"><span>Principal:</span> <span>{formatMoney(data.borrowP)}</span></div>
                                    <div className="detail-row"><span>Interest:</span> <span>{formatMoney(data.borrowI)}</span></div>
                                    <div className="detail-row" style={{fontWeight:'bold', marginTop:'2px', color:'#b71c1c'}}>
                                        <span>Total:</span> <span>{formatMoney(data.borrowT)}</span>
                                    </div>
                                </div>
                                
                                <div style={{marginTop:'15px', borderTop:'1px solid #eee', paddingTop:'10px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <div style={{fontSize: '14px', color: '#555', fontWeight: '500'}}>Net Position</div>
                                    <div style={{fontSize:'20px', fontWeight:'800', color: net >= 0 ? '#2e7d32' : '#c62828'}}>
                                        {formatMoney(net)}
                                    </div>
                                </div>

                                <button 
                                    className="btn-small btn-load" 
                                    style={{marginTop:'15px', width:'100%', padding:'12px', borderRadius: '12px', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', background: 'linear-gradient(135deg, #1976d2, #1565c0)'}}
                                    onClick={() => downloadPDF(name, data)}
                                >
                                    <i className="bi bi-file-earmark-pdf"></i> Download Statement
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}

            {/* MONTHLY SUMMARY */}
            <h3 className="summary-header">Monthly Summary</h3>
            {monthlyData.length === 0 && <p style={{color:'#fff', opacity: 0.8}}>No data available.</p>}
            {monthlyData.map(m => (
                <div key={m.key} className="accordion-item" style={{background: expandedMonths[m.key] ? '#fff' : 'rgba(255,255,255,0.95)'}}>
                    <div className="accordion-header" onClick={() => toggleMonth(m.key)}>
                        <span style={{display:'flex', alignItems:'center', gap:'10px'}}>
                            <div style={{width:'8px', height:'8px', borderRadius:'50%', background: m.net >= 0 ? '#4caf50' : '#ef5350'}}></div>
                            {m.label}
                        </span>
                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                             {!expandedMonths[m.key] && (
                                <span style={{fontSize:'13px', fontWeight:'600', color: m.net>=0?'#15803d':'#b91c1c'}}>{formatMoney(m.net)}</span>
                             )}
                            <i className={`bi bi-chevron-${expandedMonths[m.key] ? 'up' : 'down'}`}></i>
                        </div>
                    </div>
                    {expandedMonths[m.key] && (
                        <div className="accordion-body">
                            <div style={{fontSize:'14px', marginBottom:'4px', display:'flex', justifyContent:'space-between'}}>
                                <span style={{display:'flex', alignItems:'center', gap:'5px', color:'#555'}}><i className="bi bi-arrow-up-circle text-success"></i> Lend:</span> 
                                <span style={{color:'#15803d', fontWeight:'600'}}>{formatMoney(m.lend)}</span>
                            </div>
                            <div style={{fontSize:'14px', marginBottom:'8px', display:'flex', justifyContent:'space-between'}}>
                                <span style={{display:'flex', alignItems:'center', gap:'5px', color:'#555'}}><i className="bi bi-arrow-down-circle text-danger"></i> Borrow:</span> 
                                <span style={{color:'#b91c1c', fontWeight:'600'}}>{formatMoney(m.borrow)}</span>
                            </div>
                            <div style={{fontSize:'16px', fontWeight:'bold', color: m.net >= 0 ? '#2e7d32' : '#c62828', display:'flex', justifyContent:'space-between', borderTop:'1px solid #eee', paddingTop:'8px', marginTop: '4px'}}>
                                <span>Net:</span> <span>{formatMoney(m.net)}</span>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {/* CHARTS */}
            <h3 className="summary-header">Monthly Trend</h3>
            <div className="dash-card" style={{height:'240px', display:'flex', alignItems:'center', justifyContent:'center', padding: '10px'}}>
                <canvas ref={monthlyChartRef}></canvas>
            </div>

            <h3 className="summary-header">Asset Distribution</h3>
            <div className="dash-card" style={{height:'300px', display:'flex', alignItems:'center', justifyContent:'center', padding: '10px'}}>
                 <canvas ref={pieChartRef}></canvas>
            </div>

            {/* TOP LENDER / BORROWER */}
            <h3 className="summary-header">Highlights</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div style={{background:'#e3f2fd', padding:'16px', borderRadius:'16px', border: '1px solid #bbdefb'}}>
                    <div style={{fontWeight:'700', display:'flex', alignItems:'center', gap:'6px', color: '#1565c0', fontSize: '13px', textTransform: 'uppercase'}}>
                        <i className="bi bi-trophy-fill"></i> Top Lender
                    </div>
                    {(() => {
                        let top = { name: 'None', val: 0 };
                        Object.keys(personMap).forEach(k => {
                            if(personMap[k].lendT > top.val) top = {name: k, val: personMap[k].lendT};
                        });
                        return (
                            <div style={{marginTop:'8px'}}>
                                <div style={{fontSize:'16px', fontWeight: 'bold', color: '#333'}}>{top.name}</div>
                                <div style={{fontSize:'13px', color:'#1976d2', fontWeight: '500'}}>{formatMoney(top.val)}</div>
                            </div>
                        );
                    })()}
                </div>
                <div style={{background:'#ffebee', padding:'16px', borderRadius:'16px', border: '1px solid #ffcdd2'}}>
                    <div style={{fontWeight:'700', display:'flex', alignItems:'center', gap:'6px', color: '#c62828', fontSize: '13px', textTransform: 'uppercase'}}>
                        <i className="bi bi-exclamation-octagon-fill"></i> Top Borrower
                    </div>
                    {(() => {
                        let top = { name: 'None', val: 0 };
                        Object.keys(personMap).forEach(k => {
                            if(personMap[k].borrowT > top.val) top = {name: k, val: personMap[k].borrowT};
                        });
                        return (
                            <div style={{marginTop:'8px'}}>
                                <div style={{fontSize:'16px', fontWeight: 'bold', color: '#333'}}>{top.name}</div>
                                <div style={{fontSize:'13px', color:'#d32f2f', fontWeight: '500'}}>{formatMoney(top.val)}</div>
                            </div>
                        );
                    })()}
                </div>
            </div>
            
            <div style={{height:'60px'}}></div>
        </div>
    </div>
  );
};

export default Stats;
