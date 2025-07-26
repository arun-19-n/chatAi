const axios = require('axios');

class LLMService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.defaultModel = process.env.DEFAULT_LLM_MODEL || 'openai/gpt-4o-mini';
    
    if (!this.apiKey) {
      console.warn('OpenRouter API key not found. LLM features will be disabled.');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'AI Frontend Playground'
      }
    });
  }

  /**
   * Generate JSX and CSS code based on user prompt
   */
  async generateCode(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const {
      model = this.defaultModel,
      temperature = 0.7,
      framework = 'react',
      styleFramework = 'tailwind',
      currentJSX = '',
      currentCSS = '',
      isRefinement = false,
      chatHistory = []
    } = options;

    try {
      const systemPrompt = this.getSystemPrompt(framework, styleFramework);
      const userPrompt = this.buildUserPrompt(prompt, currentJSX, currentCSS, isRefinement);

      // Build messages array
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // Add chat history for context (last 5 messages)
      if (chatHistory && chatHistory.length > 0) {
        const recentHistory = chatHistory.slice(-5);
        messages.push(...recentHistory);
      }

      // Add current user prompt
      messages.push({ role: 'user', content: userPrompt });

      const response = await this.client.post('/chat/completions', {
        model,
        messages,
        temperature,
        max_tokens: 4000,
        stream: false
      });

      const completion = response.data.choices[0].message.content;
      return this.parseCodeResponse(completion, framework, styleFramework);

    } catch (error) {
      console.error('LLM API Error:', error.response?.data || error.message);
      throw new Error(`Failed to generate code: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get system prompt based on framework preferences
   */
  getSystemPrompt(framework, styleFramework) {
    const frameworkInstructions = {
      react: 'Generate React functional components using JSX syntax. Use hooks like useState, useEffect when needed.',
      vue: 'Generate Vue 3 components using Composition API syntax.',
      vanilla: 'Generate vanilla HTML with modern JavaScript (ES6+).'
    };

    const styleInstructions = {
      tailwind: 'Use Tailwind CSS classes for styling. Make components responsive and visually appealing.',
      css: 'Write clean, modern CSS. Use CSS Grid and Flexbox for layouts.',
      'styled-components': 'Use styled-components for React styling.'
    };

    return `You are an expert frontend developer specializing in creating beautiful, interactive UI components.

FRAMEWORK: ${framework}
${frameworkInstructions[framework]}

STYLING: ${styleFramework}
${styleInstructions[styleFramework]}

GUIDELINES:
1. Generate clean, production-ready code
2. Include proper component structure and logic
3. Make components interactive and responsive
4. Use modern best practices
5. Add comments for complex logic
6. Ensure accessibility (ARIA labels, semantic HTML)
7. Return code in the following JSON format:

{
  "jsx": "component code here",
  "css": "additional css if needed",
  "explanation": "brief explanation of the component"
}

IMPORTANT: Always return valid JSON. If using Tailwind, minimize custom CSS.`;
  }

  /**
   * Build user prompt with context
   */
  buildUserPrompt(prompt, currentJSX, currentCSS, isRefinement) {
    if (isRefinement && (currentJSX || currentCSS)) {
      return `Please refine the following code based on this request: "${prompt}"

Current JSX:
\`\`\`jsx
${currentJSX}
\`\`\`

Current CSS:
\`\`\`css
${currentCSS}
\`\`\`

Please provide the updated code with the requested changes.`;
    }

    return `Create a component based on this description: "${prompt}"

Make it visually appealing, interactive, and well-structured.`;
  }

  /**
   * Parse the LLM response to extract JSX and CSS
   */
  parseCodeResponse(response, framework, styleFramework) {
    try {
      // Try to parse JSON response first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          jsx: parsed.jsx || '',
          css: parsed.css || '',
          explanation: parsed.explanation || '',
          framework,
          styleFramework
        };
      }

      // Fallback: extract code blocks
      const jsxMatch = response.match(/```(?:jsx|javascript|js|react)\n([\s\S]*?)\n```/);
      const cssMatch = response.match(/```(?:css)\n([\s\S]*?)\n```/);

      return {
        jsx: jsxMatch ? jsxMatch[1].trim() : '',
        css: cssMatch ? cssMatch[1].trim() : '',
        explanation: 'Code extracted from response',
        framework,
        styleFramework
      };

    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return {
        jsx: '',
        css: '',
        explanation: 'Failed to parse response',
        framework,
        styleFramework,
        error: 'Parse error'
      };
    }
  }

  /**
   * Get available models from OpenRouter
   */
  async getAvailableModels() {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await this.client.get('/models');
      return response.data.data.map(model => ({
        id: model.id,
        name: model.name,
        description: model.description,
        pricing: model.pricing
      }));
    } catch (error) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey() {
    if (!this.apiKey) {
      return false;
    }

    try {
      await this.client.get('/models');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate component variations
   */
  async generateVariations(originalJSX, originalCSS, count = 3, options = {}) {
    const {
      model = this.defaultModel,
      temperature = 0.8,
      framework = 'react',
      styleFramework = 'tailwind'
    } = options;

    const prompt = `Create ${count} variations of this component with different styles, layouts, or features:

JSX:
\`\`\`jsx
${originalJSX}
\`\`\`

CSS:
\`\`\`css
${originalCSS}
\`\`\`

Return an array of variations in JSON format:
{
  "variations": [
    {
      "jsx": "variation 1 jsx",
      "css": "variation 1 css",
      "description": "what makes this variation unique"
    }
  ]
}`;

    try {
      const response = await this.generateCode(prompt, {
        model,
        temperature,
        framework,
        styleFramework
      });

      return response;
    } catch (error) {
      throw new Error(`Failed to generate variations: ${error.message}`);
    }
  }
}

module.exports = new LLMService();