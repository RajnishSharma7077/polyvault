const jwt = require('jsonwebtoken');
const Customer = require('../models/customer.model');

async function protect(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token || !process.env.JWT_SECRET) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (typeof payload !== 'object' || typeof payload.id !== 'string') {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const customer = await Customer.findById(payload.id).select('-password');
    if (!customer) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    req.user = customer;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { protect };
