
import React, { useState, useEffect, useMemo } from 'react';
import { getRecords, deleteRecord, toggleFavorite } from '../services/storage';
import { InterestRecord } from '../types';
import { formatMoney, formatDate, dayToShortDuration } from '../constants';
import GoogleSync from './GoogleSync';

interface SavedProps {
  onLoadRecord: (record: InterestRecord) => void;
}

const Saved: React.FC<SavedProps> = ({ onLoadRecord }) => {
  const [records, setRecords] = useState<InterestRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Show only saved records (exclude Book records)
    setRecords(getRecords().filter(r => r.category !== 'book'));
  }, []);

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map(r => r.id)));
    }
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Use timeout to allow event propagation to complete before alert blocks the UI
    setTimeout(() => {
        if (window.confirm("Delete this record?")) {
          // Delete returns all records; filter again
          const updated = deleteRecord(id);
          setRecords(updated.filter(r => r.category !== 'book'));
          // Remove from selected if deleted
          const newSelected = new Set(selectedIds);
          newSelected.delete(id);
          setSelectedIds(newSelected);
        }
    }, 50);
  };

  const handleToggleFav = (id: number) => {
    // Returns all records; filter again
    const updated = toggleFavorite(id);
    setRecords(updated.filter(r => r.category !== 'book'));
  };

  const filtered = records
    .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    .filter(r => {
        if (filterType === 'lend') return r.isLend;
        if (filterType === 'borrow') return !r.isLend;
        if (filterType === 'fav') return r.isFavorite;
        return true;
    });
    
  // Sorting based on filter
  let sorted = [...filtered];
  if (filterType === 'high') sorted.sort((a, b) => b.totalAmount - a.totalAmount);
  else if (filterType === 'low') sorted.sort((a, b) => a.totalAmount - b.totalAmount);
  else if (filterType === 'recent') sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  else sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const selectedSum = useMemo(() => {
    return sorted
      .filter(r => selectedIds.has(r.id))
      .reduce((sum, r) => sum + r.totalAmount, 0);
  }, [selectedIds, sorted]);

  const exportCSV = () => {
    if (records.length === 0) {
        alert("No records to export.");
        return;
    }
    const header = [
        "Name","InterestType","Frequency","Lend/Borrow","Principal","Rate","RateType",
        "Interest","TotalAmount","PartialPay","PartialDate","Date","Duration","Favorite"
    ];
    const rows = records.map(r => [
        r.name,
        r.interestType,
        r.interestType === 'Compound' ? r.compoundFrequency || 'Yearly' : '',
        r.isLend ? "Lend" : "Borrow",
        r.principal,
        r.rate,
        r.rateType,
        r.interest,
        r.totalAmount,
        r.partialPaymentAmount || 0,
        r.partialPaymentDate || '',
        r.date,
        r.durationText,
        r.isFavorite ? "Yes" : "No"
    ]);

    const csv = [header, ...rows].map(row => row.join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interest_records.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  const exportAllMonthsPDF = () => {
      const allRecords = getRecords().filter(r => r.category !== 'book');
      if (allRecords.length === 0) {
          alert("No records to export.");
          return;
      }

      // Re-calculate monthly summaries (same logic as Book page)
      const monthlySummaryMap: any = {};
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

      allRecords.forEach(r => {
          const d = new Date(r.date);
          if (isNaN(d.getTime())) return;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const label = `${monthNames[d.getMonth()]}-${d.getFullYear()}`;
          
          if (!monthlySummaryMap[key]) monthlySummaryMap[key] = { label, lend: 0, borrow: 0 };
          
          if (r.isLend) monthlySummaryMap[key].lend += r.totalAmount;
          else monthlySummaryMap[key].borrow += r.totalAmount;
      });
      
      const keys = Object.keys(monthlySummaryMap).sort();
      
      let htmlContent = '';
      keys.forEach(key => {
         const o = monthlySummaryMap[key];
         const net = o.lend - o.borrow;
         const netColor = net > 0 ? "#198754" : net < 0 ? "#dc3545" : "#6c757d";
         
         htmlContent += `
            <div style="margin-bottom: 15px; border: 1px solid #ddd; padding: 10px; border-radius: 8px; background: #fff9e6;">
                <div style="font-weight: bold; background: #ffeeb8; padding: 8px; border-radius: 6px; margin-bottom: 10px;">
                    ${o.label}
                </div>
                <div style="padding-left: 5px;">
                    Lend: ${formatMoney(o.lend)}<br>
                    Borrow: ${formatMoney(o.borrow)}<br><br>
                    <span style="font-size:18px; font-weight:bold;">Net: 
                        <span style="color:${netColor}">${formatMoney(net)}</span>
                    </span>
                </div>
            </div>
         `;
      });

      if (keys.length === 0) htmlContent = "<p>No monthly data found.</p>";

      const win = window.open("", "_blank");
      if (win) {
          win.document.write(`
            <html>
            <head>
                <title>Monthly Summary</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h2 { text-align: center; color: #333; }
                </style>
            </head>
            <body>
                <h2>Monthly Summary Report</h2>
                ${htmlContent}
            </body>
            </html>
        `);
        win.document.close();
        // Wait for content to render before printing
        setTimeout(() => {
            win.print();
        }, 500);
      } else {
          alert("Please allow popups to view the PDF.");
      }
  };

  const clearFilters = () => {
      setSearch('');
      setFilterType('all');
  };

  return (
    <div id="savedPage" className="page">
        <div className="container">

            <h2 className="title">Saved Records</h2>

            <GoogleSync />

            <div className="filter-row">
                <input 
                    type="text" 
                    placeholder="Search name" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                >
                    <option value="all">All</option>
                    <option value="lend">Lend</option>
                    <option value="borrow">Borrow</option>
                    <option value="fav">Favorites</option>
                    <option value="high">High Amount</option>
                    <option value="low">Low Amount</option>
                    <option value="recent">Recent First</option>
                </select>
            </div>

            <div className="filter-row">
                <button className="btn-small btn-reset" onClick={clearFilters}>Reset</button>
                <button className="btn-small btn-export" onClick={exportCSV}>Export CSV</button>
                <button className="btn-small btn-export" onClick={exportAllMonthsPDF}>Export Months PDF</button>
            </div>

            {/* Bulk Action Bar */}
            {sorted.length > 0 && (
                <div style={{
                    background: '#fff',
                    padding: '10px 15px',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid #ddd',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600'}}>
                        <input type="checkbox" checked={selectedIds.size === sorted.length && sorted.length > 0} onChange={toggleSelectAll} />
                        Select All
                    </label>
                    {selectedIds.size > 0 && (
                        <div style={{fontWeight: '700', color: '#1565c0'}}>
                            Sum: {formatMoney(selectedSum)}
                        </div>
                    )}
                </div>
            )}

            <div id="savedList">
                {sorted.length === 0 ? <p>No saved records</p> : sorted.map((r, index) => (
                    <div key={`${r.id}-${index}`} className="saved-card" style={{position: 'relative'}}>
                        <div style={{position: 'absolute', top: '10px', left: '10px'}}>
                            <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggleSelect(r.id)} />
                        </div>
                        <div className="saved-header" style={{paddingLeft: '30px'}}>
                            <span>{r.name}</span>
                            <span 
                                className={`fav-star ${r.isFavorite ? "active" : ""}`} 
                                onClick={() => handleToggleFav(r.id)}
                            >★</span>
                        </div>
                        <div style={{paddingLeft: '30px'}}>{r.isLend ? "Lend" : "Borrow"} • <b className={r.isLend ? "record-type-lend" : "record-type-borrow"}>{formatMoney(r.principal)}</b></div>
                        
                        <div style={{marginTop:'5px', marginBottom:'5px'}}>
                            <span style={{
                                fontSize:'12px', 
                                padding:'3px 8px', 
                                borderRadius:'20px', 
                                fontWeight:'600',
                                backgroundColor: r.interestType === 'Simple' ? '#f3f4f6' : '#e0e7ff',
                                color: r.interestType === 'Simple' ? '#4b5563' : '#4338ca',
                                border: '1px solid ' + (r.interestType === 'Simple' ? '#e5e7eb' : '#c7d2fe'),
                                display: 'inline-block'
                            }}>
                                {r.interestType === 'Simple' ? 'Simple Interest' : `Compound: ${r.compoundFrequency || 'Yearly'}`}
                            </span>
                        </div>

                        {/* Enhanced Partial Payment Display with Statement */}
                        {r.statement && r.statement.length > 0 ? (
                             <div style={{
                                marginTop: '10px',
                                marginBottom: '10px',
                                padding: '12px',
                                backgroundColor: '#fff9e6', 
                                border: '1px solid #f0e6c0',
                                borderRadius: '8px'
                            }}>
                                <div style={{fontSize: '13px', fontWeight: '700', color: '#9a3412', marginBottom: '8px', display:'flex', alignItems:'center', gap:'6px'}}>
                                   <i className="bi bi-list-columns-reverse"></i> Partial Payment Breakdown
                                </div>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                    {r.statement.map((item, idx) => (
                                        <div key={idx} style={{
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            fontSize: '12px',
                                            paddingBottom: idx === r.statement!.length - 1 ? 0 : '6px',
                                            borderBottom: idx === r.statement!.length - 1 ? 'none' : '1px dashed #e6dbb9'
                                        }}>
                                            <div>
                                                <div style={{fontWeight: '600', color: item.isPayment ? '#d32f2f' : '#333'}}>{item.label}</div>
                                                <div style={{color: '#666', fontSize: '10px'}}>
                                                    {item.date}
                                                    {item.days && !item.isPayment ? (
                                                        <span style={{fontWeight:'500', color:'#444', marginLeft:'6px'}}>
                                                            ({dayToShortDuration(item.days)})
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <div style={{textAlign: 'right'}}>
                                                {item.isPayment ? (
                                                    <div style={{fontWeight: '700', color: '#d32f2f'}}>- {formatMoney(item.payment)}</div>
                                                ) : (
                                                    <div style={{fontWeight: '600', color: '#2e7d32'}}>+ {formatMoney(item.interest)}</div>
                                                )}
                                                {item.balance !== undefined && !item.isPayment && (
                                                     <div style={{fontSize:'10px', color:'#777'}}>Bal: {formatMoney(item.balance)}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : r.partialPaymentAmount ? (
                            <div style={{
                                marginTop: '10px',
                                marginBottom: '10px',
                                padding: '10px',
                                backgroundColor: '#fff7ed', // light orange
                                border: '1px solid #ffedd5',
                                borderRadius: '8px',
                                color: '#9a3412', // dark orange text
                                fontSize: '0.9em'
                            }}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontWeight:'600'}}>Partial Payment:</span>
                                    <span style={{fontWeight:'bold', fontSize:'1.1em'}}>-{formatMoney(r.partialPaymentAmount)}</span>
                                </div>
                                <div style={{fontSize:'0.85em', color:'#c2410c', marginTop:'4px', display:'flex', alignItems:'center', gap:'4px'}}>
                                    <i className="bi bi-calendar-event"></i> Paid on: {formatDate(r.partialPaymentDate || '')}
                                </div>
                            </div>
                        ) : null}

                        <div>Interest: <b>{formatMoney(r.interest)}</b></div>
                        <div>Total: <b>{formatMoney(r.totalAmount)}</b></div>
                        <div style={{fontSize:'0.85em', color:'#6b7280', marginTop:'4px'}}>Created: {formatDate(r.date)}</div>
                        
                        <div style={{marginTop:'12px', display:'flex', gap:'8px', flexWrap:'wrap'}}>
                            <button className="btn-small btn-load" onClick={() => onLoadRecord(r)}>Edit</button>
                            <button className="btn-small btn-delete" onClick={(e) => handleDelete(r.id, e)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    </div>
  );
};

export default Saved;
