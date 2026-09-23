const installmentService = require('../services/installmentService');

exports.getInstallments = async (req, res, next) => {
  try {
    const data = await installmentService.getInstallments(req.user.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createInstallment = async (req, res, next) => {
  try {
    const installment = await installmentService.createInstallment(req.user.id, req.body);
    res.status(201).json({ success: true, data: installment });
  } catch (err) {
    next(err);
  }
};

exports.updateInstallment = async (req, res, next) => {
  try {
    const installment = await installmentService.updateInstallment(req.user.id, req.params.id, req.body);
    res.status(200).json({ success: true, data: installment });
  } catch (err) {
    next(err);
  }
};

exports.deleteInstallment = async (req, res, next) => {
  try {
    await installmentService.deleteInstallment(req.user.id, req.params.id);
    res.status(200).json({ success: true, message: 'تم حذف القسط بنجاح' });
  } catch (err) {
    next(err);
  }
};

exports.payInstallment = async (req, res, next) => {
  try {
    const result = await installmentService.payInstallment(req.user.id, req.params.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
