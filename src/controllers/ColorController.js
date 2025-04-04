const ColorService = require('../services/ColorService');

const ColorController = {
    // [GET] /api/colors
    async getAll(req, res) {
        const colors = await ColorService.getAll();
        return res.json(colors);
    },

    // [GET] /api/colors/:colorId
    async getById(req, res) {
        const { colorId } = req.params;
        const color = await ColorService.getById(colorId);
        return res.json(color);
    },

    // [GET] /api/colors/name/:name
    async getByName(req, res) {
        const { name } = req.params;
        const color = await ColorService.getByName(name);
        return res.json(color);
    }
};

module.exports = ColorController;