const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const User = require('./models/User');
const Exchange = require('./models/Exchange');

const app = express();
corOptions = {
    origin: ["https://smartrail-ttjy.onrender.com", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
}
app.use(cors(corOptions));
app.use(express.json());

// API Routes

// Pre-Check User (Validate before OTP)
// Pre-Check User (Validate before OTP)
app.post('/api/validate-user', async (req, res) => {
    try {
        const { pnr, mobile } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ pnr, mobile });

        if (existingUser) {
            if (existingUser.isLoggedIn) {
                return res.status(403).json({ message: "User already logged in on another device." });
            }

            // Construct payload similar to PnrRecord for frontend
            const userData = {
                PnrNumber: existingUser.pnr,
                MobileNumber: existingUser.mobile,
                TrainNo: existingUser.trainNo,
                TrainName: existingUser.trainName,
                JourneyClass: existingUser.class,
                Passenger: [{
                    PassengerName: existingUser.passengerName,
                    SeatNo: existingUser.seatNo,
                    Coach: existingUser.coach,
                    BookingStatus: existingUser.bookingStatus
                }]
            };

            return res.status(200).json({ found: true, data: userData, message: "User found in database." });
        }

        // User not found in DB -> Frontend should use MOCK_PNR_DATABASE fallback
        return res.status(200).json({ found: false, message: "User not found in DB. Proceed to Mock check." });

    } catch (err) {
        console.error("Validation error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { pnr, mobile, force, ...otherDetails } = req.body;

        // Find existing user or create new one
        // We use findOneAndUpdate with upsert to ensure we have a record
        const query = { pnr, mobile };
        let update = {
            isLoggedIn: true, // Strict enforcement: Lock immediately.
            lastActive: new Date()
        };

        // If other details provided (from mock DB on frontend), update them
        if (otherDetails.passengerName) {
            update = { ...update, ...otherDetails };
        }

        // 1. Check if user exists and is already logged in
        const existingUser = await User.findOne({ pnr, mobile });

        if (existingUser && existingUser.isLoggedIn && !force) {
            return res.status(403).json({ message: "User already logged in on another device." });
        }

        let user;

        // 2. Perform Update or Upsert
        if (otherDetails.passengerName) {
            // Full details provided -> Upsert (Create or Update)
            update.socketId = "pending";

            user = await User.findOneAndUpdate(
                query,
                update,
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        } else {
            // No details provided -> Standard Login (Must exist)
            if (!existingUser) {
                return res.status(404).json({ message: "Invalid PNR or Mobile Number" });
            }

            // Update existing user
            existingUser.isLoggedIn = true; // Strict enforcement: Lock immediately.
            existingUser.lastActive = new Date();
            existingUser.socketId = "pending"; // Reset socket binding
            user = await existingUser.save();
        }

        const pnrRecord = {
            PnrNumber: user.pnr,
            MobileNumber: user.mobile,
            TrainNo: user.trainNo,
            TrainName: user.trainName,
            JourneyClass: user.class,
            isLive: user.isLive, // Return persistence status
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

app.post('/api/logout', async (req, res) => {
    try {
        const { pnr } = req.body;
        if (!pnr) {
            return res.status(400).json({ message: "PNR is required" });
        }

        const user = await User.findOneAndUpdate(
            { pnr },
            { isLoggedIn: false, isLive: false }, // Reset both login and live status
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log(`User logged out: ${pnr}`);
        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../dist')));

// Everything else requests causes index.html to be returned
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
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

            // Prevent duplicate requests
            const existingExchange = await Exchange.findOne({
                requesterSocketId: socket.id,
                targetSocketId: targetSocketId,
                status: 'pending'
            });

            if (existingExchange) {
                console.log("Pending request already exists.");
                return;
            }

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

    // 3.5 Cancel Sent Request (Requester cancels before acceptance)
    socket.on('cancel-sent-request', async ({ targetSocketId }) => {
        try {
            console.log(`Cancelling request from ${socket.id} to ${targetSocketId}`);
            const exchange = await Exchange.findOneAndDelete({
                requesterSocketId: socket.id,
                targetSocketId: targetSocketId,
                status: 'pending'
            });

            if (exchange) {
                io.to(targetSocketId).emit('request-cancelled', { exchangeId: exchange._id });
                console.log(`Request cancelled: ${exchange._id}`);
            }
        } catch (err) {
            console.error("Error in cancel-sent-request:", err);
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

                let requesterOriginalCoach = '';
                let targetOriginalCoach = '';

                if (requesterUser && targetUser) {
                    requesterOriginalCoach = requesterUser.coach;
                    targetOriginalCoach = targetUser.coach;

                    // Swap Seats
                    const tempSeat = requesterUser.seatNo;
                    requesterUser.seatNo = targetUser.seatNo;
                    targetUser.seatNo = tempSeat;

                    // Swap Coach
                    const tempCoach = requesterUser.coach;
                    requesterUser.coach = targetUser.coach;
                    targetUser.coach = tempCoach;

                    // Stop Live
                    requesterUser.isLive = false;
                    targetUser.isLive = false;

                    await requesterUser.save();
                    await targetUser.save();
                }

                // --- NEW: Auto-Cancel Conflicting Requests ---
                // Find all other pending exchanges involving these users
                const conflictingExchanges = await Exchange.find({
                    $or: [
                        { requesterSocketId: exchange.requesterSocketId },
                        { targetSocketId: exchange.requesterSocketId },
                        { requesterSocketId: exchange.targetSocketId },
                        { targetSocketId: exchange.targetSocketId }
                    ],
                    status: 'pending',
                    _id: { $ne: exchange._id } // Exclude the accepted one
                });

                for (const conflict of conflictingExchanges) {
                    conflict.status = 'cancelled';
                    await conflict.save();

                    // Notify involved parties
                    const cancelPayload = {
                        exchangeId: conflict._id,
                        targetSocketId: conflict.targetSocketId,
                        requesterSocketId: conflict.requesterSocketId
                    };
                    io.to(conflict.requesterSocketId).emit('request-cancelled', cancelPayload);
                    io.to(conflict.targetSocketId).emit('request-cancelled', cancelPayload);
                    console.log(`Auto-cancelled conflicting request: ${conflict._id}`);
                }

                // Notify both parties of acceptance
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
                        targetSeat: exchange.targetSeat,
                        // Add reason/preference if available in exchange model (optional but good)
                        reason: exchange.reason,
                        preference: exchange.preference
                    },
                    // Add Coach Details for History/Receipt
                    startCoach: requesterOriginalCoach, // User A's original coach
                    endCoach: targetOriginalCoach       // User B's original coach (User A's new coach location)
                };

                io.to(exchange.requesterSocketId).emit('exchange-accepted', payload);
                io.to(exchange.targetSocketId).emit('exchange-accepted', payload);

                // Broadcast updated live users list (since 2 users are no longer live)
                broadcastLiveUsers();

                // Cleanup: Cancel other pending requests involving these users?
                // Ideally yes, but for now simple flow.

            } else {
                exchange.status = 'rejected';
                await exchange.save();

                io.to(exchange.requesterSocketId).emit('exchange-rejected', {
                    exchangeId,
                    targetSocketId: exchange.targetSocketId
                });
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

    // 6. Cancel Sent Request
    socket.on('cancel-exchange-request', async ({ targetSocketId }) => {
        try {
            const exchange = await Exchange.findOne({
                requesterSocketId: socket.id,
                targetSocketId: targetSocketId,
                status: 'pending'
            });

            if (exchange) {
                exchange.status = 'cancelled';
                await exchange.save();

                const payload = {
                    exchangeId: exchange._id,
                    targetSocketId: targetSocketId,
                    requesterSocketId: socket.id
                };

                io.to(targetSocketId).emit('request-cancelled', payload);
                socket.emit('request-cancelled', payload); // Confirm to sender too
                console.log(`Request cancelled by sender: ${exchange._id}`);
            }
        } catch (err) {
            console.error("Error in cancel-exchange-request:", err);
        }
    });


    socket.on('disconnect', async () => {
        console.log('User disconnected:', socket.id);
        try {
            await User.findOneAndUpdate({ socketId: socket.id }, {
                isLive: false,
                isLoggedIn: false // Mark session as endedd
            });

            // --- NEW: Auto-Cancel Pending Requests on Disconnect ---
            const pendingExchanges = await Exchange.find({
                $or: [{ requesterSocketId: socket.id }, { targetSocketId: socket.id }],
                status: 'pending'
            });

            for (const ex of pendingExchanges) {
                ex.status = 'cancelled';
                await ex.save();

                // Notify the OTHER party
                const otherSocketId = ex.requesterSocketId === socket.id ? ex.targetSocketId : ex.requesterSocketId;
                io.to(otherSocketId).emit('request-cancelled', { exchangeId: ex._id });
                console.log(`Auto-cancelled pending request due to disconnect: ${ex._id}`);
            }

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
