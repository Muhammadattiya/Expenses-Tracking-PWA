const billService = require('../services/billService');

exports.getBills = async (req, res) => {
  try {
    const data = await billService.getBills(req.user.id);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createBill = async (req, res) => {
  try {
    const data = await billService.createBill(req.user.id, req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const data = await billService.updateBill(req.user.id, req.params.id, req.body);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    await billService.deleteBill(req.user.id, req.params.id);
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.markAsPaid = async (req, res) => {
  try {
    const data = await billService.markAsPaid(req.user.id, req.params.id, req.body.transactionId);
    res.status(200).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
