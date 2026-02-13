import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Lock, ChevronRight, Loader2 } from 'lucide-react';

interface Props {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export const PaymentModule: React.FC<Props> = ({ amount, onSuccess, onCancel }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePay = () => {
    setIsProcessing(true);
    // Simulate Gateway delay
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-end justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Checkout</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure Gateway</p>
          </div>
          <button onClick={onCancel} className="p-2 bg-slate-100 rounded-full text-slate-400">
            <Lock size={18} />
          </button>
        </div>

        {/* Summary Card */}
        <div className="bg-blue-600 p-6 rounded-3xl text-white mb-6 shadow-xl shadow-blue-200">
          <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Total Payable</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black">₹{amount}</span>
            <span className="text-xs opacity-80 font-bold">INR</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-3 mb-8">
          <button className="w-full p-4 rounded-2xl border-2 border-blue-600 bg-blue-50 flex items-center justify-between">
            <div className="flex items-center gap-3 text-blue-700">
              <CreditCard size={20} />
              <span className="text-sm font-black italic">UPI / G-Pay</span>
            </div>
            <div className="w-5 h-5 rounded-full border-4 border-blue-600 bg-white" />
          </button>
          
          <div className="p-4 rounded-2xl border-2 border-slate-100 flex items-center justify-between opacity-50 italic">
            <div className="flex items-center gap-3 text-slate-400">
              <CreditCard size={20} />
              <span className="text-sm font-black">Credit / Debit Card</span>
            </div>
          </div>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePay}
          disabled={isProcessing}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-70"
        >
          {isProcessing ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>PROCESSING...</span>
            </>
          ) : (
            <>
              <span>PAY NOW</span>
              <ChevronRight size={18} />
            </>
          )}
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-emerald-600">
          <ShieldCheck size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">PCI-DSS Secure Payment</span>
        </div>
      </div>
    </div>
  );
};