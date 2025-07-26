const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

module.exports = function isAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    if (decoded.id && !decoded._id) req.user._id = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}; 