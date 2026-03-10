import { useState, useMemo, useEffect, useRef } from 'react';
import { AuthModule } from './components/AuthModule';
import { SeatRequestModule } from './components/SeatRequestModule';
import { SupportModule } from './components/SupportModule';
import { Train, User, LogOut, LifeBuoy, Map as MapIcon, Radio } from 'lucide-react';
import type { RequestStatus, PnrRecord, LiveUser, ExchangeData } from './types/types';
import { io, Socket } from 'socket.io-client';

import { API_URL } from './config';

// Initialize socket outside component to avoid reconnects on re-renders
const socket: Socket = io(API_URL);

export default function App() {
  const [session, setSession] = useState<PnrRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'seats' | 'support'>('seats');
  const [status, setStatus] = useState<RequestStatus>('idle');

  // New State for Live/Exchange
  const [isLive, setIsLive] = useState(false);

  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ExchangeData[]>([]);
  const [activeExchange, setActiveExchange] = useState<ExchangeData | null>(null);

  // Notification State
  const [notification, setNotification] = useState<{ message: string; visible: boolean } | null>(null);

  const [myPreferences, setMyPreferences] = useState<{ type: string; reason: string } | null>(null);
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeData[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(true);
    await new Promise(r => setTimeout(r, 3000)); // animation duration
    if (session && session.PnrNumber) {
      try {
        await fetch(`${API_URL}/api/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pnr: session.PnrNumber })
        });
      } catch (e) {
        console.error("Logout error", e);
      }
    }
    localStorage.removeItem('smartrail_session');
    localStorage.removeItem('smartrail_history');
    setSession(null);
    setStatus('idle');
    setIsLive(false);
    setIsLoggingOut(false);
    socket.disconnect();
    socket.connect();
  };


  const userDetails = useMemo(() => {
    if (!session || !session.Passenger || session.Passenger.length === 0) return null;
    const p = session.Passenger[0];

    return {
      name: p.PassengerName,
      coach: p.Coach || "N/A",
      seatNo: p.SeatNo || 0,
      class: session.JourneyClass
    };
  }, [session]);

  // Timer & History Logic
  useEffect(() => {
    if (status === 'approved' && activeExchange && activeExchange.expiresAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const end = new Date(activeExchange.expiresAt!).getTime();

        if (now > end) {
          // Timer Expired
          console.log("Exchange timer expired. Moving to history.");
          clearInterval(interval);

          let oldSeat = 0;
          let newSeat = 0;
          let oldCoach = userDetails?.coach || "";
          let newCoach = userDetails?.coach || "";

          if (activeExchange.requester && activeExchange.swappedSeat && userDetails) {
            if (activeExchange.requester.name === userDetails.name) {
              // I am requester
              oldSeat = activeExchange.requester.seatNo;
              newSeat = activeExchange.swappedSeat.requesterNewSeat;
              oldCoach = activeExchange.startCoach || userDetails.coach; // My original
              newCoach = activeExchange.endCoach || userDetails.coach;   // Target's original
            } else {
              // I am target
              oldSeat = activeExchange.requester.targetSeat || 0;
              newSeat = activeExchange.swappedSeat.targetNewSeat;
              oldCoach = activeExchange.endCoach || userDetails.coach;   // My original
              newCoach = activeExchange.startCoach || userDetails.coach; // Requester's original
            }
          }

          const historyItem: ExchangeData = {
            ...activeExchange,
            startSeat: oldSeat,
            endSeat: newSeat,
            startCoach: oldCoach,
            endCoach: newCoach
          };

          // Add to history
          setExchangeHistory(prev => [historyItem, ...prev]);

          // Automatically hide the ticket and move to Idle state (which shows Exchange History)
          setStatus('idle');
          setActiveExchange(null);
          // Optional: alert or toast
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, activeExchange, userDetails]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (session && session.PnrNumber) {
        // Use fetch with keepalive which is more reliable than sendBeacon for JSON
        fetch(`${API_URL}/api/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pnr: session.PnrNumber }),
          keepalive: true
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;

    if (session.PnrNumber) {
      socket.emit('bind-user', { pnr: session.PnrNumber });
    }

    // Socket Event Listeners
    socket.on('update-live-users', (users) => {
      // Filter out self AND users in different CLASS (Coach can be different now)
      const others = users.filter((u: any) =>
        u.socketId !== socket.id &&
        (userDetails?.class ? u.class === userDetails.class : true)
      );
      setLiveUsers(others);
    });

    socket.on('exchange-request', (data) => {
      console.log("Incoming exchange request:", data);

      // Auto-reject incoming request if an exchange is already active/approved
      if (activeExchange || status === 'approved') {
        console.log("Auto-rejecting request due to active exchange:", data.exchangeId);
        socket.emit('respond-exchange', {
          exchangeId: data.exchangeId,
          accepted: false
        });
        return;
      }

      // 1. Vibrate Device (Buzz-Pause-Buzz)
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // 2. Show Temporary Notification
      setNotification({
        message: `New Seat Exchange Request from ${data.requester.name}`,
        visible: true
      });

      // Hide after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 6000);

      setIncomingRequests(prev => {
        // Prevent duplicates
        if (prev.find(r => r.exchangeId === data.exchangeId)) return prev;
        return [...prev, data];
      });
    });

    socket.on('request-cancelled', ({ exchangeId, targetSocketId, requesterSocketId }) => {
      console.log("Request cancelled:", exchangeId);
      // Remove from incoming
      setIncomingRequests(prev => prev.filter(r => r.exchangeId !== exchangeId));

      // Remove from sent (if we were the requester and it was auto-cancelled)
      if (requesterSocketId === socket.id && targetSocketId) {
        setSentRequests(prev => prev.filter(id => id !== targetSocketId));
      }
    });

    socket.on('exchange-accepted', (data) => {
      console.log("Exchange accepted:", data);
      setActiveExchange(data);

      // Stop broadcasting silently (keep status as approved)
      setIsLive(false);
      socket.emit('stop-live');

      setStatus('approved');
      setSentRequests([]); // Clear all pending request markers on client side
      setIncomingRequests([]); // Clear all incoming since we accepted one

      // Session update is handled by the useEffect dependent on activeExchange
    });

    socket.on('exchange-rejected', ({ targetSocketId }) => {
      // alert("Exchange request was rejected."); // Optional: remove alert if it's annoying
      if (targetSocketId) {
        setSentRequests(prev => prev.filter(id => id !== targetSocketId));
      }
    });

    socket.on('exchange-cancelled', () => {
      alert("Exchange cancelled.");
      setStatus('idle');
      setActiveExchange(null);
      setSentRequests([]);
    });

    return () => {
      socket.off('update-live-users');
      socket.off('exchange-request');
      socket.off('request-cancelled');
      socket.off('exchange-accepted');
      socket.off('exchange-rejected');
      socket.off('exchange-cancelled');
    };
  }, [session, isLive, userDetails, status, activeExchange]); // Added dependencies to ensure we have latest values when session connects

  const handleGoLive = (preferences?: any) => {
    if (!userDetails || !session) return;
    socket.emit('go-live', {
      pnr: session.PnrNumber,
      mobile: session.MobileNumber,
      passengerName: userDetails.name,
      coach: userDetails.coach,
      seatNo: userDetails.seatNo,
      class: userDetails.class,
      trainNo: session.TrainNo,     // Add TrainNo
      trainName: session.TrainName, // Add TrainName
      sourceStation: session.SourceStation,
      destinationStation: session.DestinationStation,
      bookingStatus: `${userDetails.coach}, ${userDetails.seatNo}, GN`,
      preferences // Pass preferences if backend supports it later
    });
    setMyPreferences(preferences);
    setIsLive(true);
    setStatus('broadcasting');
  };

  const handleStopLive = () => {
    socket.emit('stop-live');
    setIsLive(false);
    setStatus('idle');
    setSentRequests([]);
    setIncomingRequests([]);
  };

  const handleInitiateRequest = (targetPeer: any) => {
    if (!userDetails) return;

    // setStatus('pending'); // Don't block UI
    setSentRequests(prev => [...prev, targetPeer.socketId]);

    socket.emit('request-exchange', {
      targetSocketId: targetPeer.socketId,
      requesterDetails: {
        name: userDetails.name,
        seatNo: userDetails.seatNo,
        targetSeat: targetPeer.seatNo,
        reason: myPreferences?.reason || "No Reason Provided",
        preference: myPreferences?.type || "Any",
        sourceStation: session?.SourceStation,
        destinationStation: session?.DestinationStation
      }
    });
  };

  const handleAcceptRequest = (exchangeId: string) => {
    socket.emit('respond-exchange', {
      exchangeId,
      accepted: true
    });
    // Optimistically remove
    setIncomingRequests(prev => prev.filter(r => r.exchangeId !== exchangeId));
  };

  const handleRejectRequest = (exchangeId: string) => {
    socket.emit('respond-exchange', {
      exchangeId,
      accepted: false
    });
    // Remove from list
    setIncomingRequests(prev => prev.filter(r => r.exchangeId !== exchangeId));
  };

  const handleCancelExchange = () => {
    if (!activeExchange) return;
    socket.emit('cancel-exchange', { exchangeId: activeExchange.exchangeId });
  };

  const handleCancelSentRequest = (targetSocketId: string) => {
    socket.emit('cancel-exchange-request', { targetSocketId });
    setSentRequests(prev => prev.filter(citations => citations !== targetSocketId));
  };

  const processedExchangeRef = useRef<string | null>(null);

  // This executes when exchange is accepted to update local state
  useEffect(() => {
    if (activeExchange && userDetails && session) {
      if (activeExchange.swappedSeat && processedExchangeRef.current !== activeExchange.exchangeId) {
        const s1 = activeExchange.swappedSeat.requesterNewSeat;
        const s2 = activeExchange.swappedSeat.targetNewSeat;

        // We know that one of these new seats is meant for us. 
        // If s1 is NOT our current seat, and s2 IS our current seat, then s1 is our NEW seat.
        // If s2 is NOT our current seat, and s1 IS our current seat, then s2 is our NEW seat.
        // If both are different, we check against what we held before.

        let newSeat = userDetails.seatNo;
        let newCoach = userDetails.coach;

        if (s1 !== userDetails.seatNo && s2 === userDetails.seatNo) {
          newSeat = s1;
          newCoach = activeExchange.endCoach || userDetails.coach;
        } else if (s2 !== userDetails.seatNo && s1 === userDetails.seatNo) {
          newSeat = s2;
          newCoach = activeExchange.startCoach || userDetails.coach;
        } else if (s1 !== userDetails.seatNo) {
          // Fallback: assume s1 if logic is ambiguous or force swap
          newSeat = s1;
          newCoach = activeExchange.endCoach || userDetails.coach;
        }

        if (newSeat !== userDetails.seatNo || newCoach !== userDetails.coach) {
          console.log(`Swapping seat locally: ${userDetails.coach} ${userDetails.seatNo} -> ${newCoach} ${newSeat}`);
          processedExchangeRef.current = activeExchange.exchangeId as string; // Mark as processed

          setSession(prev => {
            if (!prev) return prev;
            const updatedSession = JSON.parse(JSON.stringify(prev));
            if (updatedSession.Passenger && updatedSession.Passenger.length > 0) {
              updatedSession.Passenger[0].SeatNo = newSeat;
              updatedSession.Passenger[0].Coach = newCoach;
            }
            return updatedSession;
          });
        } else {
          // Just mark as processed if no swap needed to prevent infinite loop
          processedExchangeRef.current = activeExchange.exchangeId as string;
        }
      }
    }
  }, [activeExchange, userDetails]);

  // Restore session on mount
  useEffect(() => {
    const restoreState = async () => {
      // 1. Session Restoration REMOVED to enforce strict single-session.

      // 3. Restore History
      const savedHistory = localStorage.getItem('smartrail_history');
      if (savedHistory) {
        try {
          setExchangeHistory(JSON.parse(savedHistory));
        } catch (e) { console.error("Error loading history", e); }
      }
    };

    restoreState();
  }, []);

  // Persist History
  useEffect(() => {
    localStorage.setItem('smartrail_history', JSON.stringify(exchangeHistory));
  }, [exchangeHistory]);

  // Re-emit GoLive if restored session isLive
  useEffect(() => {
    if (session && isLive && status === 'broadcasting' && userDetails) {
      // We only re-emit if socket is connected? 
      // Logic: if we just restored 'isLive=true', we need to tell backend "This new socket is the live user".
      // The backend 'login' endpoint reset socketId to 'pending'.
      // So we MUST emit 'go-live' again to reclaim the spot.
      console.log("Re-emitting go-live for restored session...");
      socket.emit('go-live', {
        pnr: session.PnrNumber,
        mobile: session.MobileNumber,
        passengerName: userDetails.name,
        coach: userDetails.coach,
        seatNo: userDetails.seatNo,
        class: userDetails.class,
        trainNo: session.TrainNo,
        trainName: session.TrainName,
        sourceStation: session.SourceStation,
        destinationStation: session.DestinationStation,
        bookingStatus: `${userDetails.coach}, ${userDetails.seatNo}, GN`,
      });
    }
  }, [session, isLive, status, userDetails]); // Be careful with loops. status triggers this.


  const handleLogin = async (data: PnrRecord) => {
    setIsLoggingIn(true);
    await new Promise(r => setTimeout(r, 3000));
    setSession(data);
    setIsLoggingIn(false);
  };

  if (!session && !isLoggingIn) return <AuthModule onLogin={handleLogin} />;

  if (isLoggingIn) return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900 animate-in fade-in duration-300">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full border-4 border-blue-600/20 border-t-blue-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Train size={28} className="text-blue-400" />
        </div>
      </div>
      <p className="text-white font-black text-sm uppercase tracking-widest animate-pulse">Boarding...</p>
      <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-wider">Welcome aboard!</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans overflow-x-hidden relative transition-opacity duration-500 opacity-100">
      {/* Top Notification Toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center animate-bounce">
          <span className="mr-2">🔔</span>
          <p className="font-semibold text-sm">{notification.message}</p>
        </div>
      )}

      <header className="bg-[#00205B] text-white p-6 rounded-b-[3rem] shadow-xl sticky top-0 z-50">
        <div className="flex justify-between items-start sm:items-center gap-4 max-w-7xl mx-auto w-full px-4 md:px-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-blue-300 text-[9px] font-black uppercase tracking-widest">
              <Train size={10} /> {userDetails?.class} • Coach {userDetails?.coach}
            </div>
            <h1 className="text-xl font-black uppercase tracking-tighter mt-1 leading-tight break-words whitespace-normal break-words w-full">
              {session?.TrainName}
            </h1>
            {session?.SourceStation && session?.DestinationStation && (
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-widest mt-1">
                {session.SourceStation} → {session.DestinationStation}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 bg-white/10 px-3 py-1 rounded-full w-fit max-w-full overflow-hidden">
              <User size={10} className="text-orange-400 shrink-0" />
              <p className="text-[9px] font-bold uppercase  ">
                {userDetails?.name} • Seat {userDetails?.seatNo}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row-reverse gap-2 shrink-0 items-end sm:items-center pt-1 sm:pt-0">
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-3 bg-white/10 rounded-2xl hover:bg-red-500/20 text-blue-200 hover:text-red-200 transition-all active:scale-90 flex items-center justify-center gap-2"
            >
              <LogOut size={20} />
            </button>
            {isLive && (
              <button
                onClick={handleStopLive}
                className="p-3 rounded-2xl transition-all active:scale-90 flex items-center justify-center gap-2 bg-red-500/20 text-red-200"
              >
                <Radio size={20} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase">Stop Live</span>
              </button>
            )}
          </div>
        </div>
      </header>


      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'seats' ? (
          <SeatRequestModule
            status={status}
            currentSeat={userDetails?.seatNo || 0}
            userClass={userDetails?.class || ''}
            userCoach={userDetails?.coach || ''}
            exchangeHistory={exchangeHistory}
            sentRequests={sentRequests}
            incomingRequests={incomingRequests}

            onInitiateRequest={handleInitiateRequest}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}

            // Pass live data
            livePeers={liveUsers}
            isLive={isLive}
            activeExchange={activeExchange}
            onCancelExchange={handleCancelExchange}
            onGoLive={handleGoLive}
            onStopLive={handleStopLive}
            onCancelSentRequest={handleCancelSentRequest}

            // Pass user details for receipt
            userName={userDetails?.name}
            userPnr={session?.PnrNumber}
          />
        ) : (
          <SupportModule
            pnr={session?.PnrNumber}
            userMobile={session?.MobileNumber}
            userName={userDetails?.name}
          />
        )}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xs bg-slate-900/95 backdrop-blur-md rounded-[2.5rem] p-2 flex gap-2 shadow-2xl border border-white/10 z-[50]">
        <button
          onClick={() => setActiveTab('seats')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[2rem] font-black text-[10px] uppercase transition-all ${activeTab === 'seats' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
        >
          <MapIcon size={16} /> Seats
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[2rem] font-black text-[10px] uppercase transition-all ${activeTab === 'support' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}
        >
          <LifeBuoy size={16} /> Support
        </button>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl mx-6 p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut size={24} className="text-red-500" />
              </div>
              <h3 className="text-base font-black text-slate-800">Logout?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Are you sure you want to logout from SmartRail? Your active session will end.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/30"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Transition Overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-900 animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-blue-600/20 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Train size={28} className="text-blue-400" />
            </div>
          </div>
          <p className="text-white font-black text-sm uppercase tracking-widest animate-pulse">Logging out...</p>
          <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-wider">Safe journey!</p>
        </div>
      )}
    </div>
  );
}