// server/models/Exchange.js
const mongoose = require('mongoose');

const ExchangeSchema = new mongoose.Schema({
    requesterSocketId: { type: String, required: true },
    targetSocketId: { type: String, required: true },
    requesterName: { type: String, required: true },
    targetName: { type: String, required: true },
    requesterSeat: { type: Number, required: true },
    targetSeat: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now },
    acceptedAt: { type: Date }, // Start of 5 min timer
    expiresAt: { type: Date } // End of 5 min timer
});

module.exports = mongoose.model('Exchange', ExchangeSchema);
