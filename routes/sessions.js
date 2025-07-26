const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const { authenticate } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

// Apply authentication middleware to all routes
router.use(authenticate);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * @route   POST /api/sessions
 * @desc    Create a new session
 * @access  Private
 */
router.post('/', [
  body('title').optional().trim().isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('settings.framework').optional().isIn(['react', 'vue', 'vanilla']).withMessage('Invalid framework'),
  body('settings.styleFramework').optional().isIn(['tailwind', 'css', 'styled-components']).withMessage('Invalid style framework'),
  body('settings.llmModel').optional().isString().withMessage('LLM model must be a string'),
  body('settings.temperature').optional().isFloat({ min: 0, max: 1 }).withMessage('Temperature must be between 0 and 1'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { title, description, settings } = req.body;

    const sessionData = {
      userId: req.user._id,
      title: title || 'Untitled Session',
      description: description || '',
      chatHistory: [],
      code: {
        jsx: '',
        css: '',
        html: ''
      }
    };

    // Merge custom settings
    if (settings) {
      sessionData.settings = {
        framework: settings.framework || 'react',
        styleFramework: settings.styleFramework || 'tailwind',
        llmModel: settings.llmModel || 'openai/gpt-4o-mini',
        temperature: settings.temperature || 0.7
      };
    }

    const session = new Session(sessionData);
    await session.save();

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: {
        session
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/sessions/:id
 * @desc    Get session by ID
 * @access  Private
 */
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid session ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: {
        session
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PATCH /api/sessions/:id
 * @desc    Update session (chat messages or code)
 * @access  Private
 */
router.patch('/:id', [
  param('id').isMongoId().withMessage('Invalid session ID'),
  body('title').optional().trim().isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('code.jsx').optional().isString().withMessage('JSX must be a string'),
  body('code.css').optional().isString().withMessage('CSS must be a string'),
  body('code.html').optional().isString().withMessage('HTML must be a string'),
  body('message.role').optional().isIn(['user', 'assistant']).withMessage('Invalid message role'),
  body('message.content').optional().isString().withMessage('Message content must be a string'),
  body('settings.framework').optional().isIn(['react', 'vue', 'vanilla']).withMessage('Invalid framework'),
  body('settings.styleFramework').optional().isIn(['tailwind', 'css', 'styled-components']).withMessage('Invalid style framework'),
  body('settings.llmModel').optional().isString().withMessage('LLM model must be a string'),
  body('settings.temperature').optional().isFloat({ min: 0, max: 1 }).withMessage('Temperature must be between 0 and 1'),
  handleValidationErrors
], async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const { title, description, code, message, settings, tags } = req.body;

    // Update basic fields
    if (title !== undefined) session.title = title;
    if (description !== undefined) session.description = description;
    if (tags !== undefined) session.tags = tags;

    // Update code
    if (code) {
      session.updateCode(code.jsx, code.css, code.html);
    }

    // Add message to chat history
    if (message && message.role && message.content) {
      session.addMessage(message.role, message.content, message.metadata || {});
    }

    // Update settings
    if (settings) {
      session.settings = { ...session.settings, ...settings };
    }

    await session.save();

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: {
        session
      }
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   DELETE /api/sessions/:id
 * @desc    Delete session (soft delete)
 * @access  Private
 */
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid session ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    session.isActive = false;
    await session.save();

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/sessions/user/:userId
 * @desc    Get all sessions for a user
 * @access  Private
 */
router.get('/user/:userId', [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('sortBy').optional().isIn(['createdAt', 'updatedAt', 'title']).withMessage('Invalid sort field'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only access their own sessions
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      limit = 20,
      offset = 0,
      isActive,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      sortBy,
      sortOrder: sortOrder === 'asc' ? 1 : -1
    };

    if (isActive !== undefined) {
      options.isActive = isActive === 'true';
    }

    const sessions = await Session.findUserSessions(userId, options);
    const total = await Session.countDocuments({ 
      userId, 
      ...(options.isActive !== undefined && { isActive: options.isActive })
    });

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + parseInt(limit) < total
        }
      }
    });
  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/sessions/user/:userId/stats
 * @desc    Get session statistics for a user
 * @access  Private
 */
router.get('/user/:userId/stats', [
  param('userId').isMongoId().withMessage('Invalid user ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure user can only access their own stats
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const stats = await Session.getUserStats(userId);

    res.json({
      success: true,
      data: {
        stats: stats[0] || {
          totalSessions: 0,
          activeSessions: 0,
          totalMessages: 0,
          totalCodeGenerations: 0,
          lastActivity: null
        }
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/sessions/:id/duplicate
 * @desc    Duplicate a session
 * @access  Private
 */
router.post('/:id/duplicate', [
  param('id').isMongoId().withMessage('Invalid session ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const originalSession = await Session.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!originalSession) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const duplicatedSession = new Session({
      userId: req.user._id,
      title: `${originalSession.title} (Copy)`,
      description: originalSession.description,
      code: {
        jsx: originalSession.code.jsx,
        css: originalSession.code.css,
        html: originalSession.code.html
      },
      settings: originalSession.settings,
      tags: [...originalSession.tags],
      chatHistory: [] // Start with empty chat history
    });

    await duplicatedSession.save();

    res.status(201).json({
      success: true,
      message: 'Session duplicated successfully',
      data: {
        session: duplicatedSession
      }
    });
  } catch (error) {
    console.error('Duplicate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;