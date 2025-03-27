const Color = require('../models/Color');

const ColorService = {
    async getAll() {
        return await Color.getAll();
    },
    
    async getById(colorId) {
        return await Color.getById(colorId);
    },

    async getByName(name) {
        return await Color.getByName(name);
    }
};

module.exports = ColorService;