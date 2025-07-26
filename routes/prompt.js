const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const llmService = require('../services/llmService');
const Session = require('../models/Session');

// Apply authentication middleware
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
 * @route   POST /api/prompt
 * @desc    Generate code based on user prompt
 * @access  Private
 */
router.post('/', [
  body('prompt')
    .trim()
    .notEmpty()
    .withMessage('Prompt is required')
    .isLength({ min: 5, max: 2000 })
    .withMessage('Prompt must be between 5 and 2000 characters'),
  
  body('sessionId')
    .optional()
    .isMongoId()
    .withMessage('Invalid session ID'),
  
  body('currentJSX')
    .optional()
    .isString()
    .withMessage('Current JSX must be a string'),
  
  body('currentCSS')
    .optional()
    .isString()
    .withMessage('Current CSS must be a string'),
  
  body('isRefinement')
    .optional()
    .isBoolean()
    .withMessage('isRefinement must be boolean'),
  
  body('framework')
    .optional()
    .isIn(['react', 'vue', 'vanilla'])
    .withMessage('Invalid framework'),
  
  body('styleFramework')
    .optional()
    .isIn(['tailwind', 'css', 'styled-components'])
    .withMessage('Invalid style framework'),
  
  body('model')
    .optional()
    .isString()
    .withMessage('Model must be a string'),
  
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Temperature must be between 0 and 1'),

  handleValidationErrors
], async (req, res) => {
  try {
    const {
      prompt,
      sessionId,
      currentJSX = '',
      currentCSS = '',
      isRefinement = false,
      framework = 'react',
      styleFramework = 'tailwind',
      model,
      temperature = 0.7
    } = req.body;

    // Get session for context if provided
    let session = null;
    let chatHistory = [];

    if (sessionId) {
      session = await Session.findOne({
        _id: sessionId,
        userId: req.user._id
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      chatHistory = session.getRecentContext(5);
    }

    // Generate code using LLM service
    const result = await llmService.generateCode(prompt, {
      model: model || session?.settings?.llmModel,
      temperature: temperature || session?.settings?.temperature,
      framework: framework || session?.settings?.framework,
      styleFramework: styleFramework || session?.settings?.styleFramework,
      currentJSX,
      currentCSS,
      isRefinement,
      chatHistory
    });

    // Update session if provided
    if (session) {
      // Add user message
      session.addMessage('user', prompt, {
        isRefinement,
        hadExistingCode: !!(currentJSX || currentCSS)
      });

      // Add assistant response
      session.addMessage('assistant', `Generated ${framework} component with ${styleFramework} styling.`, {
        generatedCode: true,
        framework: result.framework,
        styleFramework: result.styleFramework,
        hasJSX: !!result.jsx,
        hasCSS: !!result.css
      });

      // Update code if generation was successful
      if (result.jsx || result.css) {
        session.updateCode(result.jsx, result.css);
      }

      await session.save();
    }

    res.json({
      success: true,
      data: {
        jsx: result.jsx,
        css: result.css,
        explanation: result.explanation,
        framework: result.framework,
        styleFramework: result.styleFramework,
        sessionId: session?._id,
        isRefinement,
        ...(result.error && { error: result.error })
      }
    });

  } catch (error) {
    console.error('Prompt processing error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process prompt',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   POST /api/prompt/refine
 * @desc    Refine existing code based on feedback
 * @access  Private
 */
router.post('/refine', [
  body('prompt')
    .trim()
    .notEmpty()
    .withMessage('Refinement prompt is required')
    .isLength({ min: 3, max: 1000 })
    .withMessage('Prompt must be between 3 and 1000 characters'),
  
  body('sessionId')
    .isMongoId()
    .withMessage('Valid session ID is required'),
  
  body('currentJSX')
    .notEmpty()
    .withMessage('Current JSX is required for refinement'),
  
  body('currentCSS')
    .optional()
    .isString()
    .withMessage('Current CSS must be a string'),

  handleValidationErrors
], async (req, res) => {
  try {
    const {
      prompt,
      sessionId,
      currentJSX,
      currentCSS = ''
    } = req.body;

    // Get session
    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Generate refined code
    const result = await llmService.generateCode(prompt, {
      model: session.settings.llmModel,
      temperature: session.settings.temperature,
      framework: session.settings.framework,
      styleFramework: session.settings.styleFramework,
      currentJSX,
      currentCSS,
      isRefinement: true,
      chatHistory: session.getRecentContext(3)
    });

    // Update session
    session.addMessage('user', `Refine: ${prompt}`, {
      isRefinement: true,
      originalJSX: currentJSX,
      originalCSS: currentCSS
    });

    session.addMessage('assistant', `Refined the component based on your feedback.`, {
      generatedCode: true,
      isRefinement: true,
      framework: result.framework,
      styleFramework: result.styleFramework
    });

    if (result.jsx || result.css) {
      session.updateCode(result.jsx, result.css);
    }

    await session.save();

    res.json({
      success: true,
      data: {
        jsx: result.jsx,
        css: result.css,
        explanation: result.explanation,
        framework: result.framework,
        styleFramework: result.styleFramework,
        sessionId: session._id,
        isRefinement: true,
        ...(result.error && { error: result.error })
      }
    });

  } catch (error) {
    console.error('Refinement error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to refine code',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   POST /api/prompt/variations
 * @desc    Generate variations of existing code
 * @access  Private
 */
router.post('/variations', [
  body('sessionId')
    .isMongoId()
    .withMessage('Valid session ID is required'),
  
  body('currentJSX')
    .notEmpty()
    .withMessage('Current JSX is required'),
  
  body('currentCSS')
    .optional()
    .isString()
    .withMessage('Current CSS must be a string'),
  
  body('count')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Count must be between 1 and 5'),

  handleValidationErrors
], async (req, res) => {
  try {
    const {
      sessionId,
      currentJSX,
      currentCSS = '',
      count = 3
    } = req.body;

    // Get session
    const session = await Session.findOne({
      _id: sessionId,
      userId: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Generate variations
    const variations = await llmService.generateVariations(
      currentJSX,
      currentCSS,
      count,
      {
        model: session.settings.llmModel,
        framework: session.settings.framework,
        styleFramework: session.settings.styleFramework
      }
    );

    res.json({
      success: true,
      data: {
        variations,
        sessionId: session._id,
        originalJSX: currentJSX,
        originalCSS: currentCSS
      }
    });

  } catch (error) {
    console.error('Variations generation error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate variations',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/prompt/models
 * @desc    Get available LLM models
 * @access  Private
 */
router.get('/models', async (req, res) => {
  try {
    const models = await llmService.getAvailableModels();
    
    res.json({
      success: true,
      data: {
        models,
        defaultModel: process.env.DEFAULT_LLM_MODEL || 'openai/gpt-4o-mini'
      }
    });

  } catch (error) {
    console.error('Get models error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available models',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/prompt/health
 * @desc    Check LLM service health
 * @access  Private
 */
router.get('/health', async (req, res) => {
  try {
    const isHealthy = await llmService.validateApiKey();
    
    res.json({
      success: true,
      data: {
        healthy: isHealthy,
        service: 'OpenRouter',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    res.json({
      success: false,
      data: {
        healthy: false,
        service: 'OpenRouter',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;