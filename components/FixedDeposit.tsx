import React, { useState } from 'react';
import { formatMoney } from '../constants';

export const FixedDeposit: React.FC = () => {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [tenureType, setTenureType] = useState<'Years' | 'Months' | 'Days'>('Years');
  const [frequency, setFrequency] = useState<'Yearly' | 'Half-Yearly' | 'Quarterly' | 'Monthly'>('Quarterly');
  const [result, setResult] = useState<{ maturity: number; interest: number } | null>(null);

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

    // n = compounding frequency per year
    let n = 1;
    if (frequency === 'Half-Yearly') n = 2;
    if (frequency === 'Quarterly') n = 4;
    if (frequency === 'Monthly') n = 12;

    // Formula: A = P * (1 + r/n)^(n*t)
    const r = R / 100;
    const amount = P * Math.pow(1 + r / n, n * t_years);
    const interest = amount - P;

    setResult({ maturity: amount, interest });
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
          <h3>Fixed Deposit</h3>
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
        <label>Compounding Frequency</label>
        <select value={frequency} onChange={(e:any) => setFrequency(e.target.value)}>
            <option value="Quarterly">Quarterly</option>
            <option value="Monthly">Monthly</option>
            <option value="Half-Yearly">Half-Yearly</option>
            <option value="Yearly">Yearly</option>
        </select>
      </div>

      <div className="btn-row">
        <button className="btn calc bg-grad-fd" onClick={calculate}>Calculate</button>
        <button className="btn btn-outline" onClick={reset}>Reset</button>
      </div>

      {result && (
        <div className="result-box">
             <div className="result-row">
                 <span className="result-label">Total Maturity Amount</span>
             </div>
             <div className="result-val lg text-fd">{formatMoney(result.maturity)}</div>
             
             <div className="result-row main">
                 <span className="result-label">Interest Earned</span>
                 <span className="result-val green">+{formatMoney(result.interest)}</span>
             </div>
        </div>
      )}
    </div>
  );
}