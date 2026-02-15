
export type RequestStatus = 'idle' | 'pending' | 'approved' | 'rejected' | 'broadcasting';
export type CoachType = '1A' | '2A' | '3A' | 'SL' | 'CC';
export type BerthCode = 'LB' | 'MB' | 'UB' | 'SL' | 'SU' | 'SM';

export interface UserSession {
  pnr: string;
  mobile: string;
  isAuthenticated: boolean;
}

export interface FoodItem {
  id: number;
  name: string;
  price: number;
  category: 'Veg' | 'Non-Veg';
  type: 'meal' | 'snack' | 'drink' | 'water';
}

export interface Complaint {
  id: string;
  text: string;
  timestamp: Date;
}

export interface SeatInfo {
  seatNo: number;
  type: 'UB' | 'MB' | 'LB' | 'SL' | 'SU';
  isWindow: boolean;
}


export interface Train {
  trainNo: string;
  name: string;
  source: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  coachTypes: CoachType[];
  availableSeats: number;
}

export interface Passenger {
  name: string;
  age: number;
  gender?: 'M' | 'F' | 'O';
  seat?: SeatInfo;
  mobile?: string;
}

export interface Reservation {
  reservationId: string;
  pnr: string;
  trainNo: string;
  journeyDate: string;
  passengers: Passenger[];
  coachType: CoachType;
  status: RequestStatus;
  totalFare: number;
  foodOrders?: FoodOrder[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface FoodOrder {
  orderId: string;
  items: FoodItem[];
  totalPrice: number;
  orderedAt: Date;
  delivered: boolean;
  seatNo?: number;
}

export interface Payment {
  paymentId: string;
  pnr?: string;
  amount: number;
  method: 'UPI' | 'Card' | 'NetBanking' | 'Cash';
  status: 'initiated' | 'completed' | 'failed' | 'refunded';
  timestamp: Date;
}

export type RequestType = 'refund' | 'reschedule' | 'cancellation' | 'general';

export interface ServiceRequest {
  id: string;
  type: RequestType;
  pnr?: string;
  createdBy: string;
  message?: string;
  status: RequestStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ExchangeableSeat {
  id: string;
  seatNo: number;
  passengerName: string;
  preference: string;
  reason?: string;
}


export interface BroadcastData {
  fromSeat: number;
  lookingFor: BerthCode;
  timestamp: Date;
}

export interface Passengers {
  PassengerName: string;
  BookingStatus: string;
  CurrentStatus: string;
  SeatNo: number;
  Coach: string;
  BerthCode: string;
  Age: number;
  Gender: string;
}

export interface PnrRecord {
  ResponseCode: string;
  PnrNumber: string;
  TrainNo: string;
  TrainName: string;
  DateOfJourney: string;
  BookingDate: string;
  SourceStation: string;
  DestinationStation: string;
  BoardingStation: string;
  ReservationUpto: string;
  JourneyClass: string;
  JourneyQuota: string;
  TotalFare: string;
  MobileNumber: string;
  ChartStatus: string;
  Passenger: Passengers[];
  isLive?: boolean;
}

export interface LiveUser {
  socketId: string;
  passengerName: string;
  coach: string;
  seatNo: number;
  class: string;
  isLive: boolean;
  preferences?: {
    type: string;
    reason: string;
  };
}

export interface ExchangeData {
  exchangeId: string;
  requesterSocketId?: string;
  status: string;
  requester?: {
    name: string;
    seatNo: number;
    targetSeat?: number;
    reason?: string;
    preference?: string;
  };
  expiresAt?: string;
  swappedSeat?: {
    requesterNewSeat: number;
    targetNewSeat: number;
  };
  // History specific
  startSeat?: number;
  endSeat?: number;
}