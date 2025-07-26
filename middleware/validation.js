const { body, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Validation rules for user signup
 */
const validateSignup = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens')
    .custom(async (username) => {
      const User = require('../models/User');
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new Error('Username already exists');
      }
      return true;
    }),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .custom(async (email) => {
      const User = require('../models/User');
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        throw new Error('Email already registered');
      }
      return true;
    }),

  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),

  body('firstName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name cannot exceed 50 characters')
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name cannot exceed 50 characters')
    .matches(/^[a-zA-Z\s]*$/)
    .withMessage('Last name can only contain letters and spaces'),

  handleValidationErrors
];

/**
 * Validation rules for user login
 */
const validateLogin = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or username is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Identifier must be between 3 and 255 characters'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters'),

  handleValidationErrors
];

/**
 * Validation rules for project creation/update
 */
const validateProject = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Project name must be between 1 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),

  handleValidationErrors
];

/**
 * Validation rules for component creation/update
 */
const validateComponent = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Component name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Component name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z][a-zA-Z0-9]*$/)
    .withMessage('Component name must start with a letter and contain only letters and numbers'),

  body('code')
    .optional()
    .isString()
    .withMessage('Code must be a string'),

  body('type')
    .optional()
    .isIn(['component', 'page'])
    .withMessage('Type must be either "component" or "page"'),

  handleValidationErrors
];

/**
 * Validation rules for chat message
 */
const validateChatMessage = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message content must be between 1 and 10000 characters'),

  body('role')
    .isIn(['user', 'assistant'])
    .withMessage('Role must be either "user" or "assistant"'),

  handleValidationErrors
];

/**
 * Validation rules for user preferences update
 */
const validatePreferences = [
  body('defaultFramework')
    .optional()
    .isIn(['react', 'vue', 'angular'])
    .withMessage('Default framework must be react, vue, or angular'),

  body('codeStyle')
    .optional()
    .isIn(['typescript', 'javascript'])
    .withMessage('Code style must be typescript or javascript'),

  body('theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Theme must be light, dark, or system'),

  handleValidationErrors
];

module.exports = {
  validateSignup,
  validateLogin,
  validateProject,
  validateComponent,
  validateChatMessage,
  validatePreferences,
  handleValidationErrors
};