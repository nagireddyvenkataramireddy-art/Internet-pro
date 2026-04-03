
export const formatMoney = (v: number | undefined): string => {
  return "₹" + Number(v || 0).toFixed(2);
};

export const formatNumber = (v: number | undefined): string => {
  return Number(v || 0).toLocaleString('en-IN');
};

export const diffDays = (from: string, to: string): number => {
  const d1 = new Date(from);
  const d2 = new Date(to);
  // Normalize to UTC midnight to avoid DST/Timezone shifts affecting day count
  d1.setUTCHours(0,0,0,0);
  d2.setUTCHours(0,0,0,0);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

// Precise Y-M-D diff for Interest Calculation
export const getExactDateDiff = (from: string, to: string) => {
    const d1 = new Date(from);
    const d2 = new Date(to);
    
    // Normalize to Local Midnight to ensure consistent calendar date diffing
    // We use Local because setHours(0,0,0,0) sets local time, and logic follows local calendar days
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);
    
    let y = d2.getFullYear() - d1.getFullYear();
    let m = d2.getMonth() - d1.getMonth();
    let d = d2.getDate() - d1.getDate();
    
    // Borrow days (Standard convention: 1 Month = 30 Days)
    if (d < 0) {
        m--;
        d += 30; 
    }
    
    // Borrow months
    if (m < 0) {
        y--;
        m += 12;
    }
    
    return { years: y, months: m, days: d };
};

export const dayToDuration = (days: number): string => {
  let y = Math.floor(days / 365);
  let r = days % 365;
  let m = Math.floor(r / 30);
  let d = Math.round(r % 30);
  return `${y} Years ${m} Months ${d} Days`;
};

export const dayToShortDuration = (days: number): string => {
  let y = Math.floor(days / 365);
  let r = days % 365;
  let m = Math.floor(r / 30);
  let d = Math.round(r % 30);
  
  let parts = [];
  if (y > 0) parts.push(`${y}Y`);
  if (m > 0) parts.push(`${m}M`);
  parts.push(`${d}D`);
  
  return parts.join(' ');
};

export const formatDate = (s: string): string => {
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

export const formatDateTimePretty = (isoString: string): string => {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const mon = d.toLocaleString('default', { month: 'short' });
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd} - ${mm} (${mon}) -${yyyy} ${hh}:${min}`;
};

export const formatDatePretty = (isoString: string): string => {
   const d = new Date(isoString);
   if (isNaN(d.getTime())) return "N/A";
   const dd = String(d.getDate()).padStart(2, '0');
   const mm = String(d.getMonth() + 1).padStart(2, '0');
   const mon = d.toLocaleString('default', { month: 'short' });
   const yyyy = d.getFullYear();
   return `${dd} - ${mm} (${mon}) - ${yyyy}`;
};
