const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const { getProfiles, createProfile, updateProfile, deleteProfile } = require('../controllers/incomeProfileController');

router.use(protect);

router.get('/', getProfiles);
router.post('/', createProfile);
router.put('/:id', updateProfile);
router.delete('/:id', deleteProfile);

module.exports = router;
