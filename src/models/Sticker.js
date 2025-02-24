const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require('../exception/NotFoundError');

const stickerSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    stickers: { type: [String], default: [] },
}, { timestamps: true });

stickerSchema.index({ name: 1 });

stickerSchema.statics.getById = async (_id) => {
    if (!ObjectId.isValid(_id)) throw new NotFoundError('Invalid Sticker Group ID');
    const stickerGroup = await this.findById(_id).lean();
    if (!stickerGroup) throw new NotFoundError('Sticker group');
    return stickerGroup;
};

const Sticker = mongoose.model('Sticker', stickerSchema);

module.exports = Sticker;