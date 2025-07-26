# AI-Driven Micro-Frontend Playground

A stateful, AI-powered playground where authenticated users can iteratively generate, preview, tweak, and export React components with all chat history and code edits preserved across logins.

## 🚀 Features

### Backend (Express.js + MongoDB)
- **Authentication**: JWT-based auth with secure signup/login routes
- **Session Management**: Create, update, and manage coding sessions
- **AI Integration**: OpenRouter API integration for code generation
- **Data Persistence**: MongoDB storage for users, sessions, and chat history
- **Security**: Rate limiting, CORS protection, input validation

### Frontend (Next.js + TailwindCSS)
- **Authentication Pages**: Beautiful signup/login forms
- **Dashboard**: Session management and user statistics
- **Chat Interface**: Interactive AI chat sidebar
- **Live Preview**: Real-time component rendering in sandboxed iframe
- **Code Editor**: Monaco editor with syntax highlighting
- **Responsive Design**: Modern UI with TailwindCSS

### AI Code Generation
- **Multiple Models**: Support for GPT-4o-mini, Claude, Llama, and more via OpenRouter
- **Framework Support**: React, Vue, and vanilla JavaScript
- **Style Options**: TailwindCSS, CSS, and styled-components
- **Iterative Refinement**: Refine generated code with follow-up prompts
- **Context Awareness**: Chat history preserved for better AI responses

## 📋 Prerequisites

- Node.js 16+ 
- MongoDB (local or cloud)
- OpenRouter API key (for AI features)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-frontend-playground
```

### 2. Backend Setup
```bash
# Install backend dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your MongoDB URI and OpenRouter API key

# Start MongoDB (if running locally)
mongod

# Start the backend server
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend

# Install frontend dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local

# Start the frontend development server
npm run dev
```

## 🔧 Environment Configuration

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-frontend-playground
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# OpenRouter API Configuration
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DEFAULT_LLM_MODEL=openai/gpt-4o-mini
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🚀 Getting Started

1. **Start the backend server** (http://localhost:5000)
   ```bash
   npm run dev
   ```

2. **Start the frontend** (http://localhost:3000)
   ```bash
   cd frontend
   npm run dev
   ```

3. **Create an account** at http://localhost:3000/auth/signup

4. **Start coding!** Create a new session and begin chatting with AI

## 📱 Usage

### Authentication
1. Visit `/auth/signup` to create a new account
2. Use `/auth/login` to sign in
3. JWT tokens are stored in cookies for seamless experience

### Creating Sessions
1. Go to the dashboard
2. Click "New Session" 
3. Start chatting with AI to generate components

### AI Chat Interface
- Type prompts like "Create a modern button component"
- AI generates JSX and CSS code
- Use follow-up prompts to refine: "Make it more colorful"
- All chat history is preserved

### Live Preview
- Generated code renders immediately in the preview pane
- Safe sandbox iframe prevents interference
- Toggle between code and preview views

### Session Management
- All sessions are auto-saved
- Access previous sessions from dashboard
- Export sessions as JSON
- Duplicate sessions for variations

## 🏗️ Architecture

### Backend Structure
```
├── models/          # MongoDB schemas (User, Session)
├── routes/          # API endpoints
│   ├── auth.js      # Authentication routes
│   ├── sessions.js  # Session management
│   ├── projects.js  # Legacy project routes
│   └── prompt.js    # AI generation routes
├── middleware/      # Auth, validation, rate limiting
├── services/        # LLM service integration
├── utils/           # JWT utilities
└── server.js        # Main application file
```

### Frontend Structure
```
frontend/
├── components/      # Reusable React components
├── pages/          # Next.js pages
│   ├── auth/       # Login/signup pages
│   ├── dashboard/  # Session management
│   └── editor/     # Code editor interface
├── lib/            # API client and utilities
├── styles/         # Global CSS and Tailwind
└── public/         # Static assets
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/me` - Get current user

### Sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session by ID
- `PATCH /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `GET /api/sessions/user/:userId` - List user sessions

### AI Generation
- `POST /api/prompt` - Generate code from prompt
- `POST /api/prompt/refine` - Refine existing code
- `POST /api/prompt/variations` - Generate code variations
- `GET /api/prompt/models` - List available AI models

## 🎨 Customization

### Adding New AI Models
1. Update the LLM service configuration
2. Add model options to the frontend settings
3. Configure pricing and rate limits

### Styling Frameworks
- TailwindCSS (default)
- Plain CSS
- Styled-components
- Easy to extend with new options

### Component Frameworks
- React (default)
- Vue.js
- Vanilla JavaScript
- Extensible architecture for more frameworks

## 🔒 Security Features

- **JWT Authentication** with secure token storage
- **Rate Limiting** to prevent abuse
- **Input Validation** on all endpoints
- **CORS Protection** for cross-origin requests
- **Helmet.js** for security headers
- **bcrypt** for password hashing

## 🚢 Deployment

### Backend Deployment
1. Set production environment variables
2. Configure MongoDB connection string
3. Deploy to your preferred platform (Heroku, DigitalOcean, AWS)

### Frontend Deployment
1. Update API URL in environment variables
2. Build the application: `npm run build`
3. Deploy to Vercel, Netlify, or your preferred hosting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Check the GitHub issues for common problems
- Create a new issue for bugs or feature requests
- Join our community discussions

## 🙏 Acknowledgments

- OpenRouter for AI model access
- MongoDB for data persistence
- Next.js and React teams
- TailwindCSS for styling
- All open-source contributors

---

Built with ❤️ for the developer community