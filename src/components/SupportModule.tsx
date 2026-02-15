import { useState } from 'react';
import { AlertTriangle, Droplets, ShieldAlert, Zap, MessageSquare, Phone, UserMinus, Utensils } from 'lucide-react';

interface SupportModuleProps {
  pnr?: string;
  userMobile?: string;
  userName?: string;
}

export const SupportModule = ({ pnr, userMobile, userName }: SupportModuleProps) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const categories = [
    {
      id: 'occupancy',
      label: 'Seat Occupied',
      icon: <UserMinus className="text-purple-600" />,
      desc: 'unauthorized occupancy',
      smsNumber: '9717630982',
      format: (pnr: string, msg: string) => `[SmartRail] PNR: ${pnr} | Name: ${userName || 'N/A'} | Mob: ${userMobile || 'N/A'} | Issue: Occupancy | Msg: ${msg}`
    },
    {
      id: 'catering',
      label: 'Food/Catering',
      icon: <Utensils className="text-rose-500" />,
      desc: 'Quality/Overcharging',
      smsNumber: '138',
      format: (pnr: string, msg: string) => `[SmartRail] PNR: ${pnr} | Name: ${userName || 'N/A'} | Mob: ${userMobile || 'N/A'} | Issue: Catering | Msg: ${msg}`
    },
    {
      id: 'cleaning',
      label: 'Cleaning',
      icon: <Droplets className="text-blue-500" />,
      desc: 'Toilet/Coach cleaning',
      smsNumber: '58888',
      format: (pnr: string, msg: string) => `CLEAN ${pnr} ${msg}`
    },
    {
      id: 'medical',
      label: 'Medical',
      icon: <AlertTriangle className="text-red-500" />,
      desc: 'Emergency medical aid',
      smsNumber: '138',
      format: (pnr: string, msg: string) => `[SmartRail] PNR: ${pnr} | Name: ${userName || 'N/A'} | Mob: ${userMobile || 'N/A'} | Issue: Medical | Msg: ${msg}`
    },
    {
      id: 'security',
      label: 'Security',
      icon: <ShieldAlert className="text-orange-500" />,
      desc: 'RPF assistance',
      smsNumber: '182',
      format: (pnr: string, msg: string) => `[SmartRail] PNR: ${pnr} | Name: ${userName || 'N/A'} | Mob: ${userMobile || 'N/A'} | Issue: Security | Msg: ${msg}`
    },
    {
      id: 'electrical',
      label: 'Electrical',
      icon: <Zap className="text-amber-500" />,
      desc: 'Charging point issues',
      smsNumber: '9717630982',
      format: (pnr: string, msg: string) => `[SmartRail] PNR: ${pnr} | Name: ${userName || 'N/A'} | Mob: ${userMobile || 'N/A'} | Issue: Electrical | Msg: ${msg}`
    },
  ];

  const handleLodgeComplaint = () => {
    if (!activeCategory) return;
    const category = categories.find(c => c.id === activeCategory);
    if (!category) return;

    const smsBody = category.format(pnr || 'N/A', message);
    const smsLink = `sms:${category.smsNumber}?body=${encodeURIComponent(smsBody)}`;
    window.open(smsLink, '_blank');
    setMessage('');
  };

  const handleCallHelpline = () => {
    if (!activeCategory) return;
    const category = categories.find(c => c.id === activeCategory);
    if (category) {
      window.open(`tel:${category.smsNumber}`, '_self');
    }
  };

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
            onClick={() => { setActiveCategory(cat.id); setMessage(''); }}
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
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Complaint Details</p>
            <textarea
              className="w-full p-3 bg-white rounded-xl text-xs font-bold outline-none border-2 border-transparent focus:border-blue-500 text-slate-700"
              placeholder={`Describe your ${categories.find(c => c.id === activeCategory)?.label.toLowerCase()} issue...`}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleLodgeComplaint}
              className="flex-1 bg-blue-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors"
            >
              <MessageSquare size={18} />
              SMS Complaint
            </button>

            <button
              onClick={handleCallHelpline}
              className="w-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center hover:bg-red-200 transition-colors"
              title={`Call Helpline (${categories.find(c => c.id === activeCategory)?.smsNumber})`}
            >
              <Phone size={20} />
            </button>
          </div>
          <p className="text-[9px] text-center text-slate-400 font-medium px-2">
            Clicking will open your default app with pre-filled details for {categories.find(c => c.id === activeCategory)?.smsNumber}.
          </p>
        </div>
      )}
    </div>
  );
};