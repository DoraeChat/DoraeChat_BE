require("dotenv").config();
const express = require("express");
const http = require("http");
const connection = require("./config/database");
const authRoutes = require("./routes/AuthRoutes");
const userRoutes = require("./routes/UserRoutes");
const meRoutes = require("./routes/MeRoutes");
const conversationRoutes = require("./routes/ConversationRoutes");
const qrRoutes = require("./routes/QRRoutes");
const channelRoutes = require("./routes/ChannelRoutes");
const pinMessageRoutes = require("./routes/PinMessageRoutes");
const voteRoutes = require("./routes/VoteRoutes");
const colorRoutes = require("./routes/ColorRoutes");  

const handleError = require("./middleware/handleError");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3001;

const auth = require("./middleware/auth");

const socketIO = require("socket.io");
const socket = require("./config/socket");

app.use(cors());
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

const server = http.createServer(app);
const io = socketIO(server);
socket(io);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
});

const friendRouter = require("./routes/FriendRoutes")(io);
const messageRouter = require("./routes/MessageRoutes")(io);
(async () => {
  try {
    await connection();

    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/me", meRoutes);
    app.use("/api/conversations", auth, conversationRoutes);
    app.use("/api/messages", auth, messageRouter);
    app.use("/api/friends", auth, friendRouter);
    app.use("/api/qr", qrRoutes);
    app.use("/api/channels", channelRoutes);
    app.use("/api/pin-messages", pinMessageRoutes);
    app.use("/api/votes", voteRoutes);
    app.use("/api/colors", colorRoutes);
    app.use(handleError);
    server.listen(port, () => {
      console.log(`Backend Nodejs App listening on port ${port}`);
    });
  } catch (error) {
    console.log(">>> Error connect to DB: ", error);
  }
})();
