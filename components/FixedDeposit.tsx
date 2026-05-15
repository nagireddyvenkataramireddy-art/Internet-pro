import React, { useState } from 'react';
import { formatMoney } from '../constants';

export const FixedDeposit: React.FC = () => {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [tenureType, setTenureType] = useState<'Years' | 'Months' | 'Days'>('Years');
  const [payout, setPayout] = useState<'At Maturity' | 'Monthly' | 'Quarterly'>('At Maturity');
  const [result, setResult] = useState<{ maturity: number; interest: number; monthlyInterest?: number } | null>(null);

  const calculate = () => {
    const P = parseFloat(principal);
    const R = parseFloat(rate);
    const T_val = parseFloat(tenure);

    if (isNaN(P) || isNaN(R) || isNaN(T_val) || P <= 0) return;

    // Convert Tenure to Years for formula
    let t_years = 0;
    if (tenureType === 'Years') t_years = T_val;
    else if (tenureType === 'Months') t_years = T_val / 12;
    else t_years = T_val / 365;

    let interest = 0;
    let maturity = 0;
    let monthlyInterest = 0;

    if (payout === 'At Maturity') {
      // Standard Quarterly compounding for FDs
      const n = 4; // Quarterly
      const r = R / 100;
      maturity = P * Math.pow(1 + r / n, n * t_years);
      interest = maturity - P;
    } else if (payout === 'Monthly') {
      // Monthly Payout logic (Discounted if base is quarterly)
      // Standard formula for monthly payout: P * (R/100) / 12 * (1 / (1 + R/400)) ??
      // Simplified common logic: Total interest is simple interest if we ignore compounding
      // But to match the 2550.37 result for 400k @ 7.7%:
      // Monthly Rate = 400000 * (7.7/100) / 12 = 2566.66.
      // 2550.37 is roughly (2566.66 / (1 + 7.7/1200))? No.
      // Actually, Indian Bank formula: I = P * [(1 + R/400)^(1/3) - 1]
      // Let's test: 400000 * ((1 + 7.7/400)^(1/3) - 1) = 2550.3707... YES! This matches!
      monthlyInterest = P * (Math.pow(1 + R / 400, 1 / 3) - 1);
      interest = monthlyInterest * (t_years * 12);
      maturity = P + interest;
    } else {
      // Quarterly Payout
      // Just simple interest per quarter: P * (R/100) / 4
      const quarterlyInterest = P * (R / 400);
      interest = quarterlyInterest * (t_years * 4);
      maturity = P + interest;
    }

    setResult({ maturity, interest, monthlyInterest: payout === 'Monthly' ? monthlyInterest : undefined });
  };

  const reset = () => {
    setPrincipal('');
    setRate('');
    setTenure('');
    setResult(null);
  };

  return (
    <div className="tool-content">
      <div className="tool-header text-fd">
          <i className="bi bi-bank"></i>
          <h3>Term Deposit</h3>
      </div>
      
      <div className="input-group">
        <label>Principal Amount</label>
        <input 
          type="number" 
          placeholder="Enter amount" 
          value={principal}
          onChange={e => setPrincipal(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Currency</label>
        <select disabled style={{backgroundColor:'#f5f5f5', color:'#888', cursor:'not-allowed'}}>
            <option>₹ INR - Indian Rupee</option>
        </select>
      </div>

      <div className="input-group">
        <label>Interest Rate (% per annum)</label>
        <input 
          type="number" 
          placeholder="e.g., 7.5" 
          value={rate}
          onChange={e => setRate(e.target.value)}
        />
      </div>

      <div className="input-row">
        <div className="input-group" style={{flex: 2}}>
             <label>Tenure</label>
             <input type="number" placeholder="Duration" value={tenure} onChange={e => setTenure(e.target.value)} />
        </div>
        <div className="input-group" style={{flex: 1}}>
             <label>Period</label>
             <select value={tenureType} onChange={(e:any) => setTenureType(e.target.value)}>
                <option>Years</option>
                <option>Months</option>
                <option>Days</option>
             </select>
        </div>
      </div>

      <div className="input-group">
        <label>You want to receive interest</label>
        <select value={payout} onChange={(e:any) => setPayout(e.target.value)}>
            <option value="At Maturity">At Maturity (Re-investment)</option>
            <option value="Monthly">Monthly Payout</option>
            <option value="Quarterly">Quarterly Payout</option>
        </select>
      </div>

      <div className="btn-row">
        <button className="btn calc bg-grad-fd" onClick={calculate}>CALCULATE</button>
        <button className="btn btn-outline" onClick={reset}>RESET</button>
      </div>

      {result && (
        <div className="result-box mt-6" style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
             <h4 style={{ textAlign: 'center', color: '#64748b', fontSize: '18px', marginBottom: '20px', fontWeight: '500' }}>Results</h4>
             
             {result.monthlyInterest && (
               <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                 <div style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Interest</div>
                 <div style={{ fontSize: '24px', color: '#334155', fontWeight: '600' }}>{formatMoney(result.monthlyInterest)}</div>
               </div>
             )}

             <div style={{ textAlign: 'center', marginBottom: '16px' }}>
               <div style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Interest</div>
               <div style={{ fontSize: '24px', color: '#334155', fontWeight: '600' }}>{formatMoney(result.interest)}</div>
             </div>
             
             <div style={{ textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '16px' }}>
               <div style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Amount (Deposit + Interest)</div>
               <div style={{ fontSize: '28px', color: '#0f172a', fontWeight: '700' }}>{formatMoney(result.maturity)}</div>
             </div>
        </div>
      )}
    </div>
  );
}