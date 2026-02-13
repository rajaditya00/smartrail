const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const User = require('./models/User');
const Exchange = require('./models/Exchange');

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.post('/api/login', async (req, res) => {
    try {
        const { pnr, mobile } = req.body;
        const user = await User.findOne({ pnr, mobile });
        if (!user) {
            return res.status(404).json({ message: "Invalid PNR or Mobile Number" });
        }

        if (user.isLoggedIn) {
            return res.status(403).json({ message: "User already logged in on another device." });
        }

        // Mark user as logged in
        user.isLoggedIn = true;
        user.lastActive = new Date();
        await user.save();

        // Construct the PnrRecord-like object expected by frontend
        // Note: The frontend expects a specific structure (PnrRecord). 
        // We'll reconstruct it from our flat User model or send what's needed.
        // The User model stores flattened data. 
        // Let's return a structure compatible with the frontend 'PnrRecord' type roughly
        // OR update frontend to accept this. 
        // Easier to mock the PnrRecord structure here.

        const pnrRecord = {
            PnrNumber: user.pnr,
            MobileNumber: user.mobile,
            TrainNo: user.trainNo, // Include TrainNo
            TrainName: user.trainName,
            JourneyClass: user.class,
            Passenger: [{
                PassengerName: user.passengerName,
                SeatNo: user.seatNo,
                Coach: user.coach,
                BookingStatus: user.bookingStatus
            }]
        };

        res.json(pnrRecord);
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

const server = http.createServer(app);

// Use environment variable or fallback to local MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://rajadityaaddy00_db_user:Aditya@9104@cluster0.3qbxxqr.mongodb.net/';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in development
        methods: ["GET", "POST"]
    }
});

// Helper to broadcast updated live users list
const broadcastLiveUsers = async () => {
    try {
        const liveUsers = await User.find({ isLive: true });
        // Clean up socket IDs before sending if desired, but frontend might need them
        io.emit('update-live-users', liveUsers);
    } catch (err) {
        console.error("Error broadcasting live users:", err);
    }
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 0. Bind User (Link Socket to PNR for Session Management)
    socket.on('bind-user', async ({ pnr }) => {
        try {
            console.log(`Binding socket ${socket.id} to PNR ${pnr}`);
            await User.findOneAndUpdate({ pnr }, {
                socketId: socket.id,
                isLoggedIn: true, // Re-affirm login status
                lastActive: Date.now()
            });
        } catch (err) {
            console.error("Error in bind-user:", err);
        }
    });

    // 1. Go Live
    socket.on('go-live', async (userData) => {
        try {
            // Upsert user based on PNR if available, otherwise socketId
            // We want to persist the user identity even if they reconnect (if pnr is same)
            const query = userData.pnr ? { pnr: userData.pnr } : { socketId: socket.id };

            const updateData = {
                ...userData,
                socketId: socket.id, // Always update socketId to current
                isLive: true,
                isLoggedIn: true, // Ensure marked as logged in
                lastActive: Date.now()
            };

            const newUser = await User.findOneAndUpdate(
                query,
                updateData,
                { returnDocument: 'after', upsert: true }
            );

            console.log(`User ${userData.passengerName} (PNR: ${userData.pnr}) went live.`);
            broadcastLiveUsers();
        } catch (err) {
            console.error("Error in go-live:", err);
        }
    });

    // 2. Stop Live (Manual or Disconnect)
    socket.on('stop-live', async () => {
        try {
            await User.findOneAndUpdate({ socketId: socket.id }, { isLive: false });
            broadcastLiveUsers();
        } catch (err) {
            console.error("Error in stop-live:", err);
        }
    });

    // 3. Request Exchange
    socket.on('request-exchange', async ({ targetSocketId, requesterDetails }) => {
        try {
            console.log(`Exchange requested from ${socket.id} to ${targetSocketId}`);

            // Fetch requester PNR from DB just in case we need it for record
            const requesterUser = await User.findOne({ socketId: socket.id });

            // Save exchange request to DB
            const newExchange = new Exchange({
                requesterSocketId: socket.id,
                targetSocketId: targetSocketId,
                requesterName: requesterDetails.name,
                targetName: requesterDetails.targetName,
                requesterSeat: requesterDetails.seatNo,
                targetSeat: requesterDetails.targetSeat,
                status: 'pending'
            });

            // We might need to fetch target user details to fill targetName if not provided
            const targetUser = await User.findOne({ socketId: targetSocketId });
            if (targetUser) {
                newExchange.targetName = targetUser.passengerName;
            } else {
                newExchange.targetName = requesterDetails.targetName || "Unknown";
            }

            await newExchange.save();
            console.log(`Exchange created in DB: ${newExchange._id}`);

            io.to(targetSocketId).emit('exchange-request', {
                exchangeId: newExchange._id,
                requesterSocketId: socket.id,
                requester: requesterDetails
            });
        } catch (err) {
            console.error("Error in request-exchange:", err);
        }
    });

    // 4. Respond to Exchange (Accept/Reject)
    socket.on('respond-exchange', async ({ exchangeId, accepted }) => {
        try {
            const exchange = await Exchange.findById(exchangeId);
            if (!exchange) return;

            if (accepted) {
                const now = new Date();
                const expiresAt = new Date(now.getTime() + 30 * 1000); // 30 seconds from now

                exchange.status = 'accepted';
                exchange.acceptedAt = now;
                exchange.expiresAt = expiresAt;
                await exchange.save();

                // --- NEW: Update User Records in DB (Swap Seats & Stop Live) ---
                const requesterUser = await User.findOne({ socketId: exchange.requesterSocketId });
                const targetUser = await User.findOne({ socketId: exchange.targetSocketId });

                if (requesterUser && targetUser) {
                    // Swap Seats
                    const tempSeat = requesterUser.seatNo;
                    requesterUser.seatNo = targetUser.seatNo;
                    targetUser.seatNo = tempSeat;

                    // Stop Live
                    requesterUser.isLive = false;
                    targetUser.isLive = false;

                    await requesterUser.save();
                    await targetUser.save();

                    console.log(`Database updated: ${requesterUser.passengerName} (Seat ${requesterUser.seatNo}) <-> ${targetUser.passengerName} (Seat ${targetUser.seatNo})`);
                }
                // ---------------------------------------------------------------

                // Notify both parties
                const payload = {
                    exchangeId,
                    status: 'accepted',
                    expiresAt: expiresAt.toISOString(),
                    swappedSeat: {
                        requesterNewSeat: exchange.targetSeat,
                        targetNewSeat: exchange.requesterSeat
                    },
                    requester: {
                        name: exchange.requesterName,
                        seatNo: exchange.requesterSeat,
                        targetSeat: exchange.targetSeat
                    }
                };

                io.to(exchange.requesterSocketId).emit('exchange-accepted', payload);
                io.to(exchange.targetSocketId).emit('exchange-accepted', payload);

                // Broadcast updated live users list (since 2 users are no longer live)
                broadcastLiveUsers();

                console.log(`Exchange ${exchangeId} accepted. DB updated. Broadcast sent.`);

            } else {
                exchange.status = 'rejected';
                await exchange.save();

                io.to(exchange.requesterSocketId).emit('exchange-rejected', { exchangeId });
            }
        } catch (err) {
            console.error("Error in respond-exchange:", err);
        }
    });

    // 5. Cancel Exchange (within 5 mins)
    socket.on('cancel-exchange', async ({ exchangeId }) => {
        try {
            const exchange = await Exchange.findById(exchangeId);
            if (!exchange) return;

            const now = new Date();
            if (exchange.status === 'accepted' && now < exchange.expiresAt) {
                exchange.status = 'cancelled';
                await exchange.save();

                io.to(exchange.requesterSocketId).emit('exchange-cancelled', { exchangeId });
                io.to(exchange.targetSocketId).emit('exchange-cancelled', { exchangeId });
                console.log(`Exchange ${exchangeId} cancelled by user.`);
            } else {
                // Either not accepted or timer expired
                socket.emit('error', { message: "Cannot cancel exchange: Timer expired or invalid status." });
            }
        } catch (err) {
            console.error("Error in cancel-exchange:", err);
        }
    });

    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        try {
            await User.findOneAndUpdate({ socketId: socket.id }, {
                isLive: false,
                isLoggedIn: false // Mark session as ended
            });
            broadcastLiveUsers();
        } catch (err) {
            console.error("Error disconnecting user:", err);
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
