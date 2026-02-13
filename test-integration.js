import { io } from "socket.io-client";

// Connect to the running server
const URL = "http://localhost:5000";

const clientA = io(URL, { autoConnect: false });
const clientB = io(URL, { autoConnect: false });

console.log("Starting Integration Test...");

// Helper to wrap async operations
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runTest() {
    try {
        // 1. Connect Clients
        clientA.connect();
        clientB.connect();

        // Wait for connection
        await new Promise(resolve => {
            let connected = 0;
            const onConnect = () => {
                connected++;
                if (connected === 2) resolve();
            };
            clientA.on("connect", onConnect);
            clientB.on("connect", onConnect);
        });

        console.log("✅ Both clients connected.");

        // 2. Go Live
        const userA = { passengerName: "UserA", coach: "B1", seatNo: 10, class: "3A", bookingStatus: "CNF" };
        const userB = { passengerName: "UserB", coach: "B1", seatNo: 20, class: "3A", bookingStatus: "CNF" };

        clientA.emit("go-live", userA);
        clientB.emit("go-live", userB);

        await sleep(500);
        console.log("✅ Go Live events emitted.");

        // 3. Setup B listener
        const requestReceived = new Promise((resolve, reject) => {
            const tm = setTimeout(() => {
                reject(new Error("Timeout waiting for exchange-request"));
            }, 5000);

            clientB.on("exchange-request", (data) => {
                clearTimeout(tm);
                console.log("✅ User B received exchange request:", data);
                resolve(data);
            });
        });

        // 4. Initiate Exchange (A -> B)
        console.log(`User A (${clientA.id}) requesting exchange with User B (${clientB.id})`);
        clientA.emit("request-exchange", {
            targetSocketId: clientB.id,
            requesterDetails: { name: userA.passengerName, seatNo: userA.seatNo, targetSeat: userB.seatNo }
        });

        const requestData = await requestReceived;

        // 5. B accepts request
        console.log("User B accepting request...");
        clientB.emit("respond-exchange", {
            exchangeId: requestData.exchangeId,
            accepted: true
        });

        // 6. Verify success
        const successPromise = new Promise(resolve => {
            let count = 0;
            const check = (user, data) => {
                console.log(`✅ ${user} received exchange-accepted:`, data.status);
                count++;
                if (count === 2) resolve();
            };
            clientA.on("exchange-accepted", (d) => check("User A", d));
            clientB.on("exchange-accepted", (d) => check("User B", d));
        });

        await successPromise;
        console.log("🎉 Integration Test Passed: Exchange Flow Completed Successfully.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Test Failed:", error);
        process.exit(1);
    }
}

runTest();
