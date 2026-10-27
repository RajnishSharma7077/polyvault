const express = require('express');
const {
  becomeCreator,
  changePassword,
  getMe,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
} = require('../controllers/customer.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register', registerCustomer);
router.post('/login', loginCustomer);
router.get('/me', protect, getMe);
router.post('/logout', logoutCustomer);
router.patch('/change-password', protect, changePassword);
router.patch('/become-creator', protect, becomeCreator);

module.exports = router;
