import React, { useState } from 'react';
import { formatMoney } from '../constants';

export const RecurringDeposit: React.FC = () => {
  const [monthly, setMonthly] = useState('');
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');
  const [result, setResult] = useState<{ invested: number; maturity: number; interest: number } | null>(null);

  const calculate = () => {
    const P = parseFloat(monthly);
    const R = parseFloat(rate);
    const N = parseFloat(months);

    if (isNaN(P) || isNaN(R) || isNaN(N) || P <= 0) return;

    // RD Calculation: Sum of compound interest on each installment (Quarterly Compounding is standard)
    let totalMaturity = 0;
    const freq = 4; // Quarterly

    for (let i = 0; i < N; i++) {
        // 1st installment (month 1) stays for N months.
        // ...
        // Nth installment stays for 1 month.
        const monthsRemaining = N - i;
        const years = monthsRemaining / 12;
        
        // Compound Interest on this installment
        const amount = P * Math.pow(1 + R / (100 * freq), freq * years);
        totalMaturity += amount;
    }

    const invested = P * N;
    const interest = totalMaturity - invested;

    setResult({ invested, maturity: totalMaturity, interest });
  };

  const reset = () => {
    setMonthly('');
    setRate('');
    setMonths('');
    setResult(null);
  };

  return (
    <div className="tool-content">
      <div className="tool-header text-rd">
          <i className="bi bi-arrow-repeat"></i>
          <h3>Recurring Deposit</h3>
      </div>
      
      <div className="input-group">
        <label>Monthly Deposit Amount</label>
        <input 
          type="number" 
          placeholder="Enter amount" 
          value={monthly}
          onChange={e => setMonthly(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Interest Rate (% per annum)</label>
        <input 
          type="number" 
          placeholder="e.g., 6.5" 
          value={rate}
          onChange={e => setRate(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Duration (Months)</label>
        <input 
          type="number" 
          placeholder="e.g., 12, 24, 36" 
          value={months}
          onChange={e => setMonths(e.target.value)}
        />
        <div style={{fontSize:'12px', color:'#666', marginTop:'4px'}}>
             Examples: 1 Year = 12, 5 Years = 60
        </div>
      </div>

      <div className="btn-row">
        <button className="btn calc bg-grad-rd" onClick={calculate}>Calculate</button>
        <button className="btn btn-outline" onClick={reset}>Reset</button>
      </div>

      {result && (
        <div className="result-box">
             <div className="result-row">
                 <span className="result-label">Total Deposited</span>
                 <span className="result-val">{formatMoney(result.invested)}</span>
             </div>
             <div className="result-row">
                 <span className="result-label">Interest Earned</span>
                 <span className="result-val purple">+{formatMoney(result.interest)}</span>
             </div>
             
             <div className="result-row main">
                 <span className="result-label">Total Maturity</span>
                 <span className="result-val lg text-rd">{formatMoney(result.maturity)}</span>
             </div>
        </div>
      )}
    </div>
  );
}