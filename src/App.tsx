import { useState, useMemo, useEffect } from 'react';
import { AuthModule } from './components/AuthModule';
import { SeatRequestModule } from './components/SeatRequestModule';
import { CateringModule } from './components/CateringModule';
import { PaymentModule } from './components/PaymentModule';
import { Train, User, LogOut, Utensils, Map as MapIcon, Radio } from 'lucide-react';
import { MENU_DATA } from './data/FoodItem';
import type { RequestStatus, PnrRecord, LiveUser, ExchangeData } from './types/types';
import { io, Socket } from 'socket.io-client';

// Initialize socket outside component to avoid reconnects on re-renders
const socket: Socket = io('http://localhost:5000');

export default function App() {
  const [session, setSession] = useState<PnrRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'seats' | 'food'>('seats');
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [cart, setCart] = useState<Record<number, number>>({});
  const [showPayment, setShowPayment] = useState(false);

  // New State for Live/Exchange
  const [isLive, setIsLive] = useState(false);
  const [liveUsers, setLiveUsers] = useState<LiveUser[]>([]);
  const [incomingRequest, setIncomingRequest] = useState<ExchangeData | null>(null);
  const [activeExchange, setActiveExchange] = useState<ExchangeData | null>(null);
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

          if (activeExchange.requester && activeExchange.swappedSeat && userDetails) {
            if (activeExchange.requester.name === userDetails.name) {
              // I am requester
              oldSeat = activeExchange.requester.seatNo;
              newSeat = activeExchange.swappedSeat.requesterNewSeat;
            } else {
              // I am target
              oldSeat = activeExchange.requester.targetSeat || 0;
              newSeat = activeExchange.swappedSeat.targetNewSeat;
            }
          }

          const historyItem: ExchangeData = {
            ...activeExchange,
            startSeat: oldSeat,
            endSeat: newSeat
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
    if (!session) return;

    if (session.PnrNumber) {
      socket.emit('bind-user', { pnr: session.PnrNumber });
    }

    // Socket Event Listeners
    socket.on('update-live-users', (users) => {
      // Filter out self
      const others = users.filter((u: any) => u.socketId !== socket.id);
      setLiveUsers(others);
    });

    socket.on('exchange-request', (data) => {
      console.log("Incoming exchange request:", data);
      setIncomingRequest(data);
    });

    socket.on('exchange-accepted', (data) => {
      console.log("Exchange accepted:", data);
      setActiveExchange(data);

      // Stop broadcasting silently (keep status as approved)
      setIsLive(false);
      socket.emit('stop-live');

      setStatus('approved');
      setSentRequests([]); // Clear all pending requests

      // Session update is handled by the useEffect dependent on activeExchange

      // HACK: For visual update, we rely on the implementation below in `handleExchangeSuccess`
      // or effectively just setStatus('approved') and let the UI show the new seat if we updated it.
      // Let's refine the server payload handling in a separate effect or function if needed.
      // For now, let's just trigger the 'approved' state which shows the ticket.
    });

    socket.on('exchange-rejected', () => {
      // alert("Exchange request was rejected.");
      // Ideally we should know WHICH request was rejected to remove only that one.
      // For now, if we get a rejection, we maybe shouldn't reset everything?
      // Since backend broadcasts 'exchange-rejected' to requester generally.
      // If we simply do nothing, the button stays 'Request Sent'.
      // User might need a way to retry or we need exchangeId in rejection to clear specifically.
      // status('idle') was old logic.
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
      socket.off('exchange-accepted');
      socket.off('exchange-rejected');
      socket.off('exchange-cancelled');
    };
  }, [session]);

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
        targetSeat: targetPeer.seatNo
      }
    });
  };

  const handleAcceptRequest = () => {
    if (!incomingRequest) return;
    socket.emit('respond-exchange', {
      exchangeId: incomingRequest.exchangeId,
      accepted: true
    });
    setIncomingRequest(null);
  };

  const handleRejectRequest = () => {
    if (!incomingRequest) return;
    socket.emit('respond-exchange', {
      exchangeId: incomingRequest.exchangeId,
      accepted: false
    });
    setIncomingRequest(null);
  };

  const handleCancelExchange = () => {
    if (!activeExchange) return;
    socket.emit('cancel-exchange', { exchangeId: activeExchange.exchangeId });
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

        if (s1 !== userDetails.seatNo && s2 === userDetails.seatNo) {
          newSeat = s1;
        } else if (s2 !== userDetails.seatNo && s1 === userDetails.seatNo) {
          newSeat = s2;
        } else if (s1 !== userDetails.seatNo) {
          // Fallback: assume s1 if logic is ambiguous or force swap
          newSeat = s1;
        }

        if (newSeat !== userDetails.seatNo) {
          console.log(`Swapping seat locally: ${userDetails.seatNo} -> ${newSeat}`);
          const updatedSession = JSON.parse(JSON.stringify(session));
          if (updatedSession.Passenger && updatedSession.Passenger.length > 0) {
            updatedSession.Passenger[0].SeatNo = newSeat;
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

  if (!session) return <AuthModule onLogin={setSession} />;

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans overflow-x-hidden relative">
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
              onClick={() => { setSession(null); setStatus('idle'); setCart({}); setIsLive(false); socket.disconnect(); socket.connect(); }}
              className="p-3 bg-white/10 rounded-2xl hover:bg-red-500/20 transition-all active:scale-90"
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
            incomingRequest={incomingRequest}

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