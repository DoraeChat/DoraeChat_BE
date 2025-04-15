const socketIo = require("socket.io");
const SocketHandler = require("./socketHandler");

function setupSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  const socketHandler = new SocketHandler(io);

  return {
    io,
    socketHandler,
  };
}

module.exports = setupSocket;
