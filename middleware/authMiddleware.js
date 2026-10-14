const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'apex_loan_super_secret_jwt_token_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// 1. Generate JWT Token
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'customer'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// 2. Middleware to Verify JWT Token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No JWT authorization token provided.'
    });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired JWT token. Please sign in again.'
    });
  }
}

// 3. Middleware to require Officer / Maker / Checker privileges
function requireOfficer(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const role = (req.user.role || '').toUpperCase();
  if (!['MAKER', 'CHECKER', 'OFFICER', 'ADMIN'].includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Maker or Checker privileges required for this action.'
    });
  }

  next();
}

// 4. Optional Auth (attaches req.user if token present, continues anyway)
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  requireOfficer,
  optionalAuth,
  JWT_SECRET
};
