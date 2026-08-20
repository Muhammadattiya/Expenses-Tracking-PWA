const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { parseTransactions, confirmTransactions, triggerMigration } = require('../controllers/quickAddController');

router.use(auth);

router.post('/parse', parseTransactions);
router.post('/confirm', confirmTransactions);
router.post('/migrate-categories', triggerMigration);

module.exports = router;
