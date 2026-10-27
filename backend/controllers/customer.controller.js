const Customer = require('../models/customer.model');
const generateToken = require('../utils/generateToken');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[0-9\s()-]{10,20}$/;
const cookieMaxAge = 7 * 24 * 60 * 60 * 1000;

function publicCustomer(customer) {
  const value = customer.toObject ? customer.toObject() : customer;
  delete value.password;
  return value;
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: cookieMaxAge,
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

async function registerCustomer(req, res, next) {
  try {
    const { fullName, email, password, phone } = req.body || {};
    if (
      typeof fullName !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof phone !== 'string' ||
      !fullName.trim() ||
      !emailPattern.test(email.trim()) ||
      password.length < 8 ||
      !phonePattern.test(phone.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide a name, valid email, password of at least 8 characters, and valid phone number',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await Customer.exists({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email is already registered' });
    }

    const customer = await Customer.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      phone: phone.trim(),
    });
    const token = generateToken(customer._id);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      customer: publicCustomer(customer),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email is already registered' });
    }
    return next(error);
  }
}

async function loginCustomer(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const customer = await Customer.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!customer || !(await customer.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    setAuthCookie(res, generateToken(customer._id));
    return res.json({ success: true, customer: publicCustomer(customer) });
  } catch (error) {
    return next(error);
  }
}

function getMe(req, res) {
  res.json({ success: true, customer: publicCustomer(req.user) });
}

function logoutCustomer(req, res) {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out successfully' });
}

async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (
      typeof oldPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide the current password and a new password of at least 8 characters',
      });
    }

    const customer = await Customer.findById(req.user._id).select('+password');
    if (!customer || !(await customer.matchPassword(oldPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    customer.password = newPassword;
    await customer.save();
    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return next(error);
  }
}

async function becomeCreator(req, res, next) {
  try {
    if (req.user.isCreator) {
      return res.json({ success: true, customer: publicCustomer(req.user) });
    }

    req.user.isCreator = true;
    await req.user.save();
    return res.json({ success: true, customer: publicCustomer(req.user) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  becomeCreator,
  changePassword,
  getMe,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
};
