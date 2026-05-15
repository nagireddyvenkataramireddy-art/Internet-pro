
import React, { useState, useMemo, useEffect } from 'react';
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
  const [refreshKey, setRefreshKey] = useState(0); 

  useEffect(() => {
    const handleStorageUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('storage-updated', handleStorageUpdate);
    return () => window.removeEventListener('storage-updated', handleStorageUpdate);
  }, []);
  
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
      console.log('Book.tsx: handleDelete called for id:', id);
      e.preventDefault();
      e.stopPropagation();
      setOpenMenuId(null); 

      if(window.confirm("Delete this record permanently?")) {
          console.log('Book.tsx: user confirmed delete');
          deleteRecord(id);
          setRefreshKey(prev => prev + 1);
      }
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

      // 1. Preserve and update history
      const currentStatement = modalRecord.statement ? [...modalRecord.statement] : [];
      
      const pAmountNum = parseFloat(payAmount) || 0;
      const discountNum = parseFloat(discountAmount) || 0;
      
      // Add interest entry if there was interest accrued since fromDate
      if (stats.interest > 0) {
          currentStatement.push({
              id: Date.now(),
              label: `Interest accrued (${stats.duration})`,
              date: payDate,
              interest: stats.interest,
              balance: stats.total,
              isPayment: false
          });
      }

      // Add payment entry
      if (pAmountNum > 0) {
          currentStatement.push({
              id: Date.now() + 1,
              label: 'Partial Payment',
              date: payDate,
              payment: pAmountNum,
              balance: stats.total - pAmountNum,
              isPayment: true
          });
      }

      // Add discount if any
      if (discountNum > 0) {
          const balAfterPay = stats.total - pAmountNum;
          currentStatement.push({
            id: Date.now() + 2,
            label: 'Discount Given',
            date: payDate,
            payment: discountNum,
            balance: balAfterPay - discountNum,
            isPayment: true
        });
      }

      // Update Logic:
      // 1. New Principal = Remaining Amount
      // 2. New From Date = Payment Date
      // 3. Keep history in statement
      
      const updatedRecord: InterestRecord = {
          ...modalRecord,
          principal: remainingAmount,
          fromDate: payDate, // Shift start date
          date: payDate,     // Update reference date
          statement: currentStatement,
          updatedAt: new Date().toISOString()
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
                        <div className="book-record-header" style={{ borderBottom: expandedRecordId === r.id ? '1px solid #eee' : 'none', position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div className="book-record-name">{r.name}</div>
                                {expandedRecordId !== r.id && (
                                    <div style={{ fontSize: '11px', color: r.isLend ? '#2e7d32' : '#c62828', fontWeight: '600' }}>
                                        {r.isLend ? 'Lend' : 'Borrow'} <i className={`bi ${r.isLend ? 'bi-arrow-up' : 'bi-arrow-down'}`}></i>
                                    </div>
                                )}
                            </div>
                            
                            <div className="book-record-actions" onClick={(e) => e.stopPropagation()} style={{ flex: 1, justifyContent: 'flex-end', gap: '15px' }}>
                                {expandedRecordId !== r.id && (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a4314' }}>
                                            {formatNumber(r.currentTotal)}
                                        </div>
                                    </div>
                                )}
                                
                                {expandedRecordId === r.id && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700', color: r.isLend ? '#2e7d32' : '#c62828' }}>
                                        {r.isLend ? 'Lend' : 'Borrow'} 
                                        <i className={`bi ${r.isLend ? 'bi-arrow-up' : 'bi-arrow-down'}`} style={{ fontSize: '18px', strokeWidth: '2px' }}></i>
                                    </div>
                                )}
                                
                                <i 
                                    className="bi bi-list" 
                                    style={{ fontSize: '24px', color: '#1565c0', cursor: 'pointer', padding: '4px' }}
                                    onClick={(e) => handleMenuClick(r.id, e)}
                                ></i>

                                {/* MENU DROPDOWN */}
                                {openMenuId === r.id && (
                                    <div className="menu-dropdown">
                                        <div className="menu-item" onClick={(e) => { e.stopPropagation(); handleShare(r); }}><i className="bi bi-share"></i> Share</div>
                                        <div className="menu-item" onClick={(e) => { e.stopPropagation(); handleEdit(r); }}><i className="bi bi-pencil-square"></i> Edit</div>
                                        <div className="menu-item" onClick={(e) => { e.stopPropagation(); openPaymentModal(r); }}><i className="bi bi-cash-coin"></i> Partial Payment</div>
                                        <div className="menu-item" style={{ color: '#d32f2f' }} onClick={(e) => handleDelete(r.id, e)}><i className="bi bi-trash"></i> Delete</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {expandedRecordId === r.id && (
                            <>
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

                                <div style={{ padding: '0 14px 10px 14px', fontSize: '13px' }}>
                                    <span className="book-label">Total Time </span>
                                    <span className="book-val">{r.durationText}</span>
                                </div>
                                
                                <div className="book-record-footer">
                                    Total Amount: {formatNumber(r.currentTotal)}
                                </div>
                            </>
                        )}

                        {/* Collapsible History */}
                        {expandedRecordId === r.id && (
                            <div style={{padding: '10px', background: '#f9f9f9', borderTop: '1px solid #eee', marginTop: '5px'}}>
                                <div style={{fontWeight: '700', marginBottom: '10px', fontSize:'14px', color:'#444'}}>Transaction History</div>
                                {r.statement && r.statement.length > 0 ? (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                        {[...r.statement].reverse().map((item, idx) => {
                                            const isInitial = item.label === 'Principal (Initial)';
                                            return (
                                                <div key={idx} style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px', background: isInitial ? '#fffde7' : '#fff', borderRadius:'6px', border: isInitial ? '1px solid #fbc02d' : '1px solid #eee'}}>
                                                    <div style={{display:'flex', flexDirection:'column'}}>
                                                        <span style={{fontWeight:'700', color: isInitial ? '#f57f17' : (item.isPayment ? '#d32f2f' : '#2e7d32')}}>{item.label}</span>
                                                        <span style={{color:'#888', fontSize:'11px'}}>{formatDate(item.date)}</span>
                                                    </div>
                                                    <div style={{textAlign:'right'}}>
                                                        <div style={{fontWeight: '700', color: isInitial ? '#f57f17' : (item.isPayment ? '#d32f2f' : '#2e7d32')}}>
                                                            {isInitial ? formatNumber(item.balance) : (item.isPayment ? `-${formatNumber(item.payment || 0)}` : `+${formatNumber(item.interest || 0)}`)}
                                                        </div>
                                                        {!isInitial && <div style={{fontSize:'10px', color:'#999'}}>Bal: {formatNumber(item.balance)}</div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{fontSize: '12px', color: '#888', textAlign:'center', padding:'10px'}}>No transaction history available.</div>
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
                            <div style={{padding:'10px'}}>
                                <div style={{fontWeight:'700', marginBottom:'10px', fontSize:'15px'}}>Transaction History</div>
                                {modalRecord.statement && modalRecord.statement.length > 0 ? (
                                    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                                        {[...modalRecord.statement].reverse().map((item, idx) => {
                                            const isInitial = item.label === 'Principal (Initial)';
                                            return (
                                                <div key={idx} style={{background: isInitial ? '#fffde7' : '#f8f9fa', padding:'10px', borderRadius:'8px', border: isInitial ? '1px solid #fbc02d' : '1px solid #eee'}}>
                                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                                                        <span style={{fontSize:'12px', color:'#666'}}>{formatDate(item.date)}</span>
                                                        <span style={{fontSize:'12px', fontWeight:'700', color: isInitial ? '#f57f17' : (item.isPayment ? '#d32f2f' : '#2e7d32')}}>
                                                            {item.label}
                                                        </span>
                                                    </div>
                                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                        <span style={{fontSize:'14px', fontWeight:'600'}}>
                                                            {isInitial ? `Original Principal: ${formatNumber(item.balance)}` : (item.isPayment ? `Paid: ${formatNumber(item.payment || 0)}` : `Interest: ${formatNumber(item.interest || 0)}`)}
                                                        </span>
                                                        {!isInitial && <span style={{fontSize:'12px', color:'#444'}}>Balance: <b>{formatNumber(item.balance)}</b></span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{textAlign:'center', padding:'40px 10px', color:'#888'}}>
                                        <i className="bi bi-journal-text" style={{fontSize:'32px', display:'block', marginBottom:'8px'}}></i>
                                        No past transactions found for this record.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                                {/* Heading Card like the image */}
                                <div style={{background:'#d4e157', padding:'10px 15px', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center', color:'#1b5e20', boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}>
                                    <div style={{fontSize:'18px', fontWeight:'700'}}>Principal Amount <span style={{fontSize:'20px', marginLeft:'5px'}}>{formatNumber(modalRecord.statement?.[0]?.balance || modalRecord.principal)}</span></div>
                                    <i className="bi bi-info-circle-fill"></i>
                                </div>

                                <div style={{padding:'10px', display:'flex', flexDirection:'column', gap:'12px'}}>
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                        <span style={{fontSize:'14px', color:'#333'}}>Total Amount</span>
                                        <span style={{fontSize:'16px', fontWeight:'700', color:'#1565c0'}}>₹ {formatNumber(modalStats?.total || 0)}</span>
                                    </div>

                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                        <span style={{fontSize:'14px', color:'#333'}}>Interim Payments <i className="bi bi-minus-square-fill" style={{color:'#f9a825', fontSize:'16px', marginLeft:'4px'}}></i></span>
                                        <div style={{borderBottom:'1px solid #333', width:'120px', textAlign:'right'}}>
                                            <input 
                                                type="number" 
                                                value={payAmount} 
                                                onChange={(e) => setPayAmount(e.target.value)}
                                                placeholder="0.00"
                                                style={{border:'none', background:'transparent', textAlign:'right', fontWeight:'700', width:'100%', outline:'none', fontSize:'16px'}}
                                            />
                                        </div>
                                    </div>

                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                        <span style={{fontSize:'14px', color:'#333'}}>Remaining Amount</span>
                                        <span style={{fontSize:'16px', fontWeight:'700', color:'#1565c0'}}>{formatNumber(modalRemaining)}</span>
                                    </div>

                                    <div style={{display:'flex', gap:'15px', marginTop:'10px'}}>
                                        <div style={{flex:1}}>
                                            <div style={{fontSize:'12px', color:'#666', display:'flex', alignItems:'center', gap:'4px'}}>
                                                <i className="bi bi-calendar-event"></i> Interim Pay Date
                                            </div>
                                            <input 
                                                type="date" 
                                                value={payDate} 
                                                onChange={(e) => setPayDate(e.target.value)} 
                                                style={{width:'100%', border:'none', borderBottom:'1px solid #ddd', padding:'5px 0', fontSize:'13px', color:'#1565c0', fontWeight:'600'}}
                                            />
                                        </div>
                                        <div style={{flex:1}}>
                                            <div style={{fontSize:'12px', color:'#666', display:'flex', alignItems:'center', gap:'4px'}}>
                                                <i className="bi bi-clock"></i> Duration
                                            </div>
                                            <div style={{fontSize:'13px', color:'#1565c0', fontWeight:'600', marginTop:'5px'}}>
                                                {modalStats?.duration}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="input-group" style={{marginTop:'10px'}}>
                                    <label>Discount Amount (Optional)</label>
                                    <input 
                                        type="number" 
                                        placeholder="Enter discount"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(e.target.value)}
                                        style={{borderRadius:'10px'}}
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Notes (Optional)</label>
                                    <textarea 
                                        placeholder="Add any notes here..." 
                                        rows={2}
                                        style={{width:'100%', padding:'10px', borderRadius:'12px', border:'1px solid #ddd'}}
                                    ></textarea>
                                </div>

                                <button className="btn" style={{background:'#1565c0', marginTop:'10px', borderRadius:'12px', height:'50px', fontSize:'16px', fontWeight:'700'}} onClick={handleUpdatePayment}>
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
