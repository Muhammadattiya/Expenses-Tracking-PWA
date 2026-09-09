const billService = require('../services/billService');

exports.getBills = async (req, res, next) => {
  try {
    const data = await billService.getBills(req.user.id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.createBill = async (req, res, next) => {
  try {
    const data = await billService.createBill(req.user.id, req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

exports.updateBill = async (req, res, next) => {
  try {
    const data = await billService.updateBill(req.user.id, req.params.id, req.body);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.deleteBill = async (req, res, next) => {
  try {
    await billService.deleteBill(req.user.id, req.params.id);
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.markAsPaid = async (req, res, next) => {
  try {
    const data = await billService.markAsPaid(req.user.id, req.params.id, req.body.transactionId);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

exports.ignoreBill = async (req, res, next) => {
  try {
    const data = await billService.ignoreBill(req.user.id, req.params.id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};
