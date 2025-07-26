module.exports = function isAdmin(req, res, next) {
  if ((req.user && req.user.role === 'admin') || req.admin) {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Admin access required' });
  }
}; 