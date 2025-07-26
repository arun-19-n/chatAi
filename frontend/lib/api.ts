import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    const response = error.response;
    
    // Handle different error status codes
    if (response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      Cookies.remove('token');
      Cookies.remove('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
      toast.error('Session expired. Please login again.');
    } else if (response?.status === 403) {
      toast.error('Access denied');
    } else if (response?.status === 404) {
      toast.error('Resource not found');
    } else if (response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please try again.');
    } else if (!response) {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> extends ApiResponse<{
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> {}

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  preferences: {
    defaultFramework: 'react' | 'vue' | 'angular';
    codeStyle: 'typescript' | 'javascript';
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse extends ApiResponse<{
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: string;
}> {}

// Session types
export interface Session {
  _id: string;
  userId: string;
  title: string;
  description: string;
  chatHistory: ChatMessage[];
  code: {
    jsx: string;
    css: string;
    html: string;
  };
  preview: {
    isActive: boolean;
    lastRendered: string;
    errors: Array<{
      type: string;
      message: string;
      timestamp: string;
    }>;
  };
  settings: {
    framework: 'react' | 'vue' | 'vanilla';
    styleFramework: 'tailwind' | 'css' | 'styled-components';
    llmModel: string;
    temperature: number;
  };
  stats: {
    messageCount: number;
    codeGenerations: number;
    lastActivity: string;
  };
  isActive: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Auth API
export const authApi = {
  signup: async (data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/signup', data);
    return response.data;
  },

  login: async (data: {
    identifier: string;
    password: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<ApiResponse<{
    token: string;
    refreshToken: string;
    expiresIn: string;
  }>> => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Session API
export const sessionApi = {
  create: async (data: {
    title?: string;
    description?: string;
    settings?: Partial<Session['settings']>;
  }): Promise<ApiResponse<{ session: Session }>> => {
    const response = await api.post('/sessions', data);
    return response.data;
  },

  getById: async (sessionId: string): Promise<ApiResponse<{ session: Session }>> => {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data;
  },

  update: async (sessionId: string, data: {
    title?: string;
    description?: string;
    code?: Partial<Session['code']>;
    message?: {
      role: 'user' | 'assistant';
      content: string;
      metadata?: Record<string, any>;
    };
    settings?: Partial<Session['settings']>;
    tags?: string[];
  }): Promise<ApiResponse<{ session: Session }>> => {
    const response = await api.patch(`/sessions/${sessionId}`, data);
    return response.data;
  },

  delete: async (sessionId: string): Promise<ApiResponse> => {
    const response = await api.delete(`/sessions/${sessionId}`);
    return response.data;
  },

  getUserSessions: async (userId: string, params?: {
    limit?: number;
    offset?: number;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ApiResponse<{
    sessions: Session[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>> => {
    const response = await api.get(`/sessions/user/${userId}`, { params });
    return response.data;
  },

  getUserStats: async (userId: string): Promise<ApiResponse<{
    stats: {
      totalSessions: number;
      activeSessions: number;
      totalMessages: number;
      totalCodeGenerations: number;
      lastActivity: string | null;
    };
  }>> => {
    const response = await api.get(`/sessions/user/${userId}/stats`);
    return response.data;
  },

  duplicate: async (sessionId: string): Promise<ApiResponse<{ session: Session }>> => {
    const response = await api.post(`/sessions/${sessionId}/duplicate`);
    return response.data;
  },

  export: async (sessionId: string, format = 'json'): Promise<any> => {
    const response = await api.get(`/sessions/${sessionId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};

// Prompt API
export const promptApi = {
  generate: async (data: {
    prompt: string;
    sessionId?: string;
    currentJSX?: string;
    currentCSS?: string;
    isRefinement?: boolean;
    framework?: 'react' | 'vue' | 'vanilla';
    styleFramework?: 'tailwind' | 'css' | 'styled-components';
    model?: string;
    temperature?: number;
  }): Promise<ApiResponse<{
    jsx: string;
    css: string;
    explanation: string;
    framework: string;
    styleFramework: string;
    sessionId?: string;
    isRefinement: boolean;
    error?: string;
  }>> => {
    const response = await api.post('/prompt', data);
    return response.data;
  },

  refine: async (data: {
    prompt: string;
    sessionId: string;
    currentJSX: string;
    currentCSS?: string;
  }): Promise<ApiResponse<{
    jsx: string;
    css: string;
    explanation: string;
    framework: string;
    styleFramework: string;
    sessionId: string;
    isRefinement: boolean;
    error?: string;
  }>> => {
    const response = await api.post('/prompt/refine', data);
    return response.data;
  },

  getVariations: async (data: {
    sessionId: string;
    currentJSX: string;
    currentCSS?: string;
    count?: number;
  }): Promise<ApiResponse<{
    variations: Array<{
      jsx: string;
      css: string;
      description: string;
    }>;
    sessionId: string;
    originalJSX: string;
    originalCSS: string;
  }>> => {
    const response = await api.post('/prompt/variations', data);
    return response.data;
  },

  getModels: async (): Promise<ApiResponse<{
    models: Array<{
      id: string;
      name: string;
      description: string;
      pricing: any;
    }>;
    defaultModel: string;
  }>> => {
    const response = await api.get('/prompt/models');
    return response.data;
  },

  getHealth: async (): Promise<ApiResponse<{
    healthy: boolean;
    service: string;
    timestamp: string;
    error?: string;
  }>> => {
    const response = await api.get('/prompt/health');
    return response.data;
  },
};

export default api;