
export interface StatementItem {
  id: number;
  label: string;
  date: string;
  days?: number;
  principal?: number;
  interest?: number;
  payment?: number;
  balance: number;
  isPayment?: boolean;
}

export interface InterestRecord {
  id: number;
  name: string;
  principal: number;
  rate: number;
  rateType: 'percent' | 'rupees';
  interest: number;
  totalAmount: number;
  days: number;
  monthsUsed: number;
  durationText: string;
  mode: 'Dates' | 'Duration';
  fromDate: string | null;
  toDate: string | null;
  isLend: boolean;
  interestType: 'Simple' | 'Compound';
  compoundFrequency?: 'Yearly' | 'Half-Yearly' | 'Quarterly' | 'Monthly';
  isFavorite: boolean;
  date: string; // ISO string of creation/calculation date
  created: string;
  updatedAt: string; // ISO string for incremental sync
  partialPaymentDate?: string | null;
  partialPaymentAmount?: number;
  statement?: StatementItem[];
  category?: 'book' | 'saved';
}

export interface EMIRecord {
  monthlyEMI: number;
  totalInterest: number;
  totalAmount: number;
  months: number;
}
