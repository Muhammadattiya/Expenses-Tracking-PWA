const express = require('express');
const router = express.Router();
const { runSimulation, saveHistory, getHistory, deleteHistory } = require('../controllers/simulationController');
const protect = require('../middleware/auth');

router.use(protect);

router.post('/run', runSimulation);
router.post('/history', saveHistory);
router.get('/history', getHistory);
router.delete('/history/:id', deleteHistory);

module.exports = router;
