const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const { validateSignup, validateLogin } = require('../middleware/validation');
const { authLimiter } = require('../middleware/auth');

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', authLimiter, validateSignup, async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName 
    } = req.body;

    // Create new user
    const user = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName?.trim(),
      lastName: lastName?.trim()
    });

    await user.save();

    // Generate tokens
    const tokenPayload = {
      userId: user._id,
      username: user.username,
      email: user.email
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          preferences: user.preferences,
          createdAt: user.createdAt
        },
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || '7d'
      }
    });

  } catch (error) {
    console.error('Signup error:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        errors: [{
          field,
          message: `This ${field} is already registered`
        }]
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 */
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by email or username
    const user = await User.findByEmailOrUsername(identifier.trim());

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const tokenPayload = {
      userId: user._id,
      username: user.username,
      email: user.email
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          preferences: user.preferences,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        },
        token,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRE || '7d'
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token using refresh token
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const { verifyToken } = require('../utils/jwt');
    const decoded = verifyToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user._id,
      username: user.username,
      email: user.email
    };

    const newToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRE || '7d'
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);

    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          avatar: req.user.avatar,
          preferences: req.user.preferences,
          projects: req.user.projects,
          lastLogin: req.user.lastLogin,
          createdAt: req.user.createdAt,
          updatedAt: req.user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;