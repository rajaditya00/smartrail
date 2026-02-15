import React, { useState } from 'react';
import { ShieldCheck, Ticket, Phone, ArrowRight, Loader2, AlertCircle, Lock } from 'lucide-react';
import { MOCK_PNR_DATABASE } from '../data/PnrData';
import type { PnrRecord } from '../types/types';

import { API_URL } from '../config';

export const AuthModule = ({ onLogin }: { onLogin: (data: PnrRecord) => void }) => {
  const [step, setStep] = useState<'pnr' | 'otp'>('pnr');
  const [formData, setFormData] = useState({ pnr: '', mobile: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchedUser, setMatchedUser] = useState<PnrRecord | null>(null);

  const handleLoginAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const pnrInput = formData.pnr.trim();
    const mobileInput = formData.mobile.trim();
    let finalUserPayload: any = null;

    try {
      // 1. Check Server (MongoDB) First
      console.log("Checking Server for User...");
      const response = await fetch(`${API_URL}/api/validate-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pnr: pnrInput, mobile: mobileInput }),
      });

      if (response.status === 403) {
        const errData = await response.json();
        throw new Error(errData.message || "User already logged in.");
      }

      const data = await response.json();

      if (data.found && data.data) {
        console.log("User found in MongoDB:", data.data);
        finalUserPayload = {
          pnr: data.data.PnrNumber,
          mobile: data.data.MobileNumber,
          passengerName: data.data.Passenger[0].PassengerName,
          coach: data.data.Passenger[0].Coach,
          seatNo: data.data.Passenger[0].SeatNo,
          bookingStatus: data.data.Passenger[0].BookingStatus,
          trainNo: data.data.TrainNo,
          trainName: data.data.TrainName,
          class: data.data.JourneyClass
        };
      } else {
        // 2. Fallback to Local Mock Data
        console.warn("User not found in Server. Checking Local Mock Data...");
        const record = Object.values(MOCK_PNR_DATABASE).find(
          (r) => r.PnrNumber === pnrInput && r.MobileNumber === mobileInput
        );

        if (record && record.Passenger.length > 0) {
          console.log("User found in Local Mock Data.");
          const p = record.Passenger[0];
          finalUserPayload = {
            pnr: pnrInput,
            mobile: mobileInput,
            passengerName: p.PassengerName,
            coach: p.Coach,
            seatNo: p.SeatNo,
            bookingStatus: p.BookingStatus,
            trainNo: record.TrainNo,
            trainName: record.TrainName,
            class: record.JourneyClass
          };
        }
      }

      if (finalUserPayload) {
        setMatchedUser(finalUserPayload);
        setStep('otp');
      } else {
        throw new Error("Invalid PNR or Mobile Number. Please check details.");
      }

    } catch (apiErr: any) {
      console.error("Login Error:", apiErr);
      setError(apiErr.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (formData.otp === '1234') {
      try {
        if (!matchedUser) throw new Error("Session payload missing.");

        // NOW we perform the actual login (Upsert & Lock Session)
        console.log("OTP Verified. Logging in...", matchedUser);

        const response = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matchedUser)
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Final Login Successful:", data);
          onLogin(data);
        } else {
          const errData = await response.json();
          throw new Error(errData.message || "Login failed during final step.");
        }
      } catch (err: any) {
        console.error("Final Login Error:", err);
        setError(err.message || "Login failed.");
      } finally {
        setLoading(false);
      }
    } else {
      setError("Incorrect Code. Use '1234'");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-md border-t-8 border-blue-900">
        <div className="text-center mb-8">
          <div className="bg-blue-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">SmartRail Login</h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-start gap-3 text-red-700 animate-in slide-in-from-top-2">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-xs font-bold leading-tight">{error}</p>
          </div>
        )}

        {step === 'pnr' ? (
          <div className="space-y-4">
            {/* Quick Login for Testing */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.values(MOCK_PNR_DATABASE).map((record) => (
                <button
                  key={record.PnrNumber}
                  onClick={() => setFormData({ pnr: record.PnrNumber, mobile: record.MobileNumber, otp: '' })}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-900 text-[10px] font-bold py-2 px-3 rounded-xl transition-colors text-left truncate"
                >
                  {record.Passenger[0].PassengerName}
                </button>
              ))}
            </div>

            <form onSubmit={handleLoginAttempt} className="space-y-4">
              <div className="relative">
                <Ticket className="absolute left-4 top-4 text-blue-900" size={20} />
                <input
                  className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-blue-500"
                  placeholder="Enter Your PNR"
                  value={formData.pnr}
                  onChange={e => setFormData({ ...formData, pnr: e.target.value })}
                  required
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-4 text-blue-900" size={20} />
                <input
                  className="w-full pl-12 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-blue-500"
                  placeholder="Enter Associated Phone No."
                  value={formData.mobile}
                  onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70 disabled:grayscale" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>Verify Trip <ArrowRight size={20} /></>
                )}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 text-center">
              <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">{matchedUser?.TrainName}</p>
              <p className="text-xs font-bold text-blue-700">Code sent to +91 {formData.mobile}</p>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
              <input
                className="w-full pl-12 p-4 bg-slate-50 border-2 border-blue-600 rounded-2xl text-center text-2xl font-black tracking-widest outline-none"
                placeholder="Enter otp"
                onChange={e => setFormData({ ...formData, otp: e.target.value })}
                maxLength={4}
                required
              />
            </div>
            <button type="submit" className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg">
              Unlock Dashboard
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
