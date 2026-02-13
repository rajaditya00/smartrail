// server/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    socketId: { type: String, required: true },
    passengerName: { type: String, required: true },
    coach: { type: String, required: true },
    seatNo: { type: Number, required: true },
    pnr: { type: String, required: true }, // Made required for better data integrity
    mobile: { type: String },
    bookingStatus: { type: String },
    isLive: { type: Boolean, default: false },
    isLoggedIn: { type: Boolean, default: false }, // Track active session
    trainNo: { type: String }, // Added to support displaying train details
    trainName: { type: String },
    class: { type: String },
    preferences: {
        type: { type: String },
        reason: { type: String }
    },
    lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
