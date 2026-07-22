const service = require('../services/analyticsService');
exports.get = async (req, res, next) => { try { res.json(await service.getAnalytics(req.user.id, req.query)); } catch (error) { next(error); } };
