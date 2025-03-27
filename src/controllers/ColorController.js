const ColorService = require('../services/ColorService');

const ColorController = {
    async getAll(req, res) {
        const colors = await ColorService.getAll();
        return res.json(colors);
    },

    async getById(req, res) {
        const { colorId } = req.params;
        const color = await ColorService.getById(colorId);
        return res.json(color);
    },

    async getByName(req, res) {
        const { name } = req.params;
        const color = await ColorService.getByName(name);
        return res.json(color);
    }
};

module.exports = ColorController;