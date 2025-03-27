const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const NotFoundError = require("../exceptions/NotFoundError");

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

colorSchema.statics.getAll = async () => {
    return await Color.find().lean();
}

colorSchema.statics.getById = async (colorId, message = 'Color') => {
    const isExists = await Color.findById(colorId).lean();
    if (!isExists) throw new NotFoundError(message);
    return isExists;
};

colorSchema.statics.getByName = async (name, message = 'Color') => {
    const color = await Color.findOne({ name }).lean();
    if (!color) throw new NotFoundError(message);
    return color;
};

const Color = mongoose.model('Color', colorSchema);

module.exports = Color;