const axios = require("axios");
const config = require("../config/metered");

if (!config.METERED_DOMAIN) {
    throw new Error("Please specify the METERED_DOMAIN in config");
}
if (!config.METERED_SECRET_KEY) {
    throw new Error("Please specify the METERED_SECRET_KEY in config");
}

const METERED_DOMAIN = config.METERED_DOMAIN;
const METERED_SECRET_KEY = config.METERED_SECRET_KEY;

async function createMeetingRoom(roomName) {
    const options = {
        method: "POST",
        url: `https://${METERED_DOMAIN}/api/v1/room/`,
        params: {
            secretKey: METERED_SECRET_KEY,
        },
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        data: {
            roomName,
        },
    };

    try {
        const { data } = await axios.request(options);
        return data;
    } catch (error) {
        if (error.response?.status === 400 && error.response.data?.message.includes("already exist")) {
            return { roomName };
        }
        console.error("Error creating meeting room:", error);
        throw error;
    }
}


async function validateMeetingRoom(meetingId) {
    const options = {
        method: 'GET',
        url: `https://${METERED_DOMAIN}/api/v1/room/${meetingId}`,
        params: { secretKey: METERED_SECRET_KEY },
        headers: { Accept: 'application/json' },
    };

    try {
        const { data } = await axios.request(options);
        return { exists: true, room: data };
    } catch (error) {
        if (error.response?.status === 400 && error.response.data?.message === "room not found") {
            return { exists: false };
        }
        console.error("Unexpected error when validating meeting room:", error);
        throw error;
    }
}

function getMeteredDomain() {
    return METERED_DOMAIN;
}

async function deleteMeetingRoom(meetingId) {
    const options = {
        method: 'DELETE',
        url: `https://${METERED_DOMAIN}/api/v1/room/${meetingId}`,
        params: { secretKey: METERED_SECRET_KEY },
        headers: { Accept: 'application/json' },
    };

    const { data } = await axios.request(options);
    return data;
}


module.exports = {
    createMeetingRoom,
    validateMeetingRoom,
    getMeteredDomain,
    deleteMeetingRoom
};
