import React from 'react';
import { User, Radio } from 'lucide-react';
import type { RequestStatus } from '../types/types';

interface CoachVisualsProps {
  status: RequestStatus;
  currentSeat: number;
  otherBroadcasters?: number[];
  coachName: string;
}

export const CoachVisuals: React.FC<CoachVisualsProps> = ({
  status,
  currentSeat,
  otherBroadcasters = [],
  coachName
}) => {
  const seats = Array.from({ length: 72 }, (_, i) => i + 1);
  const liveCount = otherBroadcasters.length + (status === 'broadcasting' ? 1 : 0);

  return (
    <div className="bg-slate-900 overflow-hidden border-4 border-slate-800 shadow-2xl rounded-2xl">
      <div className="p-4 bg-slate-800/80 flex justify-between items-center border-b border-slate-700">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{coachName} Live Map</span>
        </div>

        {/* STYLISH RED LIVE COUNTER */}
        <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)">
          <div className="relative flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping absolute opacity-75" />
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full relative" />
          </div>
          <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">
            {liveCount} Live
          </span>
        </div>
      </div>

      <div className="h-60 overflow-y-auto p-4 bg-slate-900 scrollbar-hide">
        <div className="grid grid-cols-6 gap-2">
          {seats.map((s) => {
            const isMe = s === currentSeat;
            const isNewlySwapped = isMe && status === 'approved';
            const isBroadcasting = isMe && status === 'broadcasting';
            const isOtherBroadcast = otherBroadcasters.includes(s);

            return (
              <div
                key={s}
                className={`h-10 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all duration-700 border-2 ${isNewlySwapped ? 'bg-green-600 border-green-300 text-white animate-bounce shadow-[0_0_20px_rgba(34,197,94,0.6)] z-20' :
                    isMe ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] z-10' :
                      isOtherBroadcast || isBroadcasting ? 'bg-green-500 border-green-300 text-white' :
                        'bg-slate-800/40 border-slate-700 text-slate-600'
                  }`}
              >
                {isMe ? (
                  <div className="relative flex items-center justify-center">
                    <User size={12} strokeWidth={3} />
                  </div>
                ) : (isOtherBroadcast || isBroadcasting) ? (
                  <Radio size={10} className="animate-pulse" />
                ) : (
                  s
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 bg-slate-800/50 text-[8px] text-slate-500 flex justify-around border-t border-slate-700 font-black">
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full" /> YOUR SEAT</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> AVAILABLE SWAP</div>
      </div>
    </div>
  );
};