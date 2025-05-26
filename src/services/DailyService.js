// services/DailyService.js
require("dotenv").config();
const fetch = require("node-fetch");
const DAILY_API_KEY = process.env.DAILY_API_KEY;

async function getOrCreateRoom(conversationId) {
  const roomName = `chat-${conversationId}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DAILY_API_KEY}`,
  };

  // 1) Try to GET an existing room
  let res = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, { headers });
  if (res.ok) {
    return res.json();
  }

  // if it's anything besides a 404, something else went wrong
  if (res.status !== 404) {
    throw new Error(`Daily GET error: ${await res.text()}`);
  }

  // 2) Not found → create a new room
  res = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: roomName,
      properties: {
        // expires in 1 hour
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Daily POST error: ${await res.text()}`);
  }
  return res.json();
}

module.exports = { getOrCreateRoom };
