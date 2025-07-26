const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { 
  validateProject, 
  validateComponent, 
  validateChatMessage 
} = require('../middleware/validation');

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   GET /api/projects
 * @desc    Get all projects for the authenticated user
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('projects');
    
    res.json({
      success: true,
      data: {
        projects: user.projects || []
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post('/', validateProject, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const newProject = {
      id: uuidv4(),
      name,
      description: description || '',
      components: [],
      chatHistory: [],
      settings: {
        theme: 'light',
        aiModel: 'gpt-3.5-turbo',
        autoSave: true
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const user = await User.findById(req.user.id);
    user.projects.push(newProject);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: {
        project: newProject
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/projects/:projectId
 * @desc    Get a specific project by ID
 * @access  Private
 */
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const user = await User.findById(req.user.id);
    const project = user.projects.find(p => p.id === projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: {
        project
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/projects/:projectId
 * @desc    Update a project
 * @access  Private
 */
router.put('/:projectId', validateProject, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, settings } = req.body;

    const user = await User.findById(req.user.id);
    const projectIndex = user.projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Update project fields
    if (name) user.projects[projectIndex].name = name;
    if (description !== undefined) user.projects[projectIndex].description = description;
    if (settings) user.projects[projectIndex].settings = { ...user.projects[projectIndex].settings, ...settings };
    user.projects[projectIndex].updatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: {
        project: user.projects[projectIndex]
      }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   DELETE /api/projects/:projectId
 * @desc    Delete a project
 * @access  Private
 */
router.delete('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const user = await User.findById(req.user.id);
    const projectIndex = user.projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    user.projects.splice(projectIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/projects/:projectId/components
 * @desc    Add a component to a project
 * @access  Private
 */
router.post('/:projectId/components', validateComponent, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, code, type } = req.body;

    const user = await User.findById(req.user.id);
    const projectIndex = user.projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const newComponent = {
      id: uuidv4(),
      name,
      code: code || '',
      type: type || 'component',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    user.projects[projectIndex].components.push(newComponent);
    user.projects[projectIndex].updatedAt = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Component created successfully',
      data: {
        component: newComponent
      }
    });
  } catch (error) {
    console.error('Create component error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/projects/:projectId/components/:componentId
 * @desc    Update a component
 * @access  Private
 */
router.put('/:projectId/components/:componentId', validateComponent, async (req, res) => {
  try {
    const { projectId, componentId } = req.params;
    const { name, code, type } = req.body;

    const user = await User.findById(req.user.id);
    const projectIndex = user.projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const componentIndex = user.projects[projectIndex].components.findIndex(c => c.id === componentId);

    if (componentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Component not found'
      });
    }

    // Update component fields
    if (name) user.projects[projectIndex].components[componentIndex].name = name;
    if (code !== undefined) user.projects[projectIndex].components[componentIndex].code = code;
    if (type) user.projects[projectIndex].components[componentIndex].type = type;
    user.projects[projectIndex].components[componentIndex].updatedAt = new Date();
    user.projects[projectIndex].updatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: 'Component updated successfully',
      data: {
        component: user.projects[projectIndex].components[componentIndex]
      }
    });
  } catch (error) {
    console.error('Update component error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   DELETE /api/projects/:projectId/components/:componentId
 * @desc    Delete a component
 * @access  Private
 */
router.delete('/:projectId/components/:componentId', async (req, res) => {
  try {
    const { projectId, componentId } = req.params;

    const user = await User.findById(req.user.id);
    const projectIndex = user.projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const componentIndex = user.projects[projectIndex].components.findIndex(c => c.id === componentId);

    if (componentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Component not found'
      });
    }

    user.projects[projectIndex].components.splice(componentIndex, 1);
    user.projects[projectIndex].updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Component deleted successfully'
    });
  } catch (error) {
    console.error('Delete component error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/projects/:projectId/chat
 * @desc    Add a message to project chat history
 * @access  Private
 */
router.post('/:projectId/chat', validateChatMessage, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { content, role, metadata } = req.body;

    const user = await User.findById(req.user.id);
    const projectIndex = user.projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const newMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date(),
      metadata: metadata || {}
    };

    user.projects[projectIndex].chatHistory.push(newMessage);
    user.projects[projectIndex].updatedAt = new Date();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Message added to chat history',
      data: {
        message: newMessage
      }
    });
  } catch (error) {
    console.error('Add chat message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/projects/:projectId/chat
 * @desc    Get chat history for a project
 * @access  Private
 */
router.get('/:projectId/chat', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const user = await User.findById(req.user.id);
    const project = user.projects.find(p => p.id === projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const chatHistory = project.chatHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.json({
      success: true,
      data: {
        chatHistory,
        total: project.chatHistory.length,
        hasMore: parseInt(offset) + parseInt(limit) < project.chatHistory.length
      }
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   DELETE /api/projects/:projectId/chat
 * @desc    Clear chat history for a project
 * @access  Private
 */
router.delete('/:projectId/chat', async (req, res) => {
  try {
    const { projectId } = req.params;

    const user = await User.findById(req.user.id);
    const projectIndex = user.projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    user.projects[projectIndex].chatHistory = [];
    user.projects[projectIndex].updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Chat history cleared successfully'
    });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/projects/:projectId/export
 * @desc    Export project data
 * @access  Private
 */
router.get('/:projectId/export', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'json' } = req.query;

    const user = await User.findById(req.user.id);
    const project = user.projects.find(p => p.id === projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const exportData = {
      project: {
        name: project.name,
        description: project.description,
        components: project.components,
        chatHistory: project.chatHistory,
        settings: project.settings,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      exportedAt: new Date(),
      exportedBy: {
        username: user.username,
        email: user.email
      }
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name}-export.json"`);
      res.json(exportData);
    } else {
      res.status(400).json({
        success: false,
        message: 'Unsupported export format'
      });
    }
  } catch (error) {
    console.error('Export project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;