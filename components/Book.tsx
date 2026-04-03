
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecords, updateRecord, deleteRecord } from '../services/storage';
import { formatMoney, formatDate, dayToDuration, formatNumber, diffDays, getExactDateDiff } from '../constants';
import { InterestRecord } from '../types';
import GoogleSync from './GoogleSync';

interface BookProps {
  onLoadRecord: (record: InterestRecord) => void;
}

// Interface for records with calculated live values
interface ActiveInterestRecord extends InterestRecord {
  currentInterest: number;
  currentTotal: number;
  givenDateDisplay: string;
}

const Book: React.FC<BookProps> = ({ onLoadRecord }) => {
  const navigate = useNavigate();
  const [searchName, setSearchName] = useState('');
  const [refreshKey, setRefreshKey] = useState(0); // Used to force re-render after delete/update
  
  // UI States
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalRecord, setModalRecord] = useState<InterestRecord | null>(null);
  const [modalTab, setModalTab] = useState<'payment' | 'transactions'>('payment');

  // Payment Form States
  const [payDate, setPayDate] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');

  // --------------------------------------------------------
  // HELPER: Core Interest Calculation logic adapted for specific date
  // --------------------------------------------------------
  const calculateStatsAtDate = (r: InterestRecord, targetDateStr: string) => {
      // Ensure we are working with midnight dates
      const startDate = r.fromDate ? new Date(r.fromDate) : new Date(r.date);
      startDate.setHours(0,0,0,0);
      
      const targetDate = new Date(targetDateStr);
      targetDate.setHours(0,0,0,0);
      
      if(isNaN(startDate.getTime()) || isNaN(targetDate.getTime())) {
          return { interest: 0, total: r.principal, days: 0, duration: '0 Days' };
      }

      // Calculate Calendar Duration (Y-M-D)
      // We normalize everything to this standard now to match User Expectation
      const dateDiff = getExactDateDiff(startDate.toISOString(), targetDate.toISOString());
      const totalMonths = (dateDiff.years * 12) + dateDiff.months + (dateDiff.days / 30);
      const durationStr = `${dateDiff.years}Y ${dateDiff.months}M ${dateDiff.days}D`;
      
      let interest = 0;
      const P = r.principal;
      const R = r.rate;

      // Determine Calculation Method
      if (r.interestType === 'Simple') {
          if (r.rateType === 'percent') {
              // Percentage Formula using Calendar Months: P * (R/100) * (Months/12)
              interest = (P * R * (totalMonths / 12)) / 100;
          } else {
              // Rupees Formula: P * (R/100) * Months
              interest = (P / 100) * R * totalMonths;
          }
      } else {
          // Compound
          let R_annual = R;
          if (r.rateType === 'rupees') R_annual = R * 12;
          
          let n = 1; // Frequency
          if (r.compoundFrequency === 'Half-Yearly') n = 2;
          if (r.compoundFrequency === 'Quarterly') n = 4;
          if (r.compoundFrequency === 'Monthly') n = 12;

          const t_years = totalMonths / 12;
          const ratePerPeriod = (R_annual / 100) / n;
          const totalPeriods = n * t_years;

          const amount = P * Math.pow(1 + ratePerPeriod, totalPeriods);
          interest = amount - P;
      }

      return {
          interest: Math.round(interest),
          total: Math.round(P + interest),
          days: diffDays(startDate.toISOString(), targetDate.toISOString()), // Keep raw days for reference
          duration: durationStr
      };
  };

  // --------------------------------------------------------
  // LIVE LIST CALCULATION (Current Status)
  // --------------------------------------------------------
  // We use useMemo dependent on refreshKey to re-fetch when data changes
  const activeRecords = useMemo(() => {
    // IMPORTANT: Use just the date string YYYY-MM-DD to ensure we compare dates at midnight,
    // avoiding time-of-day precision errors that cause 1-day diffs or small decimals.
    const todayStr = new Date().toISOString().split('T')[0];

    return getRecords()
        .filter(r => r.category === 'book') // Only show records marked for Book
        .map(r => {
            const stats = calculateStatsAtDate(r, todayStr);
            return {
                ...r,
                currentInterest: stats.interest,
                currentTotal: stats.total,
                durationText: stats.duration,
                givenDateDisplay: formatDate(r.fromDate || r.date),
            } as ActiveInterestRecord;
        })
        .filter(r => r.name.toLowerCase().includes(searchName.toLowerCase()))
        .sort((a, b) => {
            const dA = a.fromDate ? new Date(a.fromDate).getTime() : new Date(a.date).getTime();
            const dB = b.fromDate ? new Date(b.fromDate).getTime() : new Date(b.date).getTime();
            return dA - dB;
        })
        .reverse();
  }, [searchName, refreshKey]);

  // --------------------------------------------------------
  // SUMMARY CALCULATIONS
  // --------------------------------------------------------
  const summary = useMemo(() => {
    let lendCount = 0, lendAmt = 0, lendInt = 0;
    let borrowCount = 0, borrowAmt = 0, borrowInt = 0;

    activeRecords.forEach(r => {
        if (r.isLend) {
            lendCount++;
            lendAmt += r.principal;
            lendInt += r.currentInterest;
        } else {
            borrowCount++;
            borrowAmt += r.principal;
            borrowInt += r.currentInterest;
        }
    });
    // Final Amount = (Lend Principal + Interest) - (Borrow Principal + Interest)
    const finalAmount = (lendAmt + lendInt) - (borrowAmt + borrowInt);
    
    return { lendCount, lendAmt, lendInt, borrowCount, borrowAmt, borrowInt, finalAmount };
  }, [activeRecords]);


  // --------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------
  const handleMenuClick = (id: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleEdit = (r: InterestRecord) => {
      // Use the prop passed from App.tsx to load data into the Calculator route
      onLoadRecord(r);
      setOpenMenuId(null);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOpenMenuId(null); // Close menu immediately to avoid visual lag

      // Use setTimeout to allow the UI to update (menu close) before blocking with alert
      setTimeout(() => {
          if(window.confirm("Delete this record permanently?")) {
              deleteRecord(id);
              // Trigger re-render of list
              setRefreshKey(prev => prev + 1);
          }
      }, 50);
  };

  const handleShare = (r: ActiveInterestRecord) => {
      const text = `*Interest Details*
Name: ${r.name || 'Unknown'}
Type: ${r.isLend ? 'Lend (Given)' : 'Borrow (Taken)'}
Principal: ${formatNumber(r.principal)}
Rate: ${r.rate} ${r.rateType === 'rupees' ? 'rupees' : '%'}
Date: ${formatDate(r.fromDate || r.date)}
--------------------
Interest: ${formatNumber(r.currentInterest)}
*Total Amount: ${formatNumber(r.currentTotal)}*
Duration: ${r.durationText}`;

      if (navigator.share) {
          navigator.share({
              title: `Interest Record: ${r.name}`,
              text: text
          }).catch(console.error);
      } else {
          navigator.clipboard.writeText(text);
          alert('Details copied to clipboard!');
      }
      setOpenMenuId(null);
  };

  const openPaymentModal = (r: InterestRecord) => {
      setModalRecord(r);
      setPayDate(new Date().toISOString().split('T')[0]); // Default Today
      setPayAmount('');
      setDiscountAmount('');
      setModalTab('payment');
      setShowModal(true);
      setOpenMenuId(null);
  };

  const handleUpdatePayment = () => {
      if (!modalRecord || !payDate || !payAmount) {
          alert("Please fill all required fields");
          return;
      }
      
      const stats = calculateStatsAtDate(modalRecord, payDate);
      const payment = parseFloat(payAmount) || 0;
      const discount = parseFloat(discountAmount) || 0;
      
      const remainingAmount = stats.total - payment - discount;
      
      if (remainingAmount < 0) {
          alert("Payment exceeds total due!");
          return;
      }

      // Update Logic:
      // 1. New Principal = Remaining Amount
      // 2. New From Date = Payment Date
      // 3. Keep original create date, but effectively 'restructuring' the active loan
      
      const updatedRecord: InterestRecord = {
          ...modalRecord,
          principal: remainingAmount,
          fromDate: payDate, // Shift start date
          date: payDate,     // Update reference date for sorting logic if desired, or keep original.
      };
      
      updateRecord(updatedRecord);
      setShowModal(false);
      setModalRecord(null);
      
      // Refresh list
      setRefreshKey(prev => prev + 1);
  };
  
  // Calculate stats for Modal live view
  const modalStats = useMemo(() => {
      if (!modalRecord || !payDate) return null;
      return calculateStatsAtDate(modalRecord, payDate);
  }, [modalRecord, payDate]);

  const modalRemaining = useMemo(() => {
      if (!modalStats) return 0;
      const p = parseFloat(payAmount) || 0;
      const d = parseFloat(discountAmount) || 0;
      return modalStats.total - p - d;
  }, [modalStats, payAmount, discountAmount]);


  const exportPDF = () => {
      if (activeRecords.length === 0) {
          alert("No records to export.");
          return;
      }

      const htmlContent = `
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <div style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                <div style="color: #2e7d32; font-weight: bold;">Total Lend(${summary.lendCount})</div>
                <div style="font-size: 18px; font-weight: bold;">${formatNumber(summary.lendAmt)}</div>
                <div style="font-size: 12px;">Total Lend Interest</div>
                <div style="font-weight: bold; color: #2e7d32;">${formatNumber(summary.lendInt)}</div>
            </div>
            <div style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
                <div style="color: #c62828; font-weight: bold;">Total Borrow(${summary.borrowCount})</div>
                <div style="font-size: 18px; font-weight: bold;">${formatNumber(summary.borrowAmt)}</div>
                <div style="font-size: 12px;">Total Borrow Interest</div>
                <div style="font-weight: bold; color: #c62828;">${formatNumber(summary.borrowInt)}</div>
            </div>
        </div>
        <div style="padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px;">
            <div style="font-size: 14px;">Final Amount</div>
            <div style="font-size: 24px; font-weight: bold; color: ${summary.finalAmount >= 0 ? '#2e7d32' : '#c62828'}">${formatNumber(summary.finalAmount)}</div>
        </div>
        ${activeRecords.map(r => `
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px;">
                    <div>${r.name}</div>
                    <div style="color: ${r.isLend ? '#2e7d32' : '#c62828'}">${r.isLend ? 'Lend' : 'Borrow'}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 14px;">
                    <div>Amount: <b>${formatNumber(r.principal)}</b></div>
                    <div>Interest Rate: <b>${r.rate} ${r.rateType === 'rupees' ? 'rupees' : '%'}</b></div>
                    <div>Given Date: <b>${r.givenDateDisplay}</b></div>
                    <div>Interest Amount: <b>${formatNumber(r.currentInterest)}</b></div>
                </div>
                <div style="font-size: 14px; margin-top: 5px;">Total Time: <b>${r.durationText}</b></div>
                <div style="background: #e8f5e9; padding: 5px; border-radius: 4px; font-weight: bold; margin-top: 5px; text-align: center;">
                    Total Amount: ${formatNumber(r.currentTotal)}
                </div>
            </div>
        `).join('')}
      `;

      const win = window.open("", "_blank");
      if (win) {
          win.document.write(`
            <html>
            <head>
                <title>Interest Book Report</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                </style>
            </head>
            <body>
                <h2>Interest Book Report</h2>
                ${htmlContent}
            </body>
            </html>
        `);
        win.document.close();
        setTimeout(() => {
            win.print();
        }, 500);
      } else {
          alert("Please allow popups to view the PDF.");
      }
  };

  return (
    <div className="page" style={{paddingTop:'15px', background: '#f5f5f5', minHeight: '100vh', paddingBottom:'100px'}}>
        <div className="container">
            {/* Header Row */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                 <h2 className="title" style={{margin:0, color: '#333', fontSize: '24px', textShadow:'none'}}>Interest Book</h2>
                 <button className="btn-small btn-export" onClick={exportPDF}>Export PDF</button>
            </div>

            <GoogleSync />

            {/* Top Summary Grid */}
            <div className="book-summary-grid">
                <div className="book-stat-card">
                    <div className="book-stat-label text-lend-stat">Total Lend({summary.lendCount})</div>
                    <div className="book-stat-val text-lend-stat">{formatNumber(summary.lendAmt)}</div>
                    <div style={{fontSize:'12px', color:'#555', marginTop:'4px'}}>Total Lend Interest</div>
                    <div style={{fontWeight:'600', color:'#2e7d32'}}>{formatNumber(summary.lendInt)}</div>
                </div>
                <div className="book-stat-card">
                    <div className="book-stat-label text-borrow-stat">Total Borrow({summary.borrowCount})</div>
                    <div className="book-stat-val text-borrow-stat">{formatNumber(summary.borrowAmt)}</div>
                    <div style={{fontSize:'12px', color:'#555', marginTop:'4px'}}>Total Borrow Interest</div>
                    <div style={{fontWeight:'600', color:'#c62828'}}>{formatNumber(summary.borrowInt)}</div>
                </div>
            </div>

            {/* Final Amount */}
            <div className="book-final-card">
                <div style={{fontSize:'14px', fontWeight:'700', color:'#333', marginBottom:'4px'}}>Final Amount</div>
                <div style={{fontSize:'28px', fontWeight:'800', color: summary.finalAmount >= 0 ? '#2e7d32' : '#c62828'}}>
                    {formatNumber(summary.finalAmount)}
                </div>
            </div>

            {/* Search */}
            <div style={{marginBottom:'15px'}}>
                <input 
                    type="text" 
                    placeholder="Search with name" 
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    style={{
                        width:'100%', padding:'12px', borderRadius:'8px', 
                        border:'1px solid #ddd', background:'#fff', fontSize:'15px'
                    }}
                />
            </div>
            
            <div style={{fontSize:'13px', fontWeight:'600', color:'#444', marginBottom:'10px'}}>
                Records are sorted by given date
            </div>

            {/* List */}
            <div onClick={() => setOpenMenuId(null)}> {/* Close menu on bg click */}
                {activeRecords.map(r => (
                    <div key={r.id} className="book-record-card" onClick={() => setExpandedRecordId(expandedRecordId === r.id ? null : r.id)}>
                        <div className="book-record-header">
                            <div className="book-record-name">{r.name}</div>
                            <div className="book-record-actions" onClick={(e) => e.stopPropagation()}>
                                <div style={{display:'flex', alignItems:'center', gap:'4px', fontWeight:'700', color: r.isLend ? '#2e7d32' : '#c62828'}}>
                                    {r.isLend ? 'Lend' : 'Borrow'} 
                                    <i className={`bi ${r.isLend ? 'bi-arrow-up' : 'bi-arrow-down'}`} style={{fontSize:'18px', strokeWidth:'2px'}}></i>
                                </div>
                                <i 
                                    className="bi bi-list" 
                                    style={{fontSize:'24px', color:'#1565c0', cursor:'pointer', padding:'4px'}}
                                    onClick={(e) => handleMenuClick(r.id, e)}
                                ></i>

                                {/* MENU DROPDOWN */}
                                {openMenuId === r.id && (
                                    <div className="menu-dropdown">
                                        <div className="menu-item" onClick={(e) => { e.stopPropagation(); handleShare(r); }}><i className="bi bi-share"></i> Share</div>
                                        <div className="menu-item" onClick={(e) => { e.stopPropagation(); handleEdit(r); }}><i className="bi bi-pencil-square"></i> Edit</div>
                                        <div className="menu-item" onClick={(e) => { e.stopPropagation(); openPaymentModal(r); }}><i className="bi bi-cash-coin"></i> Partial Payment</div>
                                        <div className="menu-item" style={{color:'#d32f2f'}} onClick={(e) => handleDelete(r.id, e)}><i className="bi bi-trash"></i> Delete</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="book-record-body">
                            {/* Row 1 */}
                            <div>
                                <span className="book-label">Amount: </span>
                                <span className="book-val">{formatNumber(r.principal)}</span>
                            </div>
                            <div>
                                <span className="book-label">Interest Rate: </span>
                                <span className="book-val">{r.rate} {r.rateType === 'rupees' ? 'rupees' : '%'}</span>
                            </div>

                            {/* Row 2 */}
                            <div>
                                <span className="book-label">Given Date: </span>
                                <span className="book-val">{r.givenDateDisplay}</span>
                            </div>
                            <div>
                                <span className="book-label">Interest Amount: </span>
                                <span className="book-val">{formatNumber(r.currentInterest)}</span>
                            </div>
                        </div>

                        <div style={{padding:'0 14px 10px 14px', fontSize:'13px'}}>
                            <span className="book-label">Total Time </span>
                            <span className="book-val">{r.durationText}</span>
                        </div>
                        
                        <div className="book-record-footer">
                            Total Amount: {formatNumber(r.currentTotal)}
                        </div>

                        {/* Collapsible History */}
                        {expandedRecordId === r.id && (
                            <div style={{padding: '10px', background: '#f9f9f9', borderTop: '1px solid #eee', marginTop: '5px'}}>
                                <div style={{fontWeight: '600', marginBottom: '8px'}}>Transaction History</div>
                                {r.statement && r.statement.length > 0 ? (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
                                        {r.statement.map((item, idx) => (
                                            <div key={idx} style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px dashed #ddd'}}>
                                                <span>{item.date} - {item.label}</span>
                                                <span style={{fontWeight: '600', color: item.isPayment ? '#d32f2f' : '#2e7d32'}}>
                                                    {item.isPayment ? `-${formatMoney(item.payment || 0)}` : `+${formatMoney(item.interest || 0)}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{fontSize: '12px', color: '#888'}}>No transaction history.</div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {activeRecords.length === 0 && (
                    <div style={{textAlign:'center', color:'#888', padding:'20px'}}>No records found</div>
                )}
            </div>
            
            {/* FLOATING ACTION BUTTON */}
            <div className="fab" onClick={() => navigate('/')}>
                <i className="bi bi-plus-lg"></i>
            </div>
        </div>

        {/* MODAL */}
        {showModal && modalRecord && (
            <div className="popup-overlay" onClick={() => setShowModal(false)}>
                <div className="popup-content" onClick={e => e.stopPropagation()}>
                    <div className="popup-header">
                        <div 
                            className={`popup-tab ${modalTab === 'payment' ? 'active' : ''}`}
                            onClick={() => setModalTab('payment')}
                        >
                            ADD PAYMENT
                        </div>
                        <div 
                            className={`popup-tab ${modalTab === 'transactions' ? 'active' : ''}`}
                            onClick={() => setModalTab('transactions')}
                        >
                            VIEW TRANSACTIONS
                        </div>
                    </div>

                    <div className="popup-body">
                        {modalTab === 'transactions' ? (
                            <div style={{textAlign:'center', padding:'20px', color:'#666'}}>
                                No past transactions found.
                            </div>
                        ) : (
                            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <span style={{fontSize:'18px', fontWeight:'bold', color: modalRecord.isLend ? '#2e7d32' : '#c62828'}}>
                                        {modalRecord.name}
                                    </span>
                                    <span style={{fontSize:'12px', color:'#666'}}>
                                        From: {formatDate(modalRecord.fromDate || modalRecord.date)}
                                    </span>
                                </div>
                                
                                <div style={{fontSize:'13px', color:'#555', background:'#f5f5f5', padding:'10px', borderRadius:'8px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
                                    <div>Principal: <b>{formatNumber(modalRecord.principal)}</b></div>
                                    <div>Rate: <b>{modalRecord.rate} {modalRecord.rateType === 'rupees' ? 'rupees' : '%'}</b></div>
                                    <div>Type: <b>{modalRecord.interestType}</b></div>
                                </div>

                                <div className="input-group" style={{marginTop:'10px'}}>
                                    <label>Partial Payment Date</label>
                                    <input 
                                        type="date" 
                                        value={payDate} 
                                        onChange={(e) => setPayDate(e.target.value)} 
                                        style={{fontWeight:'bold'}}
                                    />
                                </div>

                                {/* Calculated Info Block */}
                                {modalStats && (
                                    <div style={{background:'#e3f2fd', padding:'12px', borderRadius:'8px', fontSize:'14px'}}>
                                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                                            <span style={{color:'#1565c0'}}>Duration:</span>
                                            <span style={{fontWeight:'bold'}}>{modalStats.duration}</span>
                                        </div>
                                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                                            <span style={{color:'#1565c0'}}>Interest Amount:</span>
                                            <span style={{fontWeight:'bold'}}>{formatNumber(modalStats.interest)}</span>
                                        </div>
                                        <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px solid #bbdefb', paddingTop:'4px', marginTop:'4px'}}>
                                            <span style={{color:'#0d47a1', fontWeight:'600'}}>Total Amount:</span>
                                            <span style={{fontWeight:'800', color:'#0d47a1', fontSize:'16px'}}>{formatNumber(modalStats.total)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="input-group">
                                    <label>Partial Payment Amount</label>
                                    <input 
                                        type="number" 
                                        placeholder="Enter amount"
                                        value={payAmount}
                                        onChange={(e) => setPayAmount(e.target.value)}
                                        style={{borderColor:'#2e7d32'}}
                                    />
                                    {payAmount && (
                                        <div style={{fontSize:'12px', color:'#2e7d32', marginTop:'4px', fontWeight:'600'}}>
                                            {formatNumber(parseFloat(payAmount))}
                                        </div>
                                    )}
                                </div>

                                <div className="input-group">
                                    <label>Discount Amount</label>
                                    <input 
                                        type="number" 
                                        placeholder="Enter discount"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(e.target.value)}
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Remaining Amount</label>
                                    <div style={{
                                        background: '#f1f8e9', 
                                        padding: '12px', 
                                        borderRadius: '20px', 
                                        border: '1px solid #c5e1a5', 
                                        fontSize: '16px', 
                                        fontWeight: '700',
                                        color: '#33691e'
                                    }}>
                                        {formatNumber(modalRemaining)}
                                    </div>
                                </div>
                                
                                <div className="input-group">
                                    <label>Notes(Optional)</label>
                                    <textarea 
                                        placeholder="" 
                                        rows={3}
                                        style={{width:'100%', padding:'10px', borderRadius:'12px', border:'1px solid #ddd'}}
                                    ></textarea>
                                </div>

                                <button className="btn" style={{background:'#1565c0', marginTop:'10px'}} onClick={handleUpdatePayment}>
                                    Update Payment
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Book;
