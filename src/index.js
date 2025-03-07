require("dotenv").config();
const express = require("express");
const connection = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/UserRoutes");
const handleError = require("./middleware/handleError");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
  });
});

(async () => {
  try {
    await connection();

    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use(handleError);
    app.listen(port, () => {
      console.log(`Backend Nodejs App listening on port ${port}`);
    });
  } catch (error) {
    console.log(">>> Error connect to DB: ", error);
  }
})();
