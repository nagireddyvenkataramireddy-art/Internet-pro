
import React, { useState } from 'react';
import { FixedDeposit } from './FixedDeposit';
import { RecurringDeposit } from './RecurringDeposit';
import { SIP } from './SIP';
import { EMIContent } from './EMI';

const AdvancedCalculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fd' | 'rd' | 'sip' | 'emi'>('fd');

  return (
    <div className="page">
        <div className="container">
            <h2 className="title" style={{fontSize:'26px'}}>Financial Tools</h2>
            <div style={{textAlign:'center', marginTop:'-20px', marginBottom:'20px', color:'rgba(255,255,255,0.9)', fontSize:'14px', textShadow: '0 1px 3px rgba(0,0,0,0.3)'}}>
                FD, RD, SIP & Loan Calculators
            </div>

            {/* Icon Tabs */}
            <div className="tool-tabs">
                <div className={`tool-tab ${activeTab === 'fd' ? 'active' : ''}`} onClick={() => setActiveTab('fd')} title="Fixed Deposit">
                    <i className="bi bi-bank"></i>
                </div>
                <div className={`tool-tab ${activeTab === 'rd' ? 'active' : ''}`} onClick={() => setActiveTab('rd')} title="Recurring Deposit">
                    <i className="bi bi-arrow-repeat"></i>
                </div>
                <div className={`tool-tab ${activeTab === 'sip' ? 'active' : ''}`} onClick={() => setActiveTab('sip')} title="SIP">
                    <i className="bi bi-piggy-bank"></i>
                </div>
                <div className={`tool-tab ${activeTab === 'emi' ? 'active' : ''}`} onClick={() => setActiveTab('emi')} title="Loan / EMI">
                     {/* Scale icon for Balance/Loan */}
                    <i className="bi bi-wallet2"></i>
                </div>
            </div>

            {/* Content Area */}
            <div className="tool-container">
                {activeTab === 'fd' && <FixedDeposit />}
                {activeTab === 'rd' && <RecurringDeposit />}
                {activeTab === 'sip' && <SIP />}
                {activeTab === 'emi' && <EMIContent />}
            </div>
        </div>
    </div>
  );
};

export default AdvancedCalculators;
