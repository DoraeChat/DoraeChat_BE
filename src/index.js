require("dotenv").config();
const express = require("express");
const http = require("http");
const connection = require("./config/database");
const authRoutes = require("./routes/AuthRoutes");
const userRoutes = require("./routes/UserRoutes");
const meRoutes = require("./routes/MeRoutes");
const qrRoutes = require("./routes/QRRoutes");
const channelRoutes = require("./routes/ChannelRoutes");
const pinMessageRoutes = require("./routes/PinMessageRoutes");
const voteRoutes = require("./routes/VoteRoutes");
const colorRoutes = require("./routes/ColorRoutes");
const classifyRoutes = require("./routes/ClassifyRoutes");
const cloudinaryRoutes = require("./routes/CloudinaryRoutes");
const memberRoutes = require("./routes/MemberRoutes");

const handleError = require("./middleware/handleError");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3001;

const auth = require("./middleware/auth");

app.use(cors());
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));

const setupSocket = require("./socket");

const server = http.createServer(app);

const { io, socketHandler } = setupSocket(server);

app.set("io", io);
app.set("socketHandler", socketHandler);

const friendRouter = require("./routes/FriendRoutes")(socketHandler);
const messageRouter = require("./routes/MessageRoutes")(socketHandler);
const conversationRoutes = require("./routes/ConversationRoutes")(
  socketHandler
);
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
    app.use("/api/classifies", classifyRoutes);
    app.use("/api/uploads", cloudinaryRoutes);
    app.use("/api/members", memberRoutes);
    app.use(handleError);
    server.listen(port, () => {
      console.log(`Backend Nodejs App listening on port ${port}`);
    });
  } catch (error) {
    console.log(">>> Error connect to DB: ", error);
  }
})();
