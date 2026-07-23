const service = require('../services/receivableService');
exports.list = async (req, res, next) => { try { res.json(await service.list(req.user.id)); } catch (error) { next(error); } };
exports.create = async (req, res, next) => { try { res.status(201).json(await service.create(req.user.id, req.body)); } catch (error) { next(error); } };
exports.payment = async (req, res, next) => { try { res.json(await service.recordPayment(req.user.id, req.params.id, req.params.participantId, req.body)); } catch (error) { next(error); } };
exports.update = async (req, res, next) => { try { res.json(await service.update(req.user.id, req.params.id, req.body)); } catch (error) { next(error); } };
exports.remove = async (req, res, next) => { try { res.json(await service.remove(req.user.id, req.params.id)); } catch (error) { next(error); } };
