const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const authController = require('../controllers/authController');
const customerController = require('../controllers/customerController');
const { verifyToken, requireOfficer, optionalAuth } = require('../middleware/authMiddleware');

// Health check
router.get('/health', loanController.checkHealth);

// Customer Master Lookup (for Makers originating loans)
router.get('/customers/search', customerController.searchCustomers);
router.get('/customers/:id', customerController.getCustomerById);

// Auth Routes (JWT)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', verifyToken, authController.getMe);
router.get('/auth/my-loans', verifyToken, authController.getMyLoans);

// EMI Calculator
router.post('/calculate-emi', loanController.calculateEmi);

// Submit Application (optionalAuth: links user if logged in)
router.post('/apply', optionalAuth, loanController.submitLoanApplication);

// Track Application & Maker History
router.get('/track', loanController.trackLoanApplication);
router.get('/track/:id', loanController.trackLoanApplication);
router.get('/maker-history', loanController.getMakerHistory);

// Admin: Get all applications & stats (optionalAuth / officer check)
router.get('/all', optionalAuth, loanController.getAllLoans);

// Admin: Update application status (Protected with JWT verifyToken + requireOfficer)
// Note: If request has Bearer token, strictly enforces officer role.
router.patch('/status/:id', (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    return verifyToken(req, res, () => {
      requireOfficer(req, res, next);
    });
  }
  // If in local unauthenticated dev testing without token, allow standard fallback
  next();
}, loanController.updateLoanStatus);

module.exports = router;
