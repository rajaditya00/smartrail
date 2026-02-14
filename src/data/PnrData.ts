import type { PnrRecord } from "../types/types";

export const MOCK_PNR_DATABASE: Record<string, PnrRecord> = {
  // PNR 1: Your Main User (Solo Traveler)
  "2415678901": {
    ResponseCode: "200",
    PnrNumber: "2415678901",
    TrainNo: "12310",
    TrainName: "RAJEDRA NAGAR RAJDHANI",
    DateOfJourney: "20-10-2025",
    BookingDate: "15-08-2025",
    SourceStation: "NDLS",
    DestinationStation: "PNBE",
    BoardingStation: "NDLS",
    ReservationUpto: "PNBE",
    JourneyClass: "3A",
    JourneyQuota: "GN",
    TotalFare: "2450.00",
    MobileNumber: "9134343434",
    ChartStatus: "CHART NOT PREPARED",
    Passenger: [
      {
        PassengerName: "ADITYA KUMAR",
        BookingStatus: "B1, 45, GN",
        CurrentStatus: "CNF",
        SeatNo: 45,
        Coach: "B1",
        BerthCode: "LB",
        Age: 24,
        Gender: "M"
      }
    ]
  },
  "2415678341": {
    ResponseCode: "200",
    PnrNumber: "2415678341",
    TrainNo: "12310",
    TrainName: "RAJEDRA NAGAR RAJDHANI",
    DateOfJourney: "20-10-2025",
    BookingDate: "15-08-2025",
    SourceStation: "NDLS",
    DestinationStation: "PNBE",
    BoardingStation: "NDLS",
    ReservationUpto: "PNBE",
    JourneyClass: "3A",
    JourneyQuota: "GN",
    TotalFare: "2450.00",
    MobileNumber: "6203836203",
    ChartStatus: "CHART NOT PREPARED",
    Passenger: [
      {
        PassengerName: "Raman Kumar",
        BookingStatus: "B1, 49, GN",
        CurrentStatus: "CNF",
        SeatNo: 49,
        Coach: "B1",
        BerthCode: "LB",
        Age: 24,
        Gender: "M"
      }
    ]
  },

  // PNR 2: Family Group (Potential for Food Orders)
  "4556781122": {
    ResponseCode: "200",
    PnrNumber: "4556781122",
    TrainNo: "12310",
    TrainName: "RAJEDRA NAGAR RAJDHANI",
    DateOfJourney: "20-10-2025",
    BookingDate: "10-09-2025",
    SourceStation: "NDLS",
    DestinationStation: "PNBE",
    BoardingStation: "NDLS",
    ReservationUpto: "PNBE",
    JourneyClass: "3A",
    JourneyQuota: "GN",
    TotalFare: "6800.00",
    MobileNumber: "9876543210",
    ChartStatus: "CHART NOT PREPARED",
    Passenger: [
      {
        PassengerName: "SURESH VERMA",
        BookingStatus: "B2, 10, GN",
        CurrentStatus: "CNF",
        SeatNo: 10,
        Coach: "B2",
        BerthCode: "LB",
        Age: 45,
        Gender: "M"
      },
      {
        PassengerName: "MEENA VERMA",
        BookingStatus: "B2, 11, GN",
        CurrentStatus: "CNF",
        SeatNo: 11,
        Coach: "B2",
        BerthCode: "MB",
        Age: 42,
        Gender: "F"
      },
      {
        PassengerName: "RAHUL VERMA",
        BookingStatus: "B2, 12, GN",
        CurrentStatus: "CNF",
        SeatNo: 12,
        Coach: "B2",
        BerthCode: "UB",
        Age: 15,
        Gender: "M"
      }
    ]
  },

  // PNR 3: Business Travelers (Potential for Seat Exchange)
  "1022334455": {
    ResponseCode: "200",
    PnrNumber: "1022334455",
    TrainNo: "12310",
    TrainName: "RAJEDRA NAGAR RAJDHANI",
    DateOfJourney: "20-10-2025",
    BookingDate: "05-10-2025",
    SourceStation: "NDLS",
    DestinationStation: "PNBE",
    BoardingStation: "NDLS",
    ReservationUpto: "PNBE",
    JourneyClass: "3A",
    JourneyQuota: "GN",
    TotalFare: "4900.00",
    MobileNumber: "8800112233",
    ChartStatus: "CHART NOT PREPARED",
    Passenger: [
      {
        PassengerName: "PRIYA SHARMA",
        BookingStatus: "B2, 22, GN",
        CurrentStatus: "CNF",
        SeatNo: 22,
        Coach: "B2",
        BerthCode: "SL",
        Age: 29,
        Gender: "F"
      },
      {
        PassengerName: "VIKRAM SINGH",
        BookingStatus: "B2, 23, GN",
        CurrentStatus: "CNF",
        SeatNo: 23,
        Coach: "B2",
        BerthCode: "SU",
        Age: 31,
        Gender: "M"
      }
    ]
  },

  // PNR 4: Senior Citizens (Looking for Lower Berths)
  "6677889900": {
    ResponseCode: "200",
    PnrNumber: "6677889900",
    TrainNo: "12310",
    TrainName: "RAJEDRA NAGAR RAJDHANI",
    DateOfJourney: "20-10-2025",
    BookingDate: "01-07-2025",
    SourceStation: "NDLS",
    DestinationStation: "PNBE",
    BoardingStation: "NDLS",
    ReservationUpto: "PNBE",
    JourneyClass: "3A",
    JourneyQuota: "SS",
    TotalFare: "3100.00",
    MobileNumber: "9988776655",
    ChartStatus: "CHART NOT PREPARED",
    Passenger: [
      {
        PassengerName: "OM PRAKASH",
        BookingStatus: "B2, 62, GN",
        CurrentStatus: "CNF",
        SeatNo: 62,
        Coach: "B2",
        BerthCode: "LB",
        Age: 68,
        Gender: "M"
      },
      {
        PassengerName: "SANTI DEVI",
        BookingStatus: "B2, 63, GN",
        CurrentStatus: "CNF",
        SeatNo: 63,
        Coach: "B2",
        BerthCode: "LB",
        Age: 65,
        Gender: "F"
      }
    ]
  },

  // PNR 5: Solo Traveler (Window Seat/Side Lower Preference)
  "5544332211": {
    ResponseCode: "200",
    PnrNumber: "5544332211",
    TrainNo: "12310",
    TrainName: "RAJEDRA NAGAR RAJDHANI",
    DateOfJourney: "20-10-2025",
    BookingDate: "18-09-2025",
    SourceStation: "NDLS",
    DestinationStation: "PNBE",
    BoardingStation: "NDLS",
    ReservationUpto: "PNBE",
    JourneyClass: "3A",
    JourneyQuota: "GN",
    TotalFare: "2450.00",
    MobileNumber: "7001122334",
    ChartStatus: "CHART NOT PREPARED",
    Passenger: [
      {
        PassengerName: "ISHITA DAS",
        BookingStatus: "B2, 48, GN",
        CurrentStatus: "CNF",
        SeatNo: 48,
        Coach: "B2",
        BerthCode: "SU",
        Age: 22,
        Gender: "F"
      }
    ]
  }
};