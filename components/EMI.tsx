import React, { useState } from 'react';
import { formatMoney } from '../constants';

interface EMIScheduleItem {
    month: number;
    openingBalance: number;
    emi: number;
    interest: number;
    principal: number;
    closingBalance: number;
}

export const EMIContent: React.FC = () => {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [years, setYears] = useState('0');
  const [months, setMonths] = useState('0');
  const [result, setResult] = useState<{emi: number, interest: number, total: number, n: number} | null>(null);
  const [schedule, setSchedule] = useState<EMIScheduleItem[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);

  const emiCalculate = () => {
      const P = parseFloat(principal);
      const annualRate = parseFloat(rate);
      const y = parseInt(years) || 0;
      const m = parseInt(months) || 0;

      if (isNaN(P) || P <= 0 || isNaN(annualRate) || annualRate < 0) {
          alert("Enter valid EMI details");
          return;
      }

      const n = y * 12 + m;
      if (n <= 0) {
          alert("Enter valid tenure");
          return;
      }

      const r = annualRate / 12 / 100;
      let emi = 0;
      
      // Calculate EMI
      if (r === 0) emi = P / n;
      else {
          const p = Math.pow(1 + r, n);
          emi = P * r * p / (p - 1);
      }

      const total = emi * n;
      const interest = total - P;

      setResult({ emi, interest, total, n });

      // Generate Amortization Schedule
      const newSchedule: EMIScheduleItem[] = [];
      let currentBalance = P;

      for (let i = 1; i <= n; i++) {
          let interestPart = currentBalance * r;
          if (r === 0) interestPart = 0;
          
          let principalPart = emi - interestPart;
          
          if (i === n) {
             principalPart = currentBalance;
          }
          
          let endingBalance = currentBalance - principalPart;
          if (endingBalance < 0) endingBalance = 0;

          newSchedule.push({
              month: i,
              openingBalance: currentBalance,
              emi: emi,
              interest: interestPart,
              principal: principalPart,
              closingBalance: endingBalance
          });

          currentBalance = endingBalance;
      }
      setSchedule(newSchedule);
      setShowSchedule(false); // Reset view on new calc
  };

  const emiClear = () => {
      setPrincipal('');
      setRate('');
      setYears('0');
      setMonths('0');
      setResult(null);
      setSchedule([]);
      setShowSchedule(false);
  };

  return (
    <div className="tool-content">
       <div className="tool-header text-emi">
          <i className="bi bi-wallet2"></i>
          <h3>EMI / Loan Calculator</h3>
      </div>

            <div className="input-group">
                <label>Loan Amount</label>
                <input 
                    type="number" 
                    value={principal} 
                    onChange={(e) => setPrincipal(e.target.value)} 
                />
            </div>

            <div className="input-group">
                <label>Interest Rate (%)</label>
                <input 
                    type="number" 
                    value={rate} 
                    onChange={(e) => setRate(e.target.value)} 
                />
            </div>

            <div className="input-row">
                <div className="input-group">
                    <label>Years</label>
                    <input 
                        type="number" 
                        value={years} 
                        onChange={(e) => setYears(e.target.value)} 
                    />
                </div>
                <div className="input-group">
                    <label>Months</label>
                    <input 
                        type="number" 
                        value={months} 
                        onChange={(e) => setMonths(e.target.value)} 
                    />
                </div>
            </div>

            <div className="btn-row">
                <button className="btn calc bg-grad-emi" onClick={emiCalculate}>Calculate</button>
                <button className="btn btn-outline" onClick={emiClear}>Reset</button>
            </div>

            {result && (
                <>
                    <div id="emiResult" className="result-box">
                        <div className="result-row">
                            <span className="result-label">Monthly EMI</span>
                        </div>
                        <div className="result-val lg text-emi">{formatMoney(result.emi)}</div>
                        
                        <div className="result-row main">
                             <span className="result-label">Total Interest</span>
                             <span className="result-val">{formatMoney(result.interest)}</span>
                        </div>
                        <div className="result-row">
                             <span className="result-label">Total Amount</span>
                             <span className="result-val">{formatMoney(result.total)}</span>
                        </div>
                        
                        <div style={{marginTop: '20px'}}>
                             <button 
                                className="btn-small bg-grad-emi" 
                                style={{width: '100%', padding: '12px'}}
                                onClick={() => setShowSchedule(!showSchedule)}
                             >
                                {showSchedule ? "Hide Schedule" : "View Amortization Schedule"}
                             </button>
                        </div>
                    </div>

                    {showSchedule && (
                        <div style={{marginTop: '20px', background: 'rgba(255,255,255,0.9)', borderRadius: '16px', padding: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)'}}>
                            <h3 style={{fontSize: '16px', marginBottom: '15px', color: '#1b5e20', borderBottom: '1px solid #ddd', paddingBottom: '8px'}}>Amortization Schedule</h3>
                            
                            <div style={{maxHeight: '400px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #eee', position: 'relative'}}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '650px'}}>
                                        <thead style={{position: 'sticky', top: 0, background: '#0288d1', color: '#fff', zIndex: 10}}>
                                            <tr>
                                                <th style={{padding: '12px 8px', textAlign: 'center'}}>Mo.</th>
                                                <th style={{padding: '12px 8px', textAlign: 'right'}}>Opening Bal.</th>
                                                <th style={{padding: '12px 8px', textAlign: 'right'}}>EMI</th>
                                                <th style={{padding: '12px 8px', textAlign: 'right'}}>Principal</th>
                                                <th style={{padding: '12px 8px', textAlign: 'right'}}>Interest</th>
                                                <th style={{padding: '12px 8px', textAlign: 'right'}}>Closing Bal.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schedule.map((row) => (
                                                <tr key={row.month} style={{borderBottom: '1px solid #eee', background: row.month % 2 === 0 ? '#fafafa' : '#fff'}}>
                                                    <td style={{padding: '10px 8px', textAlign: 'center', color: '#666'}}>{row.month}</td>
                                                    <td style={{padding: '10px 8px', textAlign: 'right', color: '#333'}}>{formatMoney(row.openingBalance)}</td>
                                                    <td style={{padding: '10px 8px', textAlign: 'right', color: '#333'}}>{formatMoney(row.emi)}</td>
                                                    <td style={{padding: '10px 8px', textAlign: 'right', fontWeight: '500', color: '#198754'}}>{formatMoney(row.principal)}</td>
                                                    <td style={{padding: '10px 8px', textAlign: 'right', color: '#c62828'}}>{formatMoney(row.interest)}</td>
                                                    <td style={{padding: '10px 8px', textAlign: 'right', color: '#333', fontWeight: '600'}}>{formatMoney(row.closingBalance)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
    </div>
  );
};

// Default export acts as a page wrapper for direct routing if needed, 
// though we primarily use EMIContent in the Tools tab now.
const EMI: React.FC = () => {
    return (
        <div id="emiPage" className="page">
            <div className="container">
                <EMIContent />
            </div>
        </div>
    );
};
export default EMI;