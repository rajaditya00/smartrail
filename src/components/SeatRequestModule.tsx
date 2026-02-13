import { useState, useEffect } from 'react';
import { CoachVisuals } from './CoachVisuals';
import { Radio, XCircle, ChevronRight, CheckCircle2, Info, Send, Timer, Train } from 'lucide-react';
import type { RequestStatus, LiveUser, ExchangeData } from '../types/types';

interface Props {
  status: RequestStatus;
  currentSeat: number;
  userClass: string;
  userCoach: string;

  onInitiateRequest: (target: LiveUser) => void;
  livePeers: LiveUser[];
  isLive: boolean;
  activeExchange: ExchangeData | null;
  exchangeHistory?: ExchangeData[];
  sentRequests?: string[];
  incomingRequest?: ExchangeData | null;
  onAcceptRequest?: () => void;
  onRejectRequest?: () => void;
  onCancelExchange: () => void;
  onGoLive: (preferences?: any) => void;
  onStopLive: () => void;
}

export const SeatRequestModule = ({
  status,
  currentSeat,
  userClass,
  userCoach,

  onInitiateRequest,
  livePeers,
  isLive,
  activeExchange,
  exchangeHistory = [],
  sentRequests = [],
  incomingRequest,
  onAcceptRequest,
  onRejectRequest,
  onCancelExchange,
  onGoLive,
  onStopLive
}: Props) => {
  const [showPreferenceSelection, setShowPreferenceSelection] = useState(false);
  const [selectedSeatType, setSelectedSeatType] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const seatTypes = ['Lower', 'Middle', 'Upper', 'Side Lower', 'Side Upper', 'Any'];
  const reasons = ['Traveling with Elderly', 'Medical Condition', 'Family Seating', 'Personal Comfort', 'Other'];

  const relevantPeers = livePeers.filter(p =>
    p.class === userClass &&
    p.coach === userCoach &&
    p.seatNo !== currentSeat
  );

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (status === 'approved' && activeExchange && activeExchange.expiresAt) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const end = new Date(activeExchange.expiresAt!).getTime();
        const distance = Math.floor((end - now) / 1000);
        if (distance < 0) {
          setTimeLeft(0);
        } else {
          setTimeLeft(distance);
        }
      };

      updateTimer();
      timer = setInterval(updateTimer, 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [status, activeExchange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartBroadcast = () => {
    setShowPreferenceSelection(false);
    onGoLive({ type: selectedSeatType, reason: selectedReason });
  };

  return (
    <div className="space-y-6">
      <CoachVisuals
        status={status}
        currentSeat={currentSeat}
        otherBroadcasters={relevantPeers.map(p => p.seatNo)}
        coachName={`Coach ${userCoach}`}
      />

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-black text-slate-800">Smart Exchange Hub</h2>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest italic">
              {userClass} Live Manifest • Coach {userCoach}
            </p>
          </div>

          {status === 'idle' && !showPreferenceSelection && (
            <button
              onClick={() => setShowPreferenceSelection(true)}
              className="bg-blue-900 text-white px-5 py-2.5 rounded-full text-[10px] font-black shadow-lg shadow-blue-900/20 flex items-center gap-2 hover:bg-blue-800 transition-all"
            >
              <Radio size={14} className="animate-pulse" /> BROADCAST REQUEST
            </button>
          )}
        </div>

        {/* 0. EXCHANGE HISTORY (Shortened) */}
        {status === 'idle' && exchangeHistory.length > 0 && (
          <div className="mb-6 space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previous Exchanges</h3>

            {exchangeHistory.map((ex, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black text-slate-500">Completed</p>
                    <p className="text-xs font-bold text-slate-800">
                      Seat {ex.startSeat} <span className="text-slate-400 mx-1">➜</span> Seat {ex.endSeat}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {new Date(ex.expiresAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 1. SEAT PREFERENCE SELECTION VIEW */}
        {showPreferenceSelection && status === 'idle' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Preferred Seat Type</label>
              <div className="grid grid-cols-3 gap-2">
                {seatTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedSeatType(type)}
                    className={`py-3 rounded-xl text-[10px] font-bold border-2 transition-all ${selectedSeatType === type
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-slate-100 text-slate-500 bg-slate-50 hover:border-slate-300'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Exchange</label>
              <div className="grid grid-cols-1 gap-2">
                {reasons.map(reason => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`p-4 rounded-2xl text-left text-xs font-bold border-2 transition-all flex justify-between items-center ${selectedReason === reason
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-slate-100 text-slate-500 bg-slate-50 hover:border-slate-300'
                      }`}
                  >
                    {reason}
                    {selectedReason === reason && <ChevronRight size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowPreferenceSelection(false)}
                className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase"
              >
                Cancel
              </button>
              <button
                disabled={!selectedSeatType || !selectedReason}
                onClick={handleStartBroadcast}
                className="flex-[2] py-4 bg-blue-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-blue-900/20"
              >
                Confirm & Broadcast
              </button>
            </div>
          </div>
        )}

        {/* 1.5 INCOMING REQUEST BANNER (Restoring details non-blocking) */}
        {incomingRequest && incomingRequest.requester && (
          <div className="bg-blue-900/5 border-l-4 border-blue-900 p-4 rounded-r-xl mb-6 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1">Incoming Request</h3>
                <p className="text-xs font-bold text-slate-700">
                  <span className="text-blue-700">{incomingRequest.requester.name}</span> wants to swap
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                  Their Seat <span className="text-slate-900">{incomingRequest.requester.seatNo}</span> <span className="text-slate-400">➜</span> Your Seat <span className="text-slate-900">{currentSeat}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onAcceptRequest && onAcceptRequest()}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-lg shadow-green-900/10 active:scale-95 transition-all"
                >
                  <CheckCircle2 size={16} />
                </button>
                <button
                  onClick={() => onRejectRequest && onRejectRequest()}
                  className="p-2 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300 hover:text-red-600 active:scale-95 transition-all"
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. LIVE LIST VIEW (WITH ENHANCED RADAR) */}
        {status === 'broadcasting' && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-3xl border-2 border-green-200 mb-4 flex items-start gap-3 shadow-sm animate-in zoom-in-95 duration-300">
              <div className="relative flex items-center justify-center mt-1">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute" />
                <Radio size={16} className="text-green-600 relative z-10" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-green-700 font-black uppercase tracking-tighter">Live Broadcast Active</p>
                <p className="text-[11px] text-slate-700 font-bold leading-tight mt-0.5">
                  Searching for <span className="text-blue-700">{selectedSeatType}</span> seat • <span className="text-slate-500 italic">{selectedReason}</span>
                </p>
              </div>
              <button
                onClick={onStopLive}
                className="p-2 bg-white rounded-xl shadow-sm text-red-500 hover:bg-red-50 transition-colors border border-slate-100"
              >
                <XCircle size={16} />
              </button>
            </div>

            {relevantPeers.length > 0 ? (
              <div className="space-y-3">
                {relevantPeers.map((peer, idx) => (
                  <div key={peer.socketId || idx} className="group flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-100 hover:border-blue-500/50 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-black text-xs border border-blue-100">
                        {peer.seatNo}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800">{peer.passengerName}</p>
                        <div className="text-[10px] text-blue-600 font-bold uppercase flex flex-col items-start gap-1 mt-1">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span>Looking for: <span className="text-blue-800 font-black">{peer.preferences?.type || "Any Seat"}</span></span>
                          </div>
                          {peer.preferences?.reason && (
                            <span className="text-slate-500 normal-case italic pl-2.5 border-l-2 border-slate-200">
                              "{peer.preferences.reason}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {peer.socketId === incomingRequest?.requesterSocketId ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onAcceptRequest && onAcceptRequest()}
                          className="px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all shadow-lg shadow-green-900/10 flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 active:scale-95"
                        >
                          Accept <CheckCircle2 size={12} />
                        </button>
                        <button
                          onClick={() => onRejectRequest && onRejectRequest()}
                          className="px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all shadow-lg shadow-red-900/10 flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 active:scale-95"
                        >
                          Reject <XCircle size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (!sentRequests.includes(peer.socketId)) {
                            onInitiateRequest(peer);
                          }
                        }}
                        disabled={sentRequests.includes(peer.socketId)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all shadow-lg shadow-blue-900/10 flex items-center gap-2 ${sentRequests.includes(peer.socketId)
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                          }`}
                      >
                        {sentRequests.includes(peer.socketId) ? (
                          <>Request Sent <CheckCircle2 size={12} /></>
                        ) : (
                          <>Exchange <Send size={12} /></>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center flex flex-col items-center justify-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="relative mb-6">
                  <div className="w-24 h-24 border-2 border-blue-500/20 rounded-full animate-[ping_3s_linear_infinite]" />
                  <div className="w-24 h-24 border-2 border-blue-400/40 rounded-full animate-[ping_2s_linear_infinite] absolute top-0" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-blue-100">
                    <Radio size={28} className="text-blue-600 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Scanning Coach {userClass}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-2 animate-pulse">Waiting for peers...</p>
                {!isLive && <p className="text-[9px] text-red-400 mt-2 font-bold">(You are not live)</p>}
              </div>
            )}
          </div>
        )}

        {/* 3. PENDING STATE */}
        {status === 'pending' && (
          <div className="py-20 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Send size={32} className="text-blue-600 animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Processing Exchange</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Updating IRCTC Digital Manifest...</p>
            </div>
          </div>
        )}

        {/* 4. POST-SWAP VIEW (DIGITAL TICKET) */}
        {status === 'approved' && (
          <div className="animate-in slide-in-from-bottom-10 fade-in duration-700">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-bounce">
                <CheckCircle2 size={12} /> Seat Re-Assigned
              </div>
            </div>

            <div className="bg-[#00205B] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10">
              <div className="p-6 border-b border-dashed border-white/20 relative">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-300 text-[9px] font-black uppercase tracking-widest mb-1">Boarding Pass</p>
                    <h3 className="text-white text-lg font-black leading-tight">RAJDHANI EXP</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-300 text-[9px] font-black uppercase mb-1">Class</p>
                    <p className="text-white text-xs font-bold">{userClass}</p>
                  </div>
                </div>
                <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-white rounded-full" />
                <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-white rounded-full" />
              </div>

              <div className="p-8 bg-gradient-to-br from-[#00205B] to-[#003399] flex items-center justify-around relative">
                <div className="text-center">
                  <p className="text-blue-300 text-[8px] font-black uppercase mb-2 opacity-60">Previous</p>
                  <div className="text-2xl font-black text-white/40 line-through decoration-red-500/50">
                    --
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
                  <Train size={20} className="text-blue-400 animate-pulse" />
                  <div className="h-[2px] w-12 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
                </div>

                <div className="text-center">
                  <p className="text-orange-400 text-[8px] font-black uppercase mb-2">New Seat</p>
                  <div className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-in zoom-in-125 duration-500 delay-300">
                    {currentSeat}
                  </div>
                  <p className="text-orange-400 text-[9px] font-black mt-1 uppercase tracking-tighter">Coach {userClass.split(' ')[0]}</p>
                </div>
              </div>

              <div className="p-6 bg-white">
                <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <Info size={16} className="text-blue-600 shrink-0" />
                  <p className="text-[10px] text-slate-500 font-bold leading-tight uppercase text-left">
                    Manifest updated. please vacate your old seat immediately.
                  </p>
                </div>

                {timeLeft > 0 ? (
                  <button
                    onClick={onCancelExchange}
                    className="w-full py-4 rounded-2xl bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Timer size={14} /> Cancel Exchange ({formatTime(timeLeft)})
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full py-4 rounded-2xl bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest cursor-not-allowed"
                  >
                    Exchange Finalized
                  </button>
                )}
              </div>
            </div>

            <p className="text-center mt-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Automated sync in progress
            </p>
          </div>
        )}
      </div>
    </div>
  );
};