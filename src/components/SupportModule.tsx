import { useState } from 'react';
import { AlertTriangle, Droplets, ShieldAlert, Zap, MessageSquare } from 'lucide-react';

export const SupportModule = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [
    { id: 'cleaning', label: 'Cleaning', icon: <Droplets className="text-blue-500" />, desc: 'Toilet/Coach cleaning' },
    { id: 'medical', label: 'Medical', icon: <AlertTriangle className="text-red-500" />, desc: 'Emergency medical aid' },
    { id: 'security', label: 'Security', icon: <ShieldAlert className="text-orange-500" />, desc: 'RPF assistance' },
    { id: 'electrical', label: 'Electrical', icon: <Zap className="text-amber-500" />, desc: 'Charging point issues' },
  ];

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-black text-slate-800">Support Center</h2>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Instant On-Board Grievance Redressal</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-2 ${activeCategory === cat.id ? 'border-blue-600 bg-blue-50' : 'border-slate-50 bg-slate-50'}`}
          >
            {cat.icon}
            <div>
                <p className="text-xs font-black text-slate-800">{cat.label}</p>
                <p className="text-[8px] text-slate-400 uppercase font-bold">{cat.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {activeCategory && (
        <div className="space-y-3 animate-in slide-in-from-top-2">
            <textarea 
                className="w-full p-4 bg-slate-100 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-blue-500"
                placeholder="Briefly describe your issue..."
                rows={3}
            />
            <button className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2">
                <MessageSquare size={18} /> Lodge Complaint
            </button>
        </div>
      )}
    </div>
  );
};