const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require('../exception/NotFoundError');

const colorSchema = new Schema({
    name: {
        type: String
    },
    code: {
        type: String
    },
}, { timestamps: true });

colorSchema.index({ name: 1 });
colorSchema.index({ code: 1 });

colorSchema.statics.checkById = async (colorId, message = 'Color') => {
    if (!ObjectId.isValid(colorId)) throw new NotFoundError(`${message} ID không hợp lệ`);
    const isExists = await this.findById(colorId).lean();
    if (!isExists) throw new NotFoundError(message);
    return isExists;
};

const Color = mongoose.model('Color', colorSchema);

module.exports = Color;