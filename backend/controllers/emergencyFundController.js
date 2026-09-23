const emergencyFundService = require('../services/emergencyFundService');

exports.getEmergencyFund = async (req, res, next) => {
  try {
    const shield = await emergencyFundService.getEmergencyFundShield(req.user.id);
    res.status(200).json({ success: true, data: shield });
  } catch (err) {
    next(err);
  }
};

exports.updateEmergencyFund = async (req, res, next) => {
  try {
    const shield = await emergencyFundService.updateEmergencyFund(req.user.id, req.body);
    res.status(200).json({ success: true, data: shield });
  } catch (err) {
    next(err);
  }
};

exports.depositEmergencyFund = async (req, res, next) => {
  try {
    const result = await emergencyFundService.depositToEmergencyFund(req.user.id, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
