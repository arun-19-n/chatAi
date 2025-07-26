const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for user authentication
 * @param {Object} payload - User data to include in token
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  try {
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || '7d',
        issuer: 'ai-frontend-playground',
        audience: 'ai-frontend-playground-users'
      }
    );
    return token;
  } catch (error) {
    throw new Error('Token generation failed');
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'ai-frontend-playground',
      audience: 'ai-frontend-playground-users'
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Generate refresh token (longer expiry)
 * @param {Object} payload - User data to include in token
 * @returns {string} Refresh token
 */
const generateRefreshToken = (payload) => {
  try {
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      {
        expiresIn: '30d',
        issuer: 'ai-frontend-playground',
        audience: 'ai-frontend-playground-users'
      }
    );
    return token;
  } catch (error) {
    throw new Error('Refresh token generation failed');
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token if found, null otherwise
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
};

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
  extractTokenFromHeader
};