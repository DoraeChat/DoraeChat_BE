const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");
const CustomError = require("../exceptions/CustomError");
const NotFoundError = require("../exceptions/NotFoundError");
const dateUtils = require("../utils/dateUtils");

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    avatarColor: {
      type: String,
      default: "white",
    },
    coverImage: String,
    dateOfBirth: {
      type: Date,
      default: () => new Date("2000-01-01"),
    },
    gender: {
      type: Boolean,
      default: false,
    },
    refreshTokens: {
      type: [
        {
          token: String,
          source: String,
        },
      ],
      default: [],
    },
    phoneBooks: {
      type: [{ name: String, phone: String }],
      default: [],
    },
    isActived: Boolean,
    timeRevokeToken: {
      type: Date,
      default: () => new Date(),
    },
    hobbies: {
      type: [String],
      default: [],
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

userSchema.index({ username: 1, isActived: 1 });
userSchema.index({ isActived: 1 });

userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
  user.password = await bcrypt.hash(user.password, saltRounds);
  next();
});

userSchema.statics.findByCredentials = async (username, password) => {
  try {
    const user = await User.findOne({
      username,
      isActived: true,
    }).select("+password");

    if (!user) throw new CustomError("Thông tin đăng nhập không hợp lệ", 401);

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch)
      throw new CustomError("Thông tin đăng nhập không hợp lệ", 401);

    const userData = user.toObject();
    delete userData.password;
    return userData;
  } catch (error) {
    throw error instanceof CustomError
      ? error
      : new CustomError("Thông tin đăng nhập không hợp lệ", 401);
  }
};
userSchema.statics.existsById = async (_id) =>
  await User.exists({ _id, isActived: true });

userSchema.statics.checkByIds = async (ids, message = "User") => {
  const users = await User.find({
    _id: { $in: ids },
    isActived: true,
  }).lean();
  if (users.length !== ids.length) throw new NotFoundError(message);
};

userSchema.statics.getById = async (_id, message = "User") => {
  const user = await User.findOne({
    _id,
    isActived: true,
  }).lean();
  if (!user) throw new NotFoundError(message);
  const {
    name,
    username,
    dateOfBirth,
    gender,
    avatar,
    avatarColor,
    coverImage,
    phoneBooks,
    hobbies,
  } = user;
  return {
    _id,
    name,
    username,
    dateOfBirth: dateUtils.toObject(dateOfBirth),
    gender,
    avatar,
    avatarColor,
    coverImage,
    phoneBooks,
    hobbies,
  };
};

userSchema.statics.existsByUsername = async (username) => {
  if (!username || typeof username !== "string") {
    throw new Error("Username không hợp lệ");
  }
  const exists = await User.exists({ username: username.toLowerCase() });
  return exists;
};

userSchema.statics.findByUsername = async (username, message = "User") => {
  const user = await User.findOne({ username, isActived: true }).lean();
  if (!user) throw new NotFoundError(message);
  const { _id, name, dateOfBirth, gender, avatar, avatarColor, coverImage } =
    user;
  return {
    _id,
    name,
    username,
    dateOfBirth: dateUtils.toObject(dateOfBirth),
    gender,
    avatar,
    avatarColor,
    coverImage,
  };
};

userSchema.statics.getUserByPhoneNumber = async (phoneNumber) => {
  const user = await User.findOne({
    phoneNumber,
    isActived: true,
  }).lean();
  if (!user) throw new NotFoundError("User");

  const { _id, name, dateOfBirth, gender, avatar, avatarColor, coverImage, username } =
    user;

  return { _id, name, dateOfBirth, gender, avatar, avatarColor, coverImage, username };
}

userSchema.statics.checkById = async (_id, message = "User") => {
  const user = await User.findOne({ _id, isActived: true });
  if (!user) throw new NotFoundError(message);
  return user;
};

userSchema.statics.getSummaryById = async (_id, message = "User") => {
  const user = await User.findOne({ _id, isActived: true })
    .select("_id name avatar avatarColor")
    .lean();
  if (!user) throw new NotFoundError(message);
  return user;
};

// add user
userSchema.statics.addUser = async (user) => {
  const newUser = await User.create(user);
  return newUser;
};

// update user
userSchema.statics.updateUser = async (_id, user) => {
  const updatedUser = await User.findOneAndUpdate(
    { _id },
    { $set: user },
    { new: true }
  );
  if (!updatedUser) throw new NotFoundError("User");
  return updatedUser;
};

// delete user
userSchema.statics.deleteUser = async (_id) => {
  const deletedUser = await User.findOneAndUpdate(
    { _id },
    { $set: { isActived: false } },
    { new: true }
  );
  if (!deletedUser) throw new NotFoundError("User");
  return deletedUser;
};

// update avatar user
userSchema.statics.updateAvatarUser = async (_id, avatar) => {
  const updatedUser = await User.findOneAndUpdate(
    { _id },
    { $set: { avatar } },
    { new: true }
  );
  return updatedUser;
};

// update cover user
userSchema.statics.updateCoverUser = async (_id, coverImage) => {
  const updatedUser = await User.findOneAndUpdate(
    { _id },
    { $set: { coverImage } },
    { new: true }
  );
  return updatedUser;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
