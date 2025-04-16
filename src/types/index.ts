// Common type definitions for the application

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

export interface ProductItem {
  name: string;
  affiliate_url: string;
}

export interface Recommendations {
  materials: ProductItem[];
  tools: ProductItem[];
}
