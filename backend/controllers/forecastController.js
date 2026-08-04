const ForecastEngine = require('../services/forecastEngine');
const PaydaySurvivalService = require('../services/paydaySurvivalService');

const getForecast = async (req, res) => {
  try {
    const { accountId, days } = req.query;
    const forecastDays = days ? parseInt(days, 10) : 30;

    const forecast = await ForecastEngine.runForecast(req.user.id, accountId, forecastDays);

    res.status(200).json(forecast);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getSurvival = async (req, res) => {
  try {
    const { profileId } = req.query;
    const survival = await PaydaySurvivalService.calculateSurvival(req.user.id, profileId);
    res.status(200).json(survival);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getForecast,
  getSurvival,
};
