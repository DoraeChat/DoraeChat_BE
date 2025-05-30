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
      default: function () {
        const firstChar = this.name ? this.name.charAt(0).toUpperCase() : "A";
        const width = 150;
        const height = 150;
        const format = "png";

        const lightColors = [
          "F0F8FF",
          "FAEBD7",
          "F5F5DC",
          "FFFACD",
          "FAF0E6",
          "FFE4C4",
          "FFDAB9",
          "EEE8AA",
          "F0FFF0",
          "F5FFFA",
          "F0FFFF",
          "F8F8FF",
          "F5F5F5",
          "FFFFE0",
          "FFFFF0",
          "FFFAFA",
          "7FFFD4",
          "ADD8E6",
          "B0E0E6",
          "AFEEEE",
          "E0FFFF",
          "87CEFA",
          "B0C4DE",
          "D3D3D3",
          "98FB98",
          "F5F5DC",
          "FAF0E6",
          "FFF8DC",
          "FFEBCD",
          "FFF5EE",
        ];
        const darkColors = [
          "8B0000",
          "A0522D",
          "800000",
          "8B4513",
          "4682B4",
          "00008B",
          "191970",
          "008080",
          "006400",
          "556B2F",
          "808000",
          "8B8682",
          "2F4F4F",
          "000000",
          "228B22",
          "3CB371",
          "2E8B57",
          "483D8B",
          "6A5ACD",
          "7B68EE",
          "4169E1",
          "6495ED",
          "00CED1",
          "40E0D0",
          "008B8B",
        ];

        const allColors = [...lightColors, ...darkColors];
        const randomIndex = Math.floor(Math.random() * allColors.length);
        const backgroundColor = allColors[randomIndex];

        const getRelativeLuminance = (hexColor) => {
          const r = parseInt(hexColor.slice(0, 2), 16) / 255;
          const g = parseInt(hexColor.slice(2, 4), 16) / 255;
          const b = parseInt(hexColor.slice(4, 6), 16) / 255;
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const luminance = getRelativeLuminance(backgroundColor);
        const textColor = luminance > 0.5 ? "000000" : "ffffff";

        return `https://placehold.jp/70/${backgroundColor}/${textColor}/${width}x${height}.${format}?text=${firstChar}&css=%7B%22font-weight%22%3A%22%20bold%22%7D`;
      },
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
    const user = await User.findOne({ username }).select("+password");

    if (!user) throw new CustomError("Invalid login information", 400);
    if (!user.isActived)
      throw new CustomError("Tài khoản chưa được kích hoạt", 400);

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch)
      throw new CustomError("Invalid login information", 400);

    const userData = user.toObject();
    delete userData.password;
    return userData;
  } catch (error) {
    throw error instanceof CustomError
      ? error
      : new CustomError("Invalid login information", 400);
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
    phoneNumber,
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
    phoneNumber,
  };
};

userSchema.statics.existsByUsername = async (username) => {
  if (!username || typeof username !== "string") {
    throw new Error("Username is invalid");
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

  const {
    _id,
    name,
    dateOfBirth,
    gender,
    avatar,
    avatarColor,
    coverImage,
    username,
  } = user;

  return {
    _id,
    name,
    dateOfBirth,
    gender,
    avatar,
    avatarColor,
    coverImage,
    username,
  };
};

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

userSchema.statics.getByMemberId = async (memberId) => {
  const Member = require("./Member");

  const member = await Member.findById(memberId);
  if (!member) throw new NotFoundError("Member");
  const user = await User.findById(member.userId).lean();
  if (!user) throw new NotFoundError("User");
  return {
    _id: user._id,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    avatarColor: user.avatarColor,
    avatar: user.avatar,
    dateOfBirth: dateUtils.toObject(user.dateOfBirth),
    gender: user.gender,
    phoneNumber: user.phoneNumber,
    email: user.email,
    coverImage: user.coverImage,
  };
};

const User = mongoose.model("User", userSchema);
module.exports = User;
