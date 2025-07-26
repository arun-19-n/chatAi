const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'Untitled Session'
  },
  description: {
    type: String,
    default: ''
  },
  chatHistory: [messageSchema],
  code: {
    jsx: {
      type: String,
      default: ''
    },
    css: {
      type: String,
      default: ''
    },
    html: {
      type: String,
      default: ''
    }
  },
  preview: {
    isActive: {
      type: Boolean,
      default: true
    },
    lastRendered: {
      type: Date,
      default: Date.now
    },
    errors: [{
      type: String,
      message: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  settings: {
    framework: {
      type: String,
      enum: ['react', 'vue', 'vanilla'],
      default: 'react'
    },
    styleFramework: {
      type: String,
      enum: ['tailwind', 'css', 'styled-components'],
      default: 'tailwind'
    },
    llmModel: {
      type: String,
      default: 'openai/gpt-4o-mini'
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1
    }
  },
  stats: {
    messageCount: {
      type: Number,
      default: 0
    },
    codeGenerations: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ 'stats.lastActivity': -1 });

// Update stats before saving
sessionSchema.pre('save', function(next) {
  this.stats.messageCount = this.chatHistory.length;
  this.stats.lastActivity = Date.now();
  this.updatedAt = Date.now();
  next();
});

// Instance method to add a message
sessionSchema.methods.addMessage = function(role, content, metadata = {}) {
  const { v4: uuidv4 } = require('uuid');
  
  const message = {
    id: uuidv4(),
    role,
    content,
    timestamp: new Date(),
    metadata
  };
  
  this.chatHistory.push(message);
  return message;
};

// Instance method to update code
sessionSchema.methods.updateCode = function(jsx, css, html) {
  if (jsx !== undefined) this.code.jsx = jsx;
  if (css !== undefined) this.code.css = css;
  if (html !== undefined) this.code.html = html;
  
  this.stats.codeGenerations += 1;
  this.preview.lastRendered = new Date();
};

// Instance method to get recent chat context
sessionSchema.methods.getRecentContext = function(limit = 10) {
  return this.chatHistory
    .slice(-limit)
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));
};

// Static method to find user sessions
sessionSchema.statics.findUserSessions = function(userId, options = {}) {
  const {
    limit = 20,
    offset = 0,
    isActive = true,
    sortBy = 'updatedAt',
    sortOrder = -1
  } = options;

  return this.find({ 
    userId, 
    ...(isActive !== undefined && { isActive })
  })
    .sort({ [sortBy]: sortOrder })
    .skip(offset)
    .limit(limit)
    .select('-chatHistory') // Exclude chat history for list view
    .exec();
};

// Static method to get session stats for user
sessionSchema.statics.getUserStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        activeSessions: {
          $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
        },
        totalMessages: { $sum: '$stats.messageCount' },
        totalCodeGenerations: { $sum: '$stats.codeGenerations' },
        lastActivity: { $max: '$stats.lastActivity' }
      }
    }
  ]);
};

module.exports = mongoose.model('Session', sessionSchema);