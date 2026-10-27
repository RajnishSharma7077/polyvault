function requireCreator(req, res, next) {
  if (!req.user?.isCreator) {
    return res.status(403).json({ success: false, message: 'Creator access required' });
  }
  return next();
}

module.exports = { requireCreator };
