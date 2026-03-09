import React, { useState, useMemo } from 'react';
import { ShoppingCart, ChevronRight, X, Utensils } from 'lucide-react';
import type { FoodItem } from '../types/types';

interface CateringModuleProps {
  menu: FoodItem[];
  cart: Record<number, number>;
  onUpdateCart: (id: number, delta: number) => void;
  onPay: () => void;
}

export const CateringModule: React.FC<CateringModuleProps> = ({ menu, cart, onUpdateCart, onPay }) => {
  const [activeCategory, setActiveCategory] = useState<'meal' | 'snack' | 'water'>('meal');
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // useMemo for performance on price calculations
  const { cartItems, totalBill } = useMemo(() => {
    const items = menu.filter(item => (cart[item.id] || 0) > 0);
    const total = items.reduce((acc, item) => acc + (item.price * (cart[item.id] || 0)), 0);
    return { cartItems: items, totalBill: total };
  }, [menu, cart]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6 pb-32">
      {/* Category Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 sticky top-2 z-10">
        {(['meal', 'snack', 'water'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${activeCategory === cat
                ? 'bg-blue-900 text-white shadow-lg'
                : 'text-slate-400 hover:bg-slate-50'
              }`}
          >
            {cat}s
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid gap-4">
        {menu.filter(i => i.type === activeCategory).map(item => (
          <div key={item.id} className="bg-white p-5 border border-slate-100 flex items-center justify-between shadow-sm rounded-3xl hover:border-blue-100 transition-colors">
            <div className="flex gap-4 items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${item.category === 'Veg' ? 'bg-green-500' : 'bg-red-500'}`}
                title={item.category}
              />
              <div>
                <h3 className="font-bold text-slate-800 text-sm leading-none">{item.name}</h3>
                <p className="text-blue-600 font-black text-xs mt-1">₹{item.price}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-100 rounded-2xl p-1.5">
              <button
                onClick={() => onUpdateCart(item.id, -1)}
                className="w-8 h-8 flex items-center justify-center rounded-xl font-bold text-slate-500 hover:bg-white active:scale-90 transition-all"
              >-</button>
              <span className="font-black text-slate-700 text-center w-4 text-xs">{cart[item.id] || 0}</span>
              <button
                onClick={() => onUpdateCart(item.id, 1)}
                className="w-8 h-8 flex items-center justify-center rounded-xl font-bold text-slate-500 hover:bg-white active:scale-90 transition-all"
              >+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Checkout Drawer */}
      {totalBill > 0 && (
        <div className="fixed bottom-28 left-4 right-4 max-w-md mx-auto z-50">
          {isSummaryOpen && (
            <div className="bg-white rounded-t-[2.5rem] p-6 shadow-2xl border-x border-t border-slate-200 animate-in slide-in-from-bottom-20">
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                <div className="flex items-center gap-2 text-blue-900">
                  <Utensils size={16} strokeWidth={3} />
                  <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Order Summary</h3>
                </div>
                <button
                  onClick={() => setIsSummaryOpen(false)}
                  className="text-slate-400 p-1 hover:bg-slate-100 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 mb-6 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-slate-700">{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-black">Quantity: {cart[item.id]}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">₹{item.price * (cart[item.id] || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`bg-slate-900 text-white p-5 flex justify-between items-center shadow-2xl border border-white/10 ${isSummaryOpen ? 'rounded-b-[2.5rem]' : 'rounded-[2.5rem]'}`}>
            <button onClick={() => setIsSummaryOpen(!isSummaryOpen)} className="text-left group">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 group-hover:text-blue-400 transition-colors">
                {isSummaryOpen ? 'Hide Summary' : 'View Summary'}
                <ChevronRight size={10} className={`transition-transform duration-300 ${isSummaryOpen ? '-rotate-90' : 'rotate-0'}`} />
              </p>
              <p className="text-xl font-black text-orange-400">₹{totalBill}</p>
            </button>

            <button
              onClick={onPay}
              className="bg-orange-500 text-slate-900 px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-orange-400 active:scale-95 transition-all shadow-lg shadow-orange-500/20"
            >
              Pay Now <ShoppingCart size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};