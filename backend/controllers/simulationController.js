const SimulationEngine = require('../services/simulation/simulationEngine');
const SimulationHistory = require('../models/SimulationHistory');

exports.runSimulation = async (req, res, next) => {
  try {
    const { actions } = req.body;
    
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ success: false, message: 'Missing simulation actions array' });
    }

    const result = await SimulationEngine.runSimulation(req.user.id, actions);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

exports.saveHistory = async (req, res, next) => {
  try {
    const { title, actions } = req.body;
    
    const history = await SimulationHistory.create({
      userId: req.user.id,
      title,
      actions
    });
    
    res.status(201).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const history = await SimulationHistory.find({ userId: req.user.id })
      .sort('-createdAt')
      .lean();
      
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteHistory = async (req, res, next) => {
  try {
    const history = await SimulationHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!history) {
      return res.status(404).json({ success: false, message: 'Simulation not found' });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
