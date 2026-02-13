const io = require('socket.io-client');
const axios = require('axios');

const SOCKET_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api/login';

const TEST_USER = {
    pnr: "TEST_PNR_001",
    mobile: "9999999999",
    passengerName: "Test User",
    coach: "B1",
    seatNo: 1,
    trainNo: "12345",
    trainName: "TEST EXPRESS",
    class: "3A"
};

async function runTest() {
    console.log("Starting Session Enforcement Test...");

    // 1. Connect Socket and Go Live (Session Start)
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
        console.log("Socket connected:", socket.id);
        socket.emit('go-live', TEST_USER);
    });

    // Wait for go-live to process
    await new Promise(r => setTimeout(r, 1000));

    try {
        // 2. Attempt Login (Should Fail - 403)
        console.log("Attempting Login while Socket Active...");
        await axios.post(API_URL, { pnr: TEST_USER.pnr, mobile: TEST_USER.mobile });
        console.error("❌ FAILED: Login succeeded but should have been blocked!");
    } catch (err) {
        if (err.response && err.response.status === 403) {
            console.log("✅ PASSED: Login blocked with 403 as expected.");
        } else {
            console.error("❌ FAILED: Unexpected error:", err.message);
        }
    }

    // 3. Disconnect Socket (Session End)
    console.log("Disconnecting Socket...");
    socket.disconnect();

    // Wait for disconnect to process
    await new Promise(r => setTimeout(r, 1000));

    try {
        // 4. Attempt Login Again (Should Succeed - 200)
        console.log("Attempting Login after Socket Disconnect...");
        const res = await axios.post(API_URL, { pnr: TEST_USER.pnr, mobile: TEST_USER.mobile });
        if (res.status === 200) {
            console.log("✅ PASSED: Login succeeded after disconnect.");
        } else {
            console.error(`❌ FAILED: Login returned status ${res.status}`);
        }
    } catch (err) {
        console.error("❌ FAILED: Login failed after disconnect:", err.message);
        if (err.response) console.error("Response:", err.response.data);
    }

    console.log("Test Complete.");
}

runTest();
