import { useState, useMemo, useEffect } from 'react';
import { AuthModule } from './components/AuthModule';
import { SeatRequestModule } from './components/SeatRequestModule';
import { CateringModule } from './components/CateringModule';
import { PaymentModule } from './components/PaymentModule';
import { Train, User, LogOut, Utensils, Map as MapIcon, Radio } from 'lucide-react';
import { MENU_DATA } from './data/FoodItem';
import type { RequestStatus, PnrRecord, LiveUser, ExchangeData } from './types/types';
import { io, Socket } from 'socket.io-client';

import { API_URL } from './config';

// Initialize socket outside component to avoid reconnects on re-renders
const socket: Socket = io(API_URL);

export default function App() {
  const [session, setSession] = useState<PnrRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'seats' | 'food'>('seats');
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [showPayment, setShowPayment] = useState(false);

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

          // Reset Status to allow new broadcasts
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
  }, [session, isLive, userDetails]); // Added isLive dependency to ensure we have latest value when session connects

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
        preference: myPreferences?.type || "Any"
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

  // This executes when exchange is accepted to update local state
  useEffect(() => {
    if (activeExchange && userDetails && session) {
      if (activeExchange.swappedSeat) {
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
          // If I was requester (holding s2? No s2 is what Target gets, i.e. my old seat).
          // Wait, s2 is targetNewSeat. Target gets my old seat. So s2 === my old seat.
          // So I am Requester. I move to s1. s1 is in endCoach.
          newCoach = activeExchange.endCoach || userDetails.coach;
        } else if (s2 !== userDetails.seatNo && s1 === userDetails.seatNo) {
          newSeat = s2;
          // If I was target (holding s1? No s1 is what Requester gets, i.e. my old seat).
          // s1 is requesterNewSeat. Requester gets my old seat. So s1 === my old seat.
          // So I am Target. I move to s2. s2 is in startCoach.
          newCoach = activeExchange.startCoach || userDetails.coach;
        } else if (s1 !== userDetails.seatNo) {
          // Fallback: assume s1 if logic is ambiguous or force swap
          newSeat = s1;
          // Ambiguous case: default to target's coach if available, else keep own
          newCoach = activeExchange.endCoach || userDetails.coach;
        }

        if (newSeat !== userDetails.seatNo || newCoach !== userDetails.coach) {
          console.log(`Swapping seat locally: ${userDetails.coach} ${userDetails.seatNo} -> ${newCoach} ${newSeat}`);
          const updatedSession = JSON.parse(JSON.stringify(session));
          if (updatedSession.Passenger && updatedSession.Passenger.length > 0) {
            updatedSession.Passenger[0].SeatNo = newSeat;
            updatedSession.Passenger[0].Coach = newCoach;
            setSession(updatedSession);
          }
        }
      }
    }
  }, [activeExchange]);


  // Update Cart helper
  const handleUpdateCart = (id: number, delta: number) => {
    setCart(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const calculateTotal = () => {
    return Object.entries(cart).reduce((acc, [id, qty]) => {
      const item = MENU_DATA.find(m => m.id === Number(id));
      return acc + (item ? item.price * qty : 0);
    }, 0);
  };

  // Restore session on mount
  useEffect(() => {
    const restoreState = async () => {
      // 1. Session Restoration REMOVED to enforce strict single-session.

      // 2. Restore Cart
      const savedCart = localStorage.getItem('smartrail_cart');
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) { console.error("Error loading cart", e); }
      }

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

  // Persist Cart
  useEffect(() => {
    localStorage.setItem('smartrail_cart', JSON.stringify(cart));
  }, [cart]);

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
        bookingStatus: `${userDetails.coach}, ${userDetails.seatNo}, GN`,
      });
    }
  }, [session, isLive, status, userDetails]); // Be careful with loops. status triggers this.


  const handleLogin = (data: PnrRecord) => {
    // Session persistence removed to enforce strict single-session
    setSession(data);
  };

  if (!session) return <AuthModule onLogin={handleLogin} />;

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
        <div className="flex justify-between items-center max-w-7xl mx-auto w-full px-4 md:px-8">
          <div>
            <div className="flex items-center gap-2 text-blue-300 text-[9px] font-black uppercase tracking-widest">
              <Train size={10} /> {userDetails?.class} • Coach {userDetails?.coach}
            </div>
            <h1 className="text-xl font-black uppercase tracking-tighter mt-1 leading-none">
              {session.TrainName}
            </h1>
            <div className="flex items-center gap-2 mt-2 bg-white/10 px-3 py-1 rounded-full w-fit">
              <User size={10} className="text-orange-400" />
              <p className="text-[9px] font-bold uppercase tracking-tight">
                {userDetails?.name} • Seat {userDetails?.seatNo}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isLive && (
              <button
                onClick={handleStopLive}
                className="p-3 rounded-2xl transition-all active:scale-90 flex items-center gap-2 bg-red-500/20 text-red-200"
              >
                <Radio size={20} className="animate-pulse" />
                <span className="text-[10px] font-black uppercase">Stop Live</span>
              </button>
            )}
            <button
              onClick={async () => {
                if (session && session.PnrNumber) {
                  console.log("Initiating UI Logout for:", session.PnrNumber);
                  try {
                    // Await the logout to ensure it reaches backend
                    await fetch(`${API_URL}/api/logout`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ pnr: session.PnrNumber })
                    });
                    console.log("Backend logout successful");
                  } catch (e) {
                    console.error("Logout error", e);
                  }
                } else {
                  console.warn("No session PNR found during logout");
                }

                // Clear local state
                localStorage.removeItem('smartrail_session');
                localStorage.removeItem('smartrail_cart');
                localStorage.removeItem('smartrail_history');

                setSession(null);
                setStatus('idle');
                setCart({});
                setIsLive(false);
                socket.disconnect();
                socket.connect();
              }}
              className="p-3 bg-white/10 rounded-2xl hover:bg-red-500/20 text-blue-200 hover:text-red-200 transition-all active:scale-90 flex items-center gap-2"
            >
              <LogOut size={20} />

            </button>
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
          <CateringModule
            menu={MENU_DATA}
            cart={cart}
            onUpdateCart={handleUpdateCart}
            onPay={() => setShowPayment(true)}
          />
        )}
      </main>

      {showPayment && (
        <PaymentModule
          amount={calculateTotal()}
          onSuccess={() => {
            setShowPayment(false);
            setCart({});
          }}
          onCancel={() => setShowPayment(false)}
        />
      )}

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xs bg-slate-900/95 backdrop-blur-md rounded-[2.5rem] p-2 flex gap-2 shadow-2xl border border-white/10 z-[50]">
        <button
          onClick={() => setActiveTab('seats')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[2rem] font-black text-[10px] uppercase transition-all ${activeTab === 'seats' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
        >
          <MapIcon size={16} /> Seats
        </button>
        <button
          onClick={() => setActiveTab('food')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[2rem] font-black text-[10px] uppercase transition-all ${activeTab === 'food' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500'}`}
        >
          <Utensils size={16} /> Catering
        </button>
      </nav>
    </div>
  );
}