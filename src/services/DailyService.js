require("dotenv").config();
const fetch = require("node-fetch");
const DAILY_API_KEY = process.env.DAILY_API_KEY;

async function getOrCreateRoom(conversationId) {
  const roomName = `chat-${conversationId}`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DAILY_API_KEY}`,
  };

  let res = await fetch(`https://api.daily.co/v1/rooms/${roomName}`, { headers });
  if (res.ok) {
    return res.json();
  }

  if (res.status !== 404) {
    throw new Error(`Daily GET error: ${await res.text()}`);
  }

  res = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: roomName,
    }),
  });
  if (!res.ok) {
    throw new Error(`Daily POST error: ${await res.text()}`);
  }
  return res.json();
}

module.exports = { getOrCreateRoom };
