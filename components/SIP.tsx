import React, { useState } from 'react';
import { formatMoney } from '../constants';

export const SIP: React.FC = () => {
  const [monthly, setMonthly] = useState('');
  const [rate, setRate] = useState('');
  const [years, setYears] = useState('');
  const [result, setResult] = useState<{ invested: number; maturity: number; gain: number } | null>(null);

  const calculate = () => {
    const P = parseFloat(monthly);
    const R = parseFloat(rate);
    const Y = parseFloat(years);

    if (isNaN(P) || isNaN(R) || isNaN(Y) || P <= 0) return;

    // SIP Formula: M = P × ({[1 + i]^n - 1} / i) × (1 + i)
    // i = monthly rate = R/12/100
    // n = months = Y * 12
    const i = R / 12 / 100;
    const n = Y * 12;

    const M = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const invested = P * n;
    const gain = M - invested;

    setResult({ invested, maturity: M, gain });
  };

  const reset = () => {
    setMonthly('');
    setRate('');
    setYears('');
    setResult(null);
  };

  return (
    <div className="tool-content">
      <div className="tool-header text-sip">
          <i className="bi bi-piggy-bank"></i>
          <h3>SIP Calculator</h3>
      </div>
      
      <div className="input-group">
        <label>Monthly Investment</label>
        <input 
          type="number" 
          placeholder="Enter amount" 
          value={monthly}
          onChange={e => setMonthly(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Expected Return Rate (% p.a)</label>
        <input 
          type="number" 
          placeholder="e.g., 12" 
          value={rate}
          onChange={e => setRate(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Time Period (Years)</label>
        <input 
          type="number" 
          placeholder="e.g., 5" 
          value={years}
          onChange={e => setYears(e.target.value)}
        />
      </div>

      <div className="btn-row">
        <button className="btn calc bg-grad-sip" onClick={calculate}>Calculate</button>
        <button className="btn btn-outline" onClick={reset}>Reset</button>
      </div>

      {result && (
        <div className="result-box">
             <div className="result-row">
                 <span className="result-label">Invested Amount</span>
                 <span className="result-val">{formatMoney(result.invested)}</span>
             </div>
             <div className="result-row">
                 <span className="result-label">Est. Returns</span>
                 <span className="result-val pink">+{formatMoney(result.gain)}</span>
             </div>
             
             <div className="result-row main">
                 <span className="result-label">Total Value</span>
                 <span className="result-val lg text-sip">{formatMoney(result.maturity)}</span>
             </div>
        </div>
      )}
    </div>
  );
}