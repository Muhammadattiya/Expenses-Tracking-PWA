const ForecastEngine = require('../services/forecastEngine');
const PaydaySurvivalService = require('../services/paydaySurvivalService');

const getForecast = async (req, res, next) => {
  try {
    const { accountId, days } = req.query;
    const forecastDays = days ? parseInt(days, 10) : 30;

    if (isNaN(forecastDays) || forecastDays < 1 || forecastDays > 365) {
      return res.status(400).json({ message: 'Invalid forecast days. Must be between 1 and 365.' });
    }

    const forecast = await ForecastEngine.runForecast(req.user.id, accountId, forecastDays);

    res.status(200).json(forecast);
  } catch (error) {
    next(error);
  }
};

const getSurvival = async (req, res, next) => {
  try {
    const { profileId } = req.query;
    const survival = await PaydaySurvivalService.calculateSurvival(req.user.id, profileId);
    res.status(200).json(survival);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getForecast,
  getSurvival,
};
