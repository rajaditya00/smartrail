import { Radio } from 'lucide-react';
import type { RequestStatus } from '../types/types';

export interface CoachVisualsProps {
    status: RequestStatus;
    currentSeat: number;
    otherBroadcasters: number[];
    incomingSeats: number[];
    coachName: string;
    onLiveSeatClick: (seatNo: number) => void;
}

export const CoachVisuals = ({
    status,
    currentSeat,
    otherBroadcasters,
    incomingSeats,
    coachName,
    onLiveSeatClick
}: CoachVisualsProps) => {

    // Generate 72 seats (9 bays of 8 seats each)
    const totalSeats = 72;
    const seatsPerBay = 8;
    const totalBays = totalSeats / seatsPerBay;

    const seatGroups = Array.from({ length: totalBays }).map((_, i) => {
        const start = i * seatsPerBay + 1;
        return {
            mainTop: [start, start + 1, start + 2],
            mainBottom: [start + 3, start + 4, start + 5],
            sideTop: start + 6,
            sideBottom: start + 7,
        };
    });

    const getMainLabel = (num: number) => {
        const rem = num % 8;
        if (rem === 1 || rem === 4) return "LOWER";
        if (rem === 2 || rem === 5) return "MIDDLE";
        if (rem === 3 || rem === 6) return "UPPER";
        return "";
    };

    const getSideLabel = (num: number) => {
        const rem = num % 8;
        if (rem === 7) return "S.LOWER";
        if (rem === 0) return "S.UPPER";
        return "";
    };

    const renderSeat = (num: number, label: string, isReversed: boolean = false) => {
        const isLive = otherBroadcasters.includes(num);
        const isIncoming = incomingSeats.includes(num);
        const isCurrent = currentSeat === num;

        let boxStyles = "bg-transparent border-[#2D3142] text-[#F3F4F6] hover:border-[#4B526D]";
        let labelStyles = "text-[#8E95A8]";

        if (isCurrent) {
            boxStyles = "bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] z-10 scale-105 relative";
            labelStyles = "text-blue-400 font-black";
        } else if (isIncoming) {
            boxStyles = "bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)] z-10 scale-105 relative ring-2 ring-orange-400";
            labelStyles = "text-orange-400 font-black";
        } else if (isLive) {
            boxStyles = "bg-green-600/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] z-10 scale-105 relative";
            labelStyles = "text-green-400 font-black";
        }

        let seatShape = "rounded-[0.7rem]";
        if (isCurrent) {
            seatShape = "rounded-[2rem]"; // Distinct circular/pill shape for own seat
        }

        const seatBox = (
            <div className={`w-12 h-12 sm:w-[3.5rem] sm:h-[3.5rem] rounded-[0.7rem] flex items-center justify-center border transition-all ${boxStyles}`}>
                {(isLive && !isCurrent && !isIncoming) ? (
                    <Radio size={24} className="text-green-500 animate-pulse drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                ) : (
                    <span className="text-[1.2rem] sm:text-[1.4rem] font-bold leading-none">{num}</span>
                )}
            </div>
        );

        const seatLabel = (
            <span className={`text-[8px] sm:text-[9px] font-bold tracking-widest uppercase ${labelStyles}`}>
                {label}
            </span>
        );

        return (
            <div
                key={num}
                className="flex flex-col items-center gap-1.5 cursor-pointer transition-transform hover:-translate-y-0.5"
                onClick={() => (isLive || isIncoming) && onLiveSeatClick(num)}
            >
                {isReversed ? (
                    <>
                        {seatLabel}
                        {seatBox}
                    </>
                ) : (
                    <>
                        {seatBox}
                        {seatLabel}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="w-full h-[550px] flex flex-col bg-[#0d121f] font-sans text-white rounded-t-2xl overflow-hidden shadow-2xl border border-white/5 border-t-0">
            {/* Header Area (Fixed at top) */}
            <div className="w-full px-6 py-5 bg-[#141b2d] flex justify-between items-center relative z-20 shrink-0 border-b border-white/5 shadow-md">
                <div className="text-left">
                    <h2 className="text-[15px] sm:text-[17px] font-bold tracking-wide text-white">{coachName} - AC 3-Tier</h2>
                    <p className="text-slate-400 text-[9px] sm:text-[10px] font-bold tracking-[0.1em] uppercase mt-1">LIVE STATUS • 72 SEATS</p>
                </div>

                {/* Live Count */}
                <div className="bg-green-500/10 border border-green-500/20 text-green-500 px-3 py-2 rounded-md text-[10px] sm:text-xs font-bold tracking-wider flex items-center gap-2 uppercase">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                    {otherBroadcasters.length} LIVE
                </div>
            </div>

            {/* Main Seat Map Area (Scrollable) */}
            <div className="w-full flex-1 overflow-y-auto p-2 sm:p-4 relative z-10 custom-scrollbar bg-[#0d121f]">
                <div className="flex flex-col w-full max-w-[500px] mx-auto pb-8">
                    {seatGroups.map((group, idx) => (
                        <div key={idx} className="flex justify-between w-full mb-2">
                            {/* Main Cabin pair */}
                            <div className="w-[65%] border-2 border-white/10 rounded-2xl relative p-4 flex flex-col justify-between" style={{ minHeight: '180px' }}>
                                {/* Top edge inner curve hint */}
                                <div className="absolute top-0 left-4 right-4 h-1 border-t-2 border-white/10 opacity-50"></div>
                                <div className="absolute top-4 left-0 w-2 h-8 border-l-2 border-y-2 rounded-r-xl border-white/10 bg-[#0d121f] -ml-[2px]"></div>
                                <div className="absolute top-4 right-0 w-2 h-8 border-r-2 border-y-2 rounded-l-xl border-white/10 bg-[#0d121f] -mr-[2px]"></div>

                                <div className="grid grid-cols-3 gap-x-2 w-full justify-items-center mb-6">
                                    {group.mainTop.map(num => renderSeat(num, getMainLabel(num), false))}
                                </div>
                                <div className="grid grid-cols-3 gap-x-2 w-full justify-items-center">
                                    {group.mainBottom.map(num => renderSeat(num, getMainLabel(num), true))}
                                </div>

                                {/* Bottom edge inner curve hint */}
                                <div className="absolute bottom-0 left-4 right-4 h-1 border-b-2 border-white/10 opacity-50"></div>
                                <div className="absolute bottom-4 left-0 w-2 h-8 border-l-2 border-y-2 rounded-r-xl border-white/10 bg-[#0d121f] -ml-[2px]"></div>
                                <div className="absolute bottom-4 right-0 w-2 h-8 border-r-2 border-y-2 rounded-l-xl border-white/10 bg-[#0d121f] -mr-[2px]"></div>
                            </div>

                            {/* Side Berths pair */}
                            <div className="w-[30%] border-2 border-white/10 rounded-2xl relative p-4 flex flex-col justify-between items-center" style={{ minHeight: '180px' }}>
                                {/* Top edge inner curve hint */}
                                <div className="absolute top-0 left-4 right-4 h-1 border-t-2 border-white/10 opacity-50"></div>
                                <div className="absolute top-4 left-0 w-2 h-8 border-l-2 border-y-2 rounded-r-xl border-white/10 bg-[#0d121f] -ml-[2px]"></div>
                                <div className="absolute top-4 right-0 w-2 h-8 border-r-2 border-y-2 rounded-l-xl border-white/10 bg-[#0d121f] -mr-[2px]"></div>

                                {renderSeat(group.sideTop, getSideLabel(group.sideTop), false)}
                                {renderSeat(group.sideBottom, getSideLabel(group.sideBottom), true)}

                                {/* Bottom edge inner curve hint */}
                                <div className="absolute bottom-0 left-4 right-4 h-1 border-b-2 border-white/10 opacity-50"></div>
                                <div className="absolute bottom-4 left-0 w-2 h-8 border-l-2 border-y-2 rounded-r-xl border-white/10 bg-[#0d121f] -ml-[2px]"></div>
                                <div className="absolute bottom-4 right-0 w-2 h-8 border-r-2 border-y-2 rounded-l-xl border-white/10 bg-[#0d121f] -mr-[2px]"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Legend */}
            <div className="w-full px-4 py-3 bg-[#141b2d] flex justify-center items-center gap-4 border-t border-white/5 shadow-md flex-wrap shrink-0 pb-6 relative z-10">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-600/20 border border-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.3)]"></div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Your Seat</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-green-600/20 border border-green-500 shadow-[0_0_5px_rgba(34,197,94,0.3)]"></div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Available Swap</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-orange-500/20 border border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)] animate-pulse"></div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide">Incoming Request</span>
                </div>
            </div>
        </div>
    );
};
