import React from 'react';
import { Bell, Train } from 'lucide-react';
import type { LiveUser, ExchangeData } from '../types/types';

interface CoachSelectorProps {
    coaches: string[];
    activeCoach: string;
    onSelectCoach: (coach: string) => void;
    userCoach: string;
    livePeers?: LiveUser[];
    incomingRequests?: ExchangeData[];
    onIncomingClick?: () => void;
}

export const CoachSelector: React.FC<CoachSelectorProps> = ({
    coaches,
    activeCoach,
    onSelectCoach,
    userCoach,
    livePeers = [],
    incomingRequests = [],
    onIncomingClick
}) => {
    if (coaches.length <= 1) return null;

    // Total live count across all coaches for the header
    const totalLiveCount = livePeers.length;

    return (
        <div className="bg-[#0d121f] py-1.5 rounded-t-2xl border border-white/5 shadow-xl relative overflow-hidden">
            {/* Header Area */}
            <div className="flex justify-between items-center mb-1.5 px-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/5 rounded-lg text-blue-400">
                        <Train size={14} />
                    </div>
                    <div>
                        <h2 className="text-white font-bold tracking-wide text-xs">Select Coach</h2>
                        <p className="text-gray-500 text-[9px] uppercase font-bold tracking-widest">AC 3-Tier</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-green-500/10 text-green-500 px-2 py-1 rounded-md text-[9px] font-bold border border-green-500/20">
                        <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span> {totalLiveCount} LIVE (3A)
                    </div>
                    {incomingRequests.length > 0 && onIncomingClick && (
                        <button
                            onClick={onIncomingClick}
                            className="flex items-center gap-1 text-[9px] font-black text-white bg-orange-700/20 border border-orange-700/50 px-2 py-1 rounded-md hover:bg-orange-800/30 transition-colors uppercase tracking-tight animate-[pulse_5s_ease-in-out_infinite]"
                        >
                            <Bell size={10} className="text-orange-400" />
                            <span className="text-orange-400 uppercase">{incomingRequests.length} Incomming</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Horizontal Coach Selector Boxes */}
            <div className="relative w-full overflow-x-auto scrollbar-hide px-3 pb-1" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .scrollbar-hide::-webkit-scrollbar { display: none; }
                `}} />

                <div className="flex items-center w-max gap-2">
                    {coaches.map((coach) => {
                        const isSelected = activeCoach === coach;
                        const isUserCoach = userCoach === coach;
                        const coachLiveCount = livePeers.filter(p => p.coach === coach).length;
                        const hasIncoming = incomingRequests.some(req => (req.startCoach || req.requester?.coach || userCoach) === coach);

                        // Base classes for the simple rounded box
                        let boxClass = "relative flex flex-col items-center justify-center mt-1 w-12 h-12 rounded-xl border transition-all cursor-pointer overflow-hidden ";

                        // Text styling inside the box
                        let textClass = "text-sm font-black z-10 ";

                        if (hasIncoming) {
                            boxClass += "bg-orange-500/20 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)] scale-110 animate-[pulse_2s_ease-in-out_infinite] ring-2 ring-orange-400 z-20 ";
                            textClass += "text-orange-400";
                        } else if (isUserCoach) {
                            // User's own coach: Green styling with slightly different shape (more rounded)
                            boxClass += isSelected
                                ? "bg-green-600/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] rounded-3xl scale-105"
                                : "bg-[#1a2133] border-green-500/50 hover:border-green-400 rounded-3xl";
                            textClass += "text-green-400";
                        } else if (isSelected) {
                            // Selected other coach: Blue styling
                            boxClass += "bg-blue-600/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105";
                            textClass += "text-blue-400";
                        } else {
                            // Unselected other coach: Default dark flat styling
                            boxClass += "bg-[#1a2133] border-white/10 hover:border-white/30 hover:bg-[#232b42]";
                            textClass += "text-slate-300";
                        }

                        return (
                            <button
                                key={coach}
                                onClick={() => onSelectCoach(coach)}
                                className="group relative flex flex-col items-center gap-1"
                            >
                                <div className={boxClass}>
                                    {/* The coach name (e.g. B1) perfectly centered in the box */}
                                    <span className={textClass}>{coach}</span>

                                    {/* Subtle internal highlight line for depth */}
                                    <div className="absolute top-0 inset-x-2 h-[1px] bg-white/10 rounded-full" />
                                </div>

                                {/* Indicators below the box */}
                                <div className="flex gap-1 h-3 items-center mt-0.5">
                                    {isUserCoach && (
                                        <span className="text-[8px] font-black text-green-500 uppercase tracking-widest bg-green-500/10 px-1 py-0.5 rounded flex items-center">

                                        </span>
                                    )}

                                    {coachLiveCount > 0 && !isUserCoach && (
                                        <div className="flex items-center gap-1 bg-green-500/10 px-1 py-0.5 rounded border border-green-500/20">
                                            <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                                            <span className="text-[8px] font-bold text-green-500">{coachLiveCount}</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};
