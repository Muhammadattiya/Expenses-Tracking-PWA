const express = require('express');
const router = express.Router();
const { getForecast, getSurvival } = require('../controllers/forecastController');
const protect = require('../middleware/auth');

router.get('/', protect, getForecast);
router.get('/survival', protect, getSurvival);

module.exports = router;
