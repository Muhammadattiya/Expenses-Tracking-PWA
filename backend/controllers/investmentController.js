const service = require('../services/investmentService');
exports.list = async (req, res, next) => { try { res.json(await service.list(req.user.id)); } catch (error) { next(error); } };
exports.create = async (req, res, next) => { try { res.status(201).json(await service.create(req.user.id, req.body)); } catch (error) { next(error); } };
exports.update = async (req, res, next) => { try { res.json(await service.update(req.user.id, req.params.id, req.body)); } catch (error) { next(error); } };
exports.remove = async (req, res, next) => { try { await service.remove(req.user.id, req.params.id); res.status(204).end(); } catch (error) { next(error); } };
exports.goldPrice = async (req, res, next) => { try { res.json(await service.getGoldPrice()); } catch (error) { next(error); } };
