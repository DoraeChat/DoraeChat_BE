const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcryptjs');
const CustomError = require('../exception/CustomError');
const NotFoundError = require('../exception/NotFoundError');
const dateUtils = require('../utils/dateUtils');

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
            default: '',
        },
        avatarColor: {
            type: String,
            default: 'white',
        },
        coverImage: String,
        type: Boolean,
        dateOfBirth: {
            type: Date,
            default: () => new Date('2000-01-01'),
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
        otp: String,
        otpTime: Date,
        isActived: Boolean,
        isDeleted: {
            type: Boolean,
            default: false,
        },
        timeRevokeToken: {
            type: Date,
            default: () => new Date(),
        },
    },
    { timestamps: true }
);

userSchema.index({ username: 1, isActived: 1 });
userSchema.index({ isActived: 1, isDeleted: 1 });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
});

userSchema.statics.findByCredentials = async (username, password) => {
    const user = await this.findOne(
        {
            username,
            isActived: true,
            isDeleted: false
        }).select('+password');
    if (!user) throw new NotFoundError('User');

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) throw new CustomError('Password invalid');
    return user;
};

userSchema.statics.existsById = async (_id) => await this.exists({ _id, isActived: true });

userSchema.statics.checkByIds = async (ids, message = 'User') => {
    const users = await this.find(
        {
            _id: { $in: ids },
            isActived: true,
            isDeleted: false
        }).lean();
    if (users.length !== ids.length) throw new NotFoundError(message);
};

userSchema.statics.getById = async (_id, message = 'User') => {
    const user = await this.findOne(
        {
            _id,
            isActived: true
        }).lean();
    if (!user) throw new NotFoundError(message);
    const { name, username, dateOfBirth, gender, avatar, avatarColor, coverImage, phoneBooks } = user;
    return { _id, name, username, dateOfBirth: dateUtils.toObject(dateOfBirth), gender, avatar, avatarColor, coverImage, phoneBooks };
};

userSchema.statics.existsByUsername = async (username) => await this.exists({ username, isActived: true });

userSchema.statics.findByUsername = async (username, message = 'User') => {
    const user = await this.findOne({ username, isActived: true }).lean();
    if (!user) throw new NotFoundError(message);
    const { _id, name, dateOfBirth, gender, avatar, avatarColor, coverImage } = user;
    return { _id, name, username, dateOfBirth: dateUtils.toObject(dateOfBirth), gender, avatar, avatarColor, coverImage };
};

userSchema.statics.checkById = async (_id, message = 'User') => {
    const user = await this.findOne({ _id, isActived: true });
    if (!user) throw new NotFoundError(message);
    return user;
};

userSchema.statics.getSummaryById = async (_id, message = 'User') => {
    const user = await this.findOne({ _id, isActived: true }).select('_id name avatar avatarColor').lean();
    if (!user) throw new NotFoundError(message);
    return user;
};

const User = mongoose.model('User', userSchema);
module.exports = User;