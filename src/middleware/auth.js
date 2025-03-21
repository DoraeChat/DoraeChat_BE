const User = require("../models/User");
const tokenUtils = require("../utils/tokenUtils");

const auth = async (req, res, next) => {
  try {
    // Kiểm tra xem có header Authorization không
    const authHeader = req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ status: 401, error: "Unauthorized: No token provided" });
    }
    // Lấy token từ header Authorization
    const token = authHeader.replace("Bearer ", "");

    // Xác thực token
    let data;
    try {
      data = tokenUtils.verifyToken(token);
    } catch (err) {
      return res
        .status(401)
        .json({ status: 401, error: "Unauthorized: Invalid or expired token" });
    }

    // Kiểm tra xem người dùng có tồn tại và còn hoạt động không
    const user = await User.findOne({
      _id: data._id,
      isActived: true,
    });

    if (!user) {
      return res.status(401).json({
        status: 401,
        error: "Unauthorized: User not found or inactive",
      });
    }

    // Kiểm tra xem token có bị thu hồi không
    const { timeRevokeToken } = user;
    if (data.createdAt < timeRevokeToken) {
      return res
        .status(401)
        .json({ status: 401, error: "Unauthorized: Token revoked" });
    }

    // Kiểm tra xem nguồn gốc của yêu cầu có khớp với nguồn gốc của token không
    const source = req.headers["user-agent"];
    if (!data.source || source !== data.source) {
      console.log("source !== data.source:", source !== data.source);
      return res
        .status(401)
        .json({ status: 401, error: "Unauthorized: Invalid source" });
    }

    req._id = data._id;

    next();
  } catch (error) {
    console.error("Authentication Error:", error);
    res.status(500).json({ status: 500, error: "Internal Server Error" });
  }
};

module.exports = auth;
