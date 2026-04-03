
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { InterestRecord, StatementItem } from '../types';
import { addRecord, updateRecord } from '../services/storage';
import { formatMoney, diffDays, dayToDuration, dayToShortDuration, formatDate, formatDateTimePretty, formatDatePretty, formatNumber, getExactDateDiff } from '../constants';

interface CalculatorProps {
  loadData?: InterestRecord | null;
  onClearLoadData?: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ loadData, onClearLoadData }) => {
  const navigate = useNavigate();

  // State matching the HTML inputs
  const [interestType, setInterestType] = useState<'Simple' | 'Compound'>('Simple');
  const [compoundFrequency, setCompoundFrequency] = useState<'Yearly' | 'Half-Yearly' | 'Quarterly' | 'Monthly'>('Yearly');
  
  const [name, setName] = useState('');
  const [transType, setTransType] = useState<'Lend' | 'Borrow'>('Lend');
  const [principal, setPrincipal] = useState('');
  const [rateType, setRateType] = useState<'percent' | 'rupees'>('percent');
  const [rate, setRate] = useState('');
  
  const [mode, setMode] = useState<'Dates' | 'Duration'>('Dates');
  
  // Date inputs
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Partial Payment
  const [hasPartialPayment, setHasPartialPayment] = useState(false);
  const [partialDate, setPartialDate] = useState('');
  const [partialAmount, setPartialAmount] = useState('');

  // Duration inputs
  const [years, setYears] = useState('0');
  const [months, setMonths] = useState('0');
  const [days, setDays] = useState('0');

  // Result state
  const [lastCalc, setLastCalc] = useState<InterestRecord | null>(null);

  // Edit Mode State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalCreated, setOriginalCreated] = useState<string | null>(null);
  const [originalIsFavorite, setOriginalIsFavorite] = useState<boolean>(false);
  const [originalCategory, setOriginalCategory] = useState<'book'|'saved'|undefined>(undefined);

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Projection State
  const [projectionYears, setProjectionYears] = useState<number>(5);

  // Load data effect
  useEffect(() => {
    if (loadData) {
      setEditingId(loadData.id);
      setOriginalCreated(loadData.created);
      setOriginalIsFavorite(loadData.isFavorite);
      setOriginalCategory(loadData.category);

      setName(loadData.name);
      setPrincipal(loadData.principal.toString());
      setRate(loadData.rate.toString());
      setRateType(loadData.rateType);
      setInterestType(loadData.interestType);
      if (loadData.interestType === 'Compound' && loadData.compoundFrequency) {
          setCompoundFrequency(loadData.compoundFrequency);
      } else {
          setCompoundFrequency('Yearly');
      }
      setTransType(loadData.isLend ? 'Lend' : 'Borrow');
      
      if (loadData.partialPaymentAmount && loadData.partialPaymentDate) {
          setHasPartialPayment(true);
          setPartialDate(loadData.partialPaymentDate);
          setPartialAmount(loadData.partialPaymentAmount.toString());
      } else {
          setHasPartialPayment(false);
          setPartialDate('');
          setPartialAmount('');
      }

      if (loadData.mode === 'Dates' && loadData.fromDate && loadData.toDate) {
          setMode('Dates');
          setFromDate(loadData.fromDate);
          setToDate(loadData.toDate);
      } else {
          setMode('Duration');
          const y = Math.floor(loadData.days / 365);
          const rem = loadData.days % 365;
          const m = Math.floor(rem / 30);
          const d = Math.floor(rem % 30);
          setYears(y.toString());
          setMonths(m.toString());
          setDays(d.toString());
      }

      setLastCalc(null);
      setErrors({});

      if(onClearLoadData) onClearLoadData();
    }
  }, [loadData, onClearLoadData]);

  useEffect(() => {
      if (mode === 'Duration' && !hasPartialPayment) {
          setHasPartialPayment(false);
      }
  }, [mode]);

  // Real-time Validation Handlers
  const handlePrincipalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setPrincipal(val);
      if (val && parseFloat(val) > 0) {
          setErrors(prev => { const n = {...prev}; delete n.principal; return n; });
      } else if (val && parseFloat(val) <= 0) {
          setErrors(prev => ({...prev, principal: "Amount must be > 0"}));
      } else {
          setErrors(prev => { const n = {...prev}; delete n.principal; return n; });
      }
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setRate(val);
      if (val && parseFloat(val) > 0) {
          setErrors(prev => { const n = {...prev}; delete n.rate; return n; });
      } else if (val && parseFloat(val) <= 0) {
          setErrors(prev => ({...prev, rate: "Rate must be > 0"}));
      } else {
          setErrors(prev => { const n = {...prev}; delete n.rate; return n; });
      }
  };

  const handleDateChange = (type: 'from' | 'to' | 'partial', val: string) => {
      if (type === 'from') setFromDate(val);
      if (type === 'to') setToDate(val);
      if (type === 'partial') setPartialDate(val);
      
      setErrors(prev => {
          const n = {...prev};
          
          if (type === 'from') delete n.fromDate;
          if (type === 'to') delete n.toDate;
          if (type === 'partial') delete n.partialDate;

          const fDate = type === 'from' ? val : fromDate;
          const tDate = type === 'to' ? val : toDate;
          
          if (fDate && tDate) {
              const d1 = new Date(fDate);
              const d2 = new Date(tDate);
              if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                  if (d2 <= d1) n.toDate = "End date must be after Start date";
                  else delete n.toDate;
              }
          }

          const pDate = type === 'partial' ? val : partialDate;
          if (hasPartialPayment && pDate && fDate && tDate) {
              const dStart = new Date(fDate);
              const dEnd = new Date(tDate);
              const dPart = new Date(pDate);
              if (!isNaN(dPart.getTime()) && !isNaN(dStart.getTime()) && !isNaN(dEnd.getTime())) {
                   if (dPart < dStart || dPart >= dEnd) {
                       n.partialDate = "Date must be between From and To dates";
                   } else {
                       delete n.partialDate;
                   }
              }
          }

          return n;
      });
  };

  const handlePartialToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
      const checked = e.target.checked;
      setHasPartialPayment(checked);
      
      if (checked && mode === 'Duration') {
          const anchorDate = originalCreated ? new Date(originalCreated) : new Date();
          const y = parseInt(years) || 0;
          const m = parseInt(months) || 0;
          const d = parseInt(days) || 0;
          const totalDays = y * 365 + m * 30 + d;
          
          if (totalDays > 0) {
              const endDate = new Date(anchorDate);
              endDate.setDate(anchorDate.getDate() + totalDays);
              setFromDate(anchorDate.toISOString().split('T')[0]);
              setToDate(endDate.toISOString().split('T')[0]);
              setMode('Dates');
              setPartialDate(new Date().toISOString().split('T')[0]);
          } else {
              const today = new Date().toISOString().split('T')[0];
              setMode('Dates');
              setFromDate(today);
          }
      }
  };

  const calculateInterest = (P: number, R: number, timeValMonths: number, isSimple: boolean, rType: 'percent' | 'rupees', freq: string = 'Yearly') => {
      if (timeValMonths <= 0) return 0;
      
      if (isSimple) {
          if (rType === 'percent') {
              // Percentage Formula: P * (R/100) * (TimeInYears)
              // TimeInYears = Months / 12
              return (P * R * (timeValMonths / 12)) / 100;
          } else {
              // Rupees Method: P * (R/100) * Months
              return (P / 100) * R * timeValMonths;
          }
      } 
      
      // COMPOUND INTEREST
      let R_annual = R;
      if (rType === 'rupees') {
          R_annual = R * 12; // Convert monthly rupees rate to annual %
      }

      let t_years = timeValMonths / 12;

      let n = 1;
      if (freq === 'Half-Yearly') n = 2;
      if (freq === 'Quarterly') n = 4;
      if (freq === 'Monthly') n = 12;

      const ratePerPeriod = (R_annual / 100) / n;
      const totalPeriods = n * t_years;

      const amount = P * Math.pow(1 + ratePerPeriod, totalPeriods);
      return amount - P;
  };

  const validateInputs = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    const P = parseFloat(principal);
    if (isNaN(P) || P <= 0) {
        newErrors.principal = "Please enter a valid principal amount > 0";
        isValid = false;
    }

    const R_input = parseFloat(rate);
    if (isNaN(R_input) || R_input <= 0) {
        newErrors.rate = "Please enter a valid interest rate > 0";
        isValid = false;
    }

    if (mode === 'Dates') {
        if (!fromDate) {
            newErrors.fromDate = "Start date is required";
            isValid = false;
        }
        if (!toDate) {
            newErrors.toDate = "End date is required";
            isValid = false;
        }
        if (fromDate && toDate) {
            const d1 = new Date(fromDate);
            const d2 = new Date(toDate);
            if (d2 <= d1) {
                newErrors.toDate = "End date must be after From date";
                isValid = false;
            }
        }
    } else {
        const y = parseInt(years) || 0;
        const m = parseInt(months) || 0;
        const d = parseInt(days) || 0;
        const totalDurationDays = y * 365 + m * 30 + d;
        if (totalDurationDays <= 0) {
            newErrors.duration = "Please enter a duration of at least 1 day";
            isValid = false;
        }
    }

    if (hasPartialPayment) {
        if (!partialDate) {
            newErrors.partialDate = "Partial payment date is required";
            isValid = false;
        }
        const pAmount = parseFloat(partialAmount);
        if (isNaN(pAmount) || pAmount <= 0) {
            newErrors.partialAmount = "Valid amount required";
            isValid = false;
        }
        if (partialDate && fromDate && toDate) {
             const dStart = new Date(fromDate);
             const dEnd = new Date(toDate);
             const dPart = new Date(partialDate);
             if (dPart < dStart || dPart >= dEnd) {
                 newErrors.partialDate = "Date must be between From and To dates";
                 isValid = false;
             }
        }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleCalculate = () => {
    if (!validateInputs()) return;

    const P = parseFloat(principal);
    const R_input = parseFloat(rate);

    let totalDays = 0;
    let durationText = "";
    let effectiveFrom = fromDate;
    let effectiveTo = toDate;
    
    // Auto convert duration to dates if Partial Payment is active
    if (hasPartialPayment && (mode === 'Duration' || !effectiveFrom || !effectiveTo)) {
        const y = parseInt(years) || 0;
        const m = parseInt(months) || 0;
        const d = parseInt(days) || 0;
        const totalDurationDays = y * 365 + m * 30 + d;

        if (totalDurationDays > 0) {
            const anchorDate = originalCreated ? new Date(originalCreated) : new Date();
            const endDate = new Date(anchorDate);
            endDate.setDate(anchorDate.getDate() + totalDurationDays);
            
            effectiveFrom = anchorDate.toISOString().split('T')[0];
            effectiveTo = endDate.toISOString().split('T')[0];
        }
    }

    let fullMonths = 0;
    
    if (mode === 'Dates') {
        const diff = getExactDateDiff(effectiveFrom, effectiveTo);
        durationText = `${diff.years} Years ${diff.months} Months ${diff.days} Days`;
        fullMonths = (diff.years * 12) + diff.months + (diff.days / 30);
        totalDays = diffDays(effectiveFrom, effectiveTo);
    } else {
        const y = parseInt(years) || 0;
        const m = parseInt(months) || 0;
        const d = parseInt(days) || 0;
        durationText = `${y} Years ${m} Months ${d} Days`;
        fullMonths = (y * 12) + m + (d / 30);
        totalDays = y*365 + m*30 + d;
    }

    if (hasPartialPayment) {
        const pAmount = parseFloat(partialAmount);
        const diff1 = getExactDateDiff(effectiveFrom, partialDate);
        const months1 = (diff1.years * 12) + diff1.months + (diff1.days / 30);
        const diff2 = getExactDateDiff(partialDate, effectiveTo);
        const months2 = (diff2.years * 12) + diff2.months + (diff2.days / 30);
        
        let int1 = Math.round(calculateInterest(P, R_input, months1, interestType === 'Simple', rateType, compoundFrequency));
        const statement: StatementItem[] = [];
        let balanceAfterP1 = P;

        statement.push({
            id: 1,
            label: interestType === 'Simple' ? `Interest Period 1` : `Phase 1 (Compound)`,
            date: `${formatDate(effectiveFrom)} to ${formatDate(partialDate)}`,
            days: Math.round(months1 * 30),
            principal: P,
            interest: int1,
            balance: interestType === 'Simple' ? P : P + int1,
            isPayment: false
        });

        if (interestType === 'Simple') {
             balanceAfterP1 = P - pAmount;
        } else {
             balanceAfterP1 = (P + int1) - pAmount;
        }
        
        statement.push({
            id: 2,
            label: 'Partial Payment',
            date: formatDate(partialDate),
            payment: pAmount,
            balance: interestType === 'Simple' ? 0 : balanceAfterP1,
            isPayment: true
        });

        let int2 = 0;
        if (months2 > 0) {
            int2 = Math.round(calculateInterest(balanceAfterP1, R_input, months2, interestType === 'Simple', rateType, compoundFrequency));
        }

        let balanceFinal = balanceAfterP1;
        if (interestType === 'Simple') {
            balanceFinal = balanceAfterP1 + (int1 + int2);
        } else {
            balanceFinal = balanceAfterP1 + int2;
        }

        statement.push({
            id: 3,
            label: interestType === 'Simple' ? `Interest Period 2` : `Phase 2 (Compound)`,
            date: `${formatDate(partialDate)} to ${formatDate(effectiveTo)}`,
            days: Math.round(months2 * 30),
            principal: balanceAfterP1,
            interest: int2,
            balance: balanceFinal,
            isPayment: false
        });
        
        const totalInterest = (interestType === 'Simple') ? (int1 + int2) : (balanceFinal + pAmount - P);

        setLastCalc({
            id: Date.now(),
            name: name.trim() || "Unknown",
            principal: P,
            rate: R_input,
            rateType,
            interest: totalInterest,
            totalAmount: balanceFinal,
            days: totalDays,
            monthsUsed: fullMonths,
            durationText,
            mode: 'Dates',
            fromDate: effectiveFrom,
            toDate: effectiveTo,
            isLend: transType === 'Lend',
            interestType,
            compoundFrequency: interestType === 'Compound' ? compoundFrequency : undefined,
            isFavorite: false,
            date: new Date().toISOString(),
            created: new Date().toISOString(),
            partialPaymentDate: partialDate,
            partialPaymentAmount: pAmount,
            statement
        });
        return;
    }

    const interest = Math.round(calculateInterest(P, R_input, fullMonths, interestType === 'Simple', rateType, compoundFrequency));
    const total = P + interest;

    setLastCalc({
        id: Date.now(),
        name: name.trim() || "Unknown",
        principal: P,
        rate: R_input,
        rateType,
        interest,
        totalAmount: total,
        days: totalDays,
        monthsUsed: fullMonths,
        durationText,
        mode,
        fromDate: effectiveFrom,
        toDate: effectiveTo,
        isLend: transType === 'Lend',
        interestType,
        compoundFrequency: interestType === 'Compound' ? compoundFrequency : undefined,
        isFavorite: false,
        date: new Date().toISOString(),
        created: new Date().toISOString()
    });
  };

  const handleSave = (category?: 'book' | 'saved') => {
      if (!lastCalc) {
          alert("Calculate first, then Save.");
          return;
      }
      if (!validateInputs()) return;

      if (editingId !== null) {
          const recordToUpdate = {
              ...lastCalc,
              id: editingId,
              created: originalCreated || new Date().toISOString(),
              isFavorite: originalIsFavorite,
              category: originalCategory || 'saved', // Preserve original category or default to saved
          };
          updateRecord(recordToUpdate);
          alert("Record updated successfully!");
          clearAll();
      } else {
          const recordToSave = { 
              ...lastCalc, 
              id: Date.now() + Math.floor(Math.random() * 1000000),
              category: category || 'saved'
          };
          addRecord(recordToSave);
          if (category === 'book') alert("Added to Interest Book!");
          else alert("Calculation Saved!");
      }
  };

  const clearAll = () => {
    setName('');
    setPrincipal('');
    setRate('');
    setYears('0');
    setMonths('0');
    setDays('0');
    setFromDate('');
    setToDate('');
    setHasPartialPayment(false);
    setPartialDate('');
    setPartialAmount('');
    setLastCalc(null);
    setEditingId(null);
    setOriginalCreated(null);
    setOriginalIsFavorite(false);
    setOriginalCategory(undefined);
    setCompoundFrequency('Yearly');
    setErrors({});
  };

  const getProjections = () => {
      if (!lastCalc || lastCalc.interestType !== 'Compound') return [];

      const rows = [];
      const P = lastCalc.totalAmount; 
      const R = lastCalc.rate;
      let currentPrincipal = P;
      const monthsInYear = 12;

      for(let i = 1; i <= projectionYears; i++) {
          const interestForYear = calculateInterest(currentPrincipal, R, monthsInYear, false, lastCalc.rateType, lastCalc.compoundFrequency);
          const endBalance = currentPrincipal + interestForYear;
          
          rows.push({
              year: i,
              start: currentPrincipal,
              interest: interestForYear,
              end: endBalance
          });
          currentPrincipal = endBalance;
      }
      return rows;
  };

  return (
    <div id="homePage" className="page">
        <div className="container">

            <h2 className="title">{editingId ? "Edit Record" : "Interest Calculator"}</h2>
            
            {editingId && (
                <div style={{background:'#e0e7ff', padding:'12px', borderRadius:'12px', marginBottom:'20px', color:'#3730a3', border:'1px solid #c7d2fe', fontSize:'14px', display:'flex', alignItems:'center', gap:'10px'}}>
                    <i className="bi bi-pencil-square" style={{fontSize:'18px'}}></i> 
                    <div>Editing existing record. Click <b>Update</b> below to save.</div>
                </div>
            )}

            {/* SECTION 1: Calculation Type & Party */}
            <div className="section-card">
                <div className="section-header"><i className="bi bi-person-lines-fill"></i> Party Details</div>
                
                <div className="tab-row">
                    <label>
                        <input type="radio" name="transType" checked={transType === 'Lend'} onChange={() => setTransType('Lend')} /> 
                        <span style={{color: transType === 'Lend' ? '#2e7d32' : 'inherit'}}>Lend (Given)</span>
                    </label>
                    <label>
                        <input type="radio" name="transType" checked={transType === 'Borrow'} onChange={() => setTransType('Borrow')} /> 
                        <span style={{color: transType === 'Borrow' ? '#c62828' : 'inherit'}}>Borrow (Taken)</span>
                    </label>
                </div>

                <div className="input-group">
                    <label>Person Name</label>
                    <input type="text" placeholder="Enter name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
            </div>

            {/* SECTION 2: Financial Details */}
            <div className="section-card">
                <div className="section-header"><i className="bi bi-cash-coin"></i> Financials</div>
                
                <div className="tab-row" style={{marginBottom:'16px'}}>
                    <label>
                        <input type="radio" name="itype" checked={interestType === 'Simple'} onChange={() => setInterestType('Simple')} /> 
                        Simple Interest
                    </label>
                    <label>
                        <input type="radio" name="itype" checked={interestType === 'Compound'} onChange={() => setInterestType('Compound')} /> 
                        Compound
                    </label>
                </div>

                {interestType === 'Compound' && (
                    <div style={{marginBottom: '16px', padding: '12px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '12px', border: '1px solid rgba(79, 70, 229, 0.1)'}}>
                        <div style={{fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#4338ca', textAlign: 'center'}}>Compounding Frequency</div>
                        <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center'}}>
                            {['Yearly', 'Half-Yearly', 'Quarterly', 'Monthly'].map((freq) => (
                                <label key={freq} style={{
                                    fontSize: '11px', 
                                    padding: '6px 10px', 
                                    borderRadius: '8px', 
                                    background: compoundFrequency === freq ? '#4338ca' : '#fff',
                                    color: compoundFrequency === freq ? '#fff' : '#6b7280',
                                    border: '1px solid ' + (compoundFrequency === freq ? '#4338ca' : '#e5e7eb'),
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: '500'
                                }}>
                                    <input 
                                        type="radio" 
                                        name="cfreq" 
                                        style={{display:'none'}}
                                        checked={compoundFrequency === freq} 
                                        onChange={() => setCompoundFrequency(freq as any)} 
                                    /> 
                                    {freq}
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <div className="input-group">
                    <label>Principal Amount</label>
                    <input 
                        type="number" 
                        placeholder="Enter amount" 
                        value={principal} 
                        onChange={handlePrincipalChange} 
                        style={errors.principal ? {borderColor: '#ef4444', background: '#fef2f2'} : {}}
                    />
                    {errors.principal && <small style={{color: '#d32f2f', fontSize: '12px', marginTop: '4px', display: 'block'}}>{errors.principal}</small>}
                </div>

                <div className="input-row">
                    <div className="input-group" style={{flex:1}}>
                        <label>Rate Type</label>
                        <select value={rateType} onChange={(e) => setRateType(e.target.value as 'percent' | 'rupees')}>
                            <option value="percent">% (Yearly)</option>
                            <option value="rupees">₹ / 100 / Month</option>
                        </select>
                    </div>
                    <div className="input-group" style={{flex:1}}>
                        <label>Rate Value</label>
                        <input 
                            type="number" 
                            placeholder={rateType === 'percent' ? "12%" : "2 ₹"} 
                            value={rate} 
                            onChange={handleRateChange} 
                            style={errors.rate ? {borderColor: '#ef4444', background: '#fef2f2'} : {}}
                        />
                    </div>
                </div>
                {errors.rate && <small style={{color: '#d32f2f', fontSize: '12px', marginTop: '-12px', marginBottom:'12px', display: 'block'}}>{errors.rate}</small>}
            </div>

            {/* SECTION 3: Time Period */}
            <div className="section-card">
                <div className="section-header"><i className="bi bi-calendar-range"></i> Duration</div>

                <div className="tab-row">
                    <label>
                        <input type="radio" name="mode" checked={mode === 'Dates'} onChange={() => setMode('Dates')} /> 
                        By Dates
                    </label>
                    <label>
                        <input type="radio" name="mode" checked={mode === 'Duration'} onChange={() => setMode('Duration')} /> 
                        By Period
                    </label>
                </div>

                {mode === 'Dates' ? (
                    <div id="dateInputs" className="input-row">
                        <div className="input-group" style={{flex:1}}>
                            <label>From</label>
                            <input 
                                type="date" 
                                value={fromDate} 
                                onChange={(e) => handleDateChange('from', e.target.value)} 
                                style={errors.fromDate ? {borderColor: '#ef4444', background: '#fef2f2'} : {}}
                            />
                        </div>
                        <div className="input-group" style={{flex:1}}>
                            <label>To</label>
                            <input 
                                type="date" 
                                value={toDate} 
                                onChange={(e) => handleDateChange('to', e.target.value)} 
                                style={errors.toDate ? {borderColor: '#ef4444', background: '#fef2f2'} : {}}
                            />
                        </div>
                    </div>
                ) : (
                    <div id="durationInputs" className="input-row">
                        <div className="input-group" style={{flex:1}}>
                            <label>Years</label>
                            <input type="number" value={years} onChange={(e) => setYears(e.target.value)} />
                        </div>
                        <div className="input-group" style={{flex:1}}>
                            <label>Months</label>
                            <input type="number" value={months} onChange={(e) => setMonths(e.target.value)} />
                        </div>
                        <div className="input-group" style={{flex:1}}>
                            <label>Days</label>
                            <input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
                        </div>
                    </div>
                )}
                {errors.toDate && <small style={{color: '#d32f2f', fontSize: '12px', marginTop: '-8px', display: 'block'}}>{errors.toDate}</small>}
                {errors.fromDate && <small style={{color: '#d32f2f', fontSize: '12px', marginTop: '-8px', display: 'block'}}>{errors.fromDate}</small>}
                {errors.duration && <small style={{color: '#d32f2f', fontSize: '12px', marginTop: '-8px', display: 'block'}}>{errors.duration}</small>}
                
                {/* Partial Payment Toggle - Now Only Available if Editing */}
                {editingId && (
                <div style={{marginTop: '15px', padding: '12px', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '12px'}}>
                    <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer', fontWeight:'600', color: '#9a3412', fontSize:'14px'}}>
                        <input 
                            type="checkbox" 
                            checked={hasPartialPayment} 
                            onChange={handlePartialToggle}
                        />
                        Add Partial Payment / Adjustment
                    </label>
                    
                    {hasPartialPayment && (
                        <div style={{marginTop: '12px'}}>
                            <div className="input-row">
                                <div className="input-group" style={{flex:1}}>
                                    <label>Date</label>
                                    <input 
                                        type="date" 
                                        value={partialDate} 
                                        onChange={(e) => handleDateChange('partial', e.target.value)} 
                                        style={errors.partialDate ? {borderColor: '#ef4444', background: '#fef2f2'} : {}}
                                    />
                                </div>
                                <div className="input-group" style={{flex:1}}>
                                    <label>Amount</label>
                                    <input 
                                        type="number" 
                                        placeholder="Amt" 
                                        value={partialAmount} 
                                        onChange={(e) => {
                                            setPartialAmount(e.target.value);
                                            setErrors(prev => { const n = {...prev}; delete n.partialAmount; return n; });
                                        }}
                                        style={errors.partialAmount ? {borderColor: '#ef4444', background: '#fef2f2'} : {}} 
                                    />
                                </div>
                            </div>
                            {errors.partialDate && <small style={{color: '#d32f2f', fontSize: '12px', marginTop: '-8px', display: 'block'}}>{errors.partialDate}</small>}
                            {errors.partialAmount && <small style={{color: '#d32f2f', fontSize: '12px', marginTop: '-8px', display: 'block'}}>{errors.partialAmount}</small>}
                            <small style={{color:'#666', fontSize:'11px'}}>
                                Calculation splits at this date. Interest calculated on balance thereafter.
                            </small>
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* Buttons */}
            <div className="btn-row">
                <button className="btn clear" onClick={clearAll}><i className="bi bi-eraser"></i> Clear</button>
                <button className="btn calc" onClick={handleCalculate}><i className="bi bi-calculator"></i> Calculate</button>
            </div>

            {lastCalc && (
                <>
                <div className="result-box" style={{padding:0, overflow:'hidden', border:'1px solid #ccc'}}>
                    {/* Header */}
                    <div style={{background: '#e0e0e0', padding: '12px 16px', fontWeight: 'bold', color: '#333'}}>
                        {lastCalc.name || 'Unknown'} | {formatDateTimePretty(lastCalc.created || new Date().toISOString())}
                    </div>

                    {/* Grid */}
                    <div style={{padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                        {/* Row 1 */}
                        <div>
                            <div style={{fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color:'#000'}}>
                                <i className="bi bi-calendar-check"></i> Given Date
                            </div>
                            <div style={{color: '#1565c0', fontWeight: '500', fontSize: '15px', marginTop: '4px', paddingLeft: '22px'}}>
                                {formatDatePretty(lastCalc.fromDate || lastCalc.date)}
                            </div>
                        </div>
                        <div>
                            <div style={{fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color:'#000'}}>
                                <i className="bi bi-currency-rupee"></i> Principal Amount
                            </div>
                             <div style={{color: '#1565c0', fontWeight: '500', fontSize: '15px', marginTop: '4px', paddingLeft: '22px'}}>
                                {formatNumber(lastCalc.principal)}
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div>
                            <div style={{fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color:'#000'}}>
                                <i className="bi bi-calendar-x"></i> Return Date
                            </div>
                             <div style={{color: '#1565c0', fontWeight: '500', fontSize: '15px', marginTop: '4px', paddingLeft: '22px'}}>
                                {lastCalc.toDate ? formatDatePretty(lastCalc.toDate) : "N/A"}
                            </div>
                        </div>
                        <div>
                            <div style={{fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color:'#000'}}>
                                <i className="bi bi-clock"></i> Duration
                            </div>
                             <div style={{color: '#1565c0', fontWeight: '500', fontSize: '15px', marginTop: '4px', paddingLeft: '22px'}}>
                                {lastCalc.durationText}
                            </div>
                        </div>
                    </div>

                    {/* Yellow Strip */}
                    <div style={{background: '#fff9c4', padding: '15px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0'}}>
                         <div style={{textAlign: 'center', flex: 1}}>
                            <div style={{fontSize: '12px', fontWeight: 'bold'}}>Interest</div>
                            <div style={{color: '#1565c0', fontWeight: '600', fontSize: '15px'}}>{lastCalc.rate} {lastCalc.rateType === 'percent' ? '%' : '₹'}</div>
                         </div>
                         <div style={{textAlign: 'center', flex: 1}}>
                            <div style={{fontSize: '12px', fontWeight: 'bold'}}>Interest Type</div>
                            <div style={{color: '#1565c0', fontWeight: '600', fontSize: '15px'}}>{lastCalc.interestType}</div>
                         </div>
                         <div style={{textAlign: 'center', flex: 1}}>
                            <div style={{fontSize: '12px', fontWeight: 'bold'}}>Interest Amount</div>
                            <div style={{color: '#0d47a1', fontWeight: '700', fontSize: '16px'}}>{formatNumber(lastCalc.interest)}</div>
                         </div>
                    </div>

                    {/* Total Footer */}
                    <div style={{padding: '15px', textAlign: 'center', background: 'white'}}>
                        <div style={{color: '#0d47a1', fontSize: '18px', fontWeight: 'bold'}}>
                            Total Amount : {formatNumber(lastCalc.totalAmount)}
                        </div>
                    </div>
                </div>

                <div className="btn-row">
                    {editingId ? (
                        <button className="btn save" onClick={() => handleSave()}>
                            <i className="bi bi-check-lg"></i> Update Record
                        </button>
                    ) : (
                        <>
                            <button className="btn save" style={{background: 'linear-gradient(135deg, #2e7d32, #1b5e20)'}} onClick={() => handleSave('book')}>
                                <i className="bi bi-journal-plus"></i> Add to Book
                            </button>
                            <button className="btn save" style={{background: 'linear-gradient(135deg, #f57f17, #e65100)'}} onClick={() => handleSave('saved')}>
                                <i className="bi bi-save"></i> Save Record
                            </button>
                        </>
                    )}
                </div>

                {lastCalc.statement && lastCalc.statement.length > 0 && (
                        <div style={{marginTop: '20px', background: '#fff9e6', borderRadius: '10px', padding: '15px', border: '1px solid #f0e6c0'}}>
                            <h4 style={{marginTop: 0, marginBottom: '10px', fontSize: '15px', color: '#9a3412'}}>Partial Payment Breakdown</h4>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                                {lastCalc.statement.map(item => (
                                    <div key={item.id} style={{
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        fontSize: '13px',
                                        paddingBottom: '8px',
                                        borderBottom: '1px dashed #ddd'
                                    }}>
                                        <div>
                                            <div style={{fontWeight: '600', color: item.isPayment ? '#d32f2f' : '#333'}}>{item.label}</div>
                                            <div style={{color: '#666', fontSize: '11px'}}>
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
                                                <>
                                                    <div style={{fontWeight: '700', color: '#d32f2f'}}>- {formatMoney(item.payment)}</div>
                                                    <div style={{fontSize: '10px', color: '#777'}}>Payment</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{fontWeight: '600', color: '#2e7d32'}}>+ {formatMoney(item.interest)}</div>
                                                    <div style={{fontSize: '10px', color: '#777'}}>Interest</div>
                                                </>
                                            )}
                                            {item.balance !== undefined && !item.isPayment && (
                                                <div style={{fontSize:'10px', color:'#777'}}>Bal: {formatMoney(item.balance)}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Future Projection Section */}
                    {lastCalc.interestType === 'Compound' && (
                        <div style={{marginTop: '25px', padding: '15px', background:'white', borderRadius:'12px'}}>
                             <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '10px'}}>
                                <h4 style={{margin:0, color: '#4338ca', fontSize:'15px'}}>Future Growth</h4>
                                <div style={{display:'flex', alignItems:'center', gap:'5px', fontSize: '13px'}}>
                                    Next 
                                    <input 
                                        type="number" 
                                        min="1" max="20" 
                                        value={projectionYears} 
                                        onChange={(e) => setProjectionYears(parseInt(e.target.value) || 5)}
                                        style={{width: '40px', padding: '2px', borderRadius: '4px', border: '1px solid #ccc', textAlign:'center'}}
                                    /> 
                                    Years
                                </div>
                             </div>
                             
                             <div style={{overflowX: 'auto'}}>
                                <table style={{width: '100%', fontSize: '13px', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden'}}>
                                    <thead>
                                        <tr style={{background: '#e0e7ff', color: '#3730a3'}}>
                                            <th style={{padding: '8px', textAlign: 'left'}}>Year</th>
                                            <th style={{padding: '8px', textAlign: 'right'}}>Total</th>
                                            <th style={{padding: '8px', textAlign: 'right'}}>Interest</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getProjections().map((row, idx) => (
                                            <tr key={idx} style={{borderBottom: '1px solid #f3f4f6', background: idx % 2 === 0 ? '#fff' : '#f9fafb'}}>
                                                <td style={{padding: '8px', fontWeight:'500'}}>+{row.year} Year</td>
                                                <td style={{padding: '8px', textAlign: 'right', fontWeight: '600'}}>{formatMoney(row.end)}</td>
                                                <td style={{padding: '8px', textAlign: 'right', color: '#16a34a'}}>+{formatMoney(row.interest)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    )}
                </>
            )}
        </div>
    </div>
  );
};

export default Calculator;
