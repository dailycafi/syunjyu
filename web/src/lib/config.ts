/**
 * Frontend configuration
 * Values are read from environment variables with sensible defaults
 */

export const config = {
  // Default model name - should match backend .env
  DEFAULT_MODEL_NAME: process.env.NEXT_PUBLIC_DEFAULT_MODEL_NAME || 'MiniMax-M2.1',
  
  // Default provider
  DEFAULT_REMOTE_PROVIDER: process.env.NEXT_PUBLIC_DEFAULT_REMOTE_PROVIDER || 'minimax',
  
  // Demo mode
  IS_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  
  // API base URL
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
} as const;
