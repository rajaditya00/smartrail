import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Radio, XCircle, ChevronRight, CheckCircle2, Info, Send, Timer, Train, ArrowUpCircle, Download } from 'lucide-react';
import { CoachVisuals } from './CoachVisuals';
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
  incomingRequests?: ExchangeData[];
  onAcceptRequest?: (exchangeId: string) => void;
  onRejectRequest?: (exchangeId: string) => void;
  onCancelExchange: () => void;
  onGoLive: (preferences?: any) => void;
  onStopLive: () => void;
  onCancelSentRequest?: (targetId: string) => void;
  // User Details for Ticket
  userName?: string;
  userPnr?: string;
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
  incomingRequests = [],
  onAcceptRequest,
  onRejectRequest,
  onCancelExchange,
  onGoLive,
  onStopLive,
  onCancelSentRequest,
  userName = "Passenger",
  userPnr = "N/A"
}: Props) => {
  const [showPreferenceSelection, setShowPreferenceSelection] = useState(false);
  const [selectedSeatType, setSelectedSeatType] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const seatTypes = ['Lower', 'Middle', 'Upper', 'Side Lower', 'Side Upper', 'Any'];
  const reasons = ['Traveling with Elderly', 'Medical Condition', 'Family Seating', 'Personal Comfort', 'Other'];

  const relevantPeers = livePeers.filter(p =>
    p.class === userClass &&
    // Allow cross-coach exchange (same class)
    // p.coach === userCoach && 
    p.seatNo !== currentSeat
  );


  // Determine Display Coach (Switch to new coach if approved)
  let displayCoach = userCoach;
  if (status === 'approved' && activeExchange) {
    // If I am Requester (my new seat is requesterNewSeat), I moved to Target's Coach (endCoach)
    // If I am Target (my new seat is targetNewSeat), I moved to Requester's Coach (startCoach)
    if (activeExchange.swappedSeat?.requesterNewSeat === currentSeat) {
      displayCoach = activeExchange.endCoach || userCoach;
    } else {
      displayCoach = activeExchange.startCoach || userCoach;
    }
  }

  const sameCoachPeers = relevantPeers.filter(p => p.coach === displayCoach);

  const incomingRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadTicket = async (ex: ExchangeData) => {
    console.log("Starting PDF generation for exchange:", ex.exchangeId);
    console.log("Starting PDF generation (Iframe Mode) for:", ex.exchangeId);

    // 1. Create a hidden Iframe to isolate styles (Fixes 'oklch' error)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '800px'; // Ensure sufficient width
    iframe.style.height = '1200px';
    iframe.style.opacity = '0'; // Invisible
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-1000';
    document.body.appendChild(iframe);

    // 2. Define Ticket HTML
    const startCoachLabel = ex.startCoach ? `(Coach ${ex.startCoach})` : ex.startSeat ? `(Coach ${userCoach})` : '';
    const endCoachLabel = ex.endCoach ? `(Coach ${ex.endCoach})` : `(Coach ${userCoach})`;

    // HTML Content - Self-contained styles, NO external CSS
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket</title>
        <style>
          /* Reset defaults to avoid browser inconsistencies */
          body { 
            margin: 0; 
            padding: 40px; 
            font-family: 'Courier New', Courier, monospace; 
            background: #ffffff; 
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body>
        <div id="ticket-content" style="background: white; padding: 40px; width: 680px; border: 4px solid #00205B; position: relative; color: #333333; margin-top: 10px; margin-left: 10px; margin-right: 10px; margin-bottom: 30px; box-shadow: 0 0 0 10px #f0f4f8; ">
          
          <div style="text-align: center; border-bottom: 2px solid #00205B; padding-bottom: 20px; margin-bottom: 30px;  ">
            <div style="font-size: 28px; font-weight: 900; color: #00205B; text-transform: uppercase; letter-spacing: 2px;">Smart Rail</div>
            <div style="font-size: 18px; font-weight: bold; color: #666666; margin-top: 10px; text-transform: uppercase; letter-spacing: 4px;">Seat Exchange Receipt</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
            <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
               <div style="font-size: 10px; color: #888888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Passenger Name</div>
               <div style="font-size: 16px; font-weight: bold; color: #000000;">${userName}</div>
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
               <div style="font-size: 10px; color: #888888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">PNR Number</div>
               <div style="font-size: 16px; font-weight: bold; color: #000000;">${userPnr}</div>
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
               <div style="font-size: 10px; color: #888888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Exchange ID</div>
               <div style="font-size: 16px; font-weight: bold; color: #000000;">#${ex.exchangeId.slice(-8).toUpperCase()}</div>
            </div>
            <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
               <div style="font-size: 10px; color: #888888; text-transform: uppercase; font-weight: bold; margin-bottom: 5px;">Date & Time</div>
               <div style="font-size: 16px; font-weight: bold; color: #000000;">${new Date(ex.expiresAt!).toLocaleString()}</div>
            </div>
          </div>

          <div style="background: #f8fafc; border: 2px dashed #00205B; padding: 30px; margin: 30px 0; text-align: center; border-radius: 10px;">
            <div style="font-weight: bold; color: #00205B; text-transform: uppercase; margin-bottom: 20px; font-size: 14px; letter-spacing: 2px;">Seat Reassignment Details</div>
            
            <div style="display: flex; align-items: center; justify-content: center; gap: 40px;">
               <div style="text-align: center;">
                  <div style="font-size: 12px; color: #666666; text-transform: uppercase; font-weight: bold;">Old Seat</div> 
                  <div style="font-size: 42px; font-weight: 900; color: #64748b; line-height: 1;">${ex.startSeat}</div>
                  <div style="font-size: 12px; color: #ef4444; font-weight: bold; margin-top: 5px;">${startCoachLabel}</div>
               </div>
               
               <div style="font-size: 30px; color: #00205B;">➡</div>
               
               <div style="text-align: center;">
                  <div style="font-size: 12px; color: #00205B; text-transform: uppercase; font-weight: bold;">New Seat</div>
                  <div style="font-size: 42px; font-weight: 900; color: #00205B; line-height: 1;">${ex.endSeat}</div>
                  <div style="font-size: 12px; color: #22c55e; font-weight: bold; margin-top: 5px;">${endCoachLabel}</div>
               </div>
            </div>
            
            <div style="font-size: 14px; color: #00205B; font-weight: bold; margin-top: 20px; border-top: 1px solid #e2e8f0; pt-4; display: inline-block; padding-top: 10px;">
              Journey Class: ${userClass}
            </div>
          </div>

          <div style="border-top: 2px solid #00205B; padding-top: 20px; margin-top: 30px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px;">
              <span style="font-weight: bold; color: #666666; text-transform: uppercase;">Reassignment Reason</span>
              <span style="font-weight: bold; color: #000000; text-transform: uppercase;">${ex.requester?.reason || 'Mutual Agreement'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px;">
              <span style="font-weight: bold; color: #666666; text-transform: uppercase;">Original Preference</span>
              <span style="font-weight: bold; color: #000000; text-transform: uppercase;">${ex.requester?.preference || 'N/A'}</span>
            </div>
          </div>

          <div style="position: absolute; bottom: 80px; right: 40px; border: 4px solid #22c55e; color: #22c55e; padding: 10px 20px; font-weight: 900; text-transform: uppercase; font-size: 20px; transform: rotate(-10deg); letter-spacing: 4px; text-align: center; opacity: 0.9; background: rgba(255,255,255,0.9);">
            VERIFIED
            <div style="font-size: 12px; letter-spacing: 1px; color: #22c55e; border-top: 1px solid #22c55e; margin-top: 5px; padding-top: 5px;">Smart Rail System</div>
          </div>

          <div style="margin-top: 60px; font-size: 10px; text-align: center; color: #888888; border-top: 1px solid #eeeeee; padding-top: 15px; font-style: italic;">
            This document is a computer-generated receipt for a third-party seat exchange facilitated by the Smart Rail System.<br>
            It serves as proof of seat reassignment within the same journey class.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      // 3. Write to Iframe
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) throw new Error("Iframe document not accessible");

      doc.open();
      doc.write(htmlContent);
      doc.close();

      // Ensure Images/Fonts load (if any) - Small delay is usually enough for simple content
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = doc.getElementById('ticket-content');
      if (!element) throw new Error("Ticket content not found in iframe");

      // 4. Generate Canvas
      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff'
      });
      console.log("Canvas generated from Iframe");

      // 5. Save PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SmartRail_Ticket_${ex.exchangeId.slice(-6).toUpperCase()}.pdf`);

    } catch (err) {
      console.error("PDF Generation failed:", err);
      // alert("Failed to generate PDF ticket.");
    } finally {
      // 6. Cleanup
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }
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
        otherBroadcasters={sameCoachPeers.map(p => p.seatNo)}
        coachName={`Coach ${displayCoach}`}
      />

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-black text-slate-800">Smart Exchange Hub</h2>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest italic">
              {userClass} Live Manifest • Coach {displayCoach}
            </p>
          </div>

          {status === 'idle' && !showPreferenceSelection && incomingRequests.length === 0 && (
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
                      Seat {ex.startSeat} <span className="text-slate-400 font-normal">({ex.startCoach || userCoach})</span>
                      <span className="text-slate-400 mx-1">➜</span>
                      Seat {ex.endSeat} <span className="text-blue-600 font-black">({ex.endCoach || userCoach})</span>
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    {new Date(ex.expiresAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => handleDownloadTicket(ex)}
                    className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors uppercase tracking-tight"
                  >
                    <Download size={10} /> Receipt
                  </button>
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

        {/* 1.5 INCOMING REQUESTS LIST (Multi-Request Support) - COMPACT */}
        {incomingRequests.length > 0 && (
          <div ref={incomingRef} className="space-y-3 mb-6 bg-blue-50/50 p-4 rounded-3xl border border-blue-100">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest pl-1">Incoming Requests</h3>
            {incomingRequests.map((request) => (
              <div key={request.exchangeId} className="bg-white p-3 rounded-2xl border-l-[4px] border-blue-500 shadow-sm flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">New</span>
                    {request.startCoach && request.startCoach !== userCoach && (
                      <span className="bg-orange-100 text-orange-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide">
                        Coach {request.startCoach}
                      </span>
                    )}
                    <h3 className="font-black text-slate-800 text-sm truncate leading-tight">
                      {request.requester?.name || "Passenger"}
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold leading-tight flex flex-wrap items-center gap-1.5">
                    From <span className="text-purple-500/70 ml-0.5 font-bold">(Coach {request.startCoach || userCoach})</span>Looking for: <span className="text-blue-600 font-black uppercase">{request.requester?.preference || "Any Seat"}</span>
                    {/* Show Coach if different */}
                    {request.startCoach && request.startCoach !== userCoach && (
                      <span className="text-orange-500 font-black ml-1">(Coach {request.startCoach})</span>
                    )}
                    {/* Show Reason Badge Prominently */}
                    {request.requester?.reason && (
                      <span className="text-slate-500 normal-case italic pl-2.5 border-l-2 border-slate-200">
                        {request.requester.reason}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onRejectRequest && onRejectRequest(request.exchangeId!)}
                    className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                    title="Decline"
                  >
                    <XCircle size={16} />
                  </button>
                  <button
                    onClick={() => onAcceptRequest && onAcceptRequest(request.exchangeId!)}
                    className="px-3 py-2 rounded-xl bg-blue-600 text-white font-bold text-[10px] uppercase tracking-wide hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95 flex items-center gap-1"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
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
                        {peer.coach !== userCoach && (
                          <p className="text-[9px] text-orange-600 font-bold uppercase tracking-tight">
                            Coach {peer.coach}
                          </p>
                        )}
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

                    <button
                      onClick={() => {
                        const isIncoming = incomingRequests.some(req => req.requesterSocketId === peer.socketId);
                        if (isIncoming) {
                          incomingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else if (sentRequests.includes(peer.socketId)) {
                          if (onCancelSentRequest) onCancelSentRequest(peer.socketId);
                        } else {
                          onInitiateRequest(peer);
                        }
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all shadow-lg shadow-blue-900/10 flex items-center gap-2 ${incomingRequests.some(req => req.requesterSocketId === peer.socketId)
                        ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse'
                        : sentRequests.includes(peer.socketId)
                          ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                        }`}
                    >
                      {incomingRequests.some(req => req.requesterSocketId === peer.socketId) ? (
                        <>See Incoming <ArrowUpCircle size={12} /></>
                      ) : sentRequests.includes(peer.socketId) ? (
                        <>Cancel <XCircle size={12} /></>
                      ) : (
                        <>Exchange <Send size={12} /></>
                      )}
                    </button>
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
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Scanning Coach {displayCoach}</h3>
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
                    {/* Shows the seat user GAVE UP */}
                    {activeExchange?.swappedSeat?.requesterNewSeat === currentSeat
                      ? activeExchange?.requester?.seatNo
                      : activeExchange?.requester?.targetSeat}
                  </div>
                  <p className="text-blue-300/40 text-[8px] font-black uppercase mt-1">
                    Coach {activeExchange?.swappedSeat?.requesterNewSeat === currentSeat
                      ? (activeExchange?.startCoach || userCoach)
                      : (activeExchange?.endCoach || userCoach)}
                  </p>
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
                  <p className="text-orange-400 text-[9px] font-black mt-1 uppercase tracking-tighter">
                    Coach {activeExchange?.swappedSeat?.requesterNewSeat === currentSeat
                      ? (activeExchange?.endCoach || userCoach)
                      : (activeExchange?.startCoach || userCoach)}
                  </p>
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
    </div >
  );
};