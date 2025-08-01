/**
 * Centralized API Configuration
 * Handles all API connections, base URLs, and environment-specific settings
 */

// API Configuration
export const API_CONFIG = {
  // Base URL - automatically switches between development and production
  BASE_URL: import.meta.env.VITE_API_URL || '',
  
  // API endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: '/api/auth/login',
      LOGOUT: '/api/auth/logout',
      USER: '/api/auth/user',
      REGISTER: '/api/auth/register',
    },
    
    // Core entities
    FARMERS: '/api/farmers',
    LOTS: '/api/lots',
    BAGS: '/api/bags',
    BUYERS: '/api/buyers',
    
    // Dashboard & stats
    DASHBOARD: {
      STATS: '/api/dashboard/stats',
      MISSING_BAGS: '/api/dashboard/missing-bags',
    },
    
    // Reports
    REPORTS: {
      GST: '/api/reports/gst',
      CESS: '/api/reports/cess',
      TAX: '/api/reports/tax',
      FINAL_ACCOUNTS: '/api/reports/final-accounts',
    },
    
    // Billing
    BILLING: {
      FARMER_BILLS: '/api/billing/farmer-bills',
      TAX_INVOICES: '/api/billing/tax-invoices',
    },
    
    // System
    SYSTEM: {
      SETUP: '/api/setup',
      TEST: '/api/test',
      TEST_DB: '/api/test-db',
    }
  },
  
  // Request configuration
  REQUEST_CONFIG: {
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include' as RequestCredentials, // For session cookies
  }
} as const;

/**
 * Build full API URL from endpoint
 */
export function getApiUrl(endpoint: string): string {
  // If endpoint already includes full URL, use as-is
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  
  // If we have a base URL configured, use it
  if (API_CONFIG.BASE_URL) {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
  }
  
  // In development, use relative URLs (same server)
  return endpoint;
}

/**
 * Environment information
 */
export const ENV_INFO = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  mode: import.meta.env.MODE,
  apiUrl: API_CONFIG.BASE_URL || 'relative',
} as const;

/**
 * API endpoint builder with type safety
 */
export class ApiEndpoints {
  // Authentication endpoints
  static auth = {
    login: () => API_CONFIG.ENDPOINTS.AUTH.LOGIN,
    logout: () => API_CONFIG.ENDPOINTS.AUTH.LOGOUT,
    user: () => API_CONFIG.ENDPOINTS.AUTH.USER,
    register: () => API_CONFIG.ENDPOINTS.AUTH.REGISTER,
  };
  
  // Resource endpoints
  static farmers = {
    list: () => API_CONFIG.ENDPOINTS.FARMERS,
    create: () => API_CONFIG.ENDPOINTS.FARMERS,
    get: (id: number) => `${API_CONFIG.ENDPOINTS.FARMERS}/${id}`,
    update: (id: number) => `${API_CONFIG.ENDPOINTS.FARMERS}/${id}`,
    delete: (id: number) => `${API_CONFIG.ENDPOINTS.FARMERS}/${id}`,
  };
  
  static lots = {
    list: () => API_CONFIG.ENDPOINTS.LOTS,
    create: () => API_CONFIG.ENDPOINTS.LOTS,
    get: (id: number) => `${API_CONFIG.ENDPOINTS.LOTS}/${id}`,
    update: (id: number) => `${API_CONFIG.ENDPOINTS.LOTS}/${id}`,
    delete: (id: number) => `${API_CONFIG.ENDPOINTS.LOTS}/${id}`,
    bags: (id: number) => `${API_CONFIG.ENDPOINTS.LOTS}/${id}/bags`,
  };
  
  static bags = {
    list: () => API_CONFIG.ENDPOINTS.BAGS,
    create: () => API_CONFIG.ENDPOINTS.BAGS,
    get: (id: number) => `${API_CONFIG.ENDPOINTS.BAGS}/${id}`,
    update: (id: number) => `${API_CONFIG.ENDPOINTS.BAGS}/${id}`,
    delete: (id: number) => `${API_CONFIG.ENDPOINTS.BAGS}/${id}`,
  };
  
  static buyers = {
    list: () => API_CONFIG.ENDPOINTS.BUYERS,
    create: () => API_CONFIG.ENDPOINTS.BUYERS,
    get: (id: number) => `${API_CONFIG.ENDPOINTS.BUYERS}/${id}`,
    update: (id: number) => `${API_CONFIG.ENDPOINTS.BUYERS}/${id}`,
    delete: (id: number) => `${API_CONFIG.ENDPOINTS.BUYERS}/${id}`,
  };
  
  // Dashboard endpoints
  static dashboard = {
    stats: () => API_CONFIG.ENDPOINTS.DASHBOARD.STATS,
    missingBags: () => API_CONFIG.ENDPOINTS.DASHBOARD.MISSING_BAGS,
  };
  
  // Report endpoints
  static reports = {
    gst: () => API_CONFIG.ENDPOINTS.REPORTS.GST,
    cess: () => API_CONFIG.ENDPOINTS.REPORTS.CESS,
    tax: () => API_CONFIG.ENDPOINTS.REPORTS.TAX,
    finalAccounts: () => API_CONFIG.ENDPOINTS.REPORTS.FINAL_ACCOUNTS,
  };
  
  // Billing endpoints
  static billing = {
    farmerBills: () => API_CONFIG.ENDPOINTS.BILLING.FARMER_BILLS,
    taxInvoices: () => API_CONFIG.ENDPOINTS.BILLING.TAX_INVOICES,
  };
  
  // System endpoints
  static system = {
    setup: () => API_CONFIG.ENDPOINTS.SYSTEM.SETUP,
    test: () => API_CONFIG.ENDPOINTS.SYSTEM.TEST,
    testDb: () => API_CONFIG.ENDPOINTS.SYSTEM.TEST_DB,
  };
}

/**
 * Log API configuration for debugging
 */
export function logApiConfig() {
  console.group('🔧 API Configuration');
  console.log('Environment:', ENV_INFO.mode);
  console.log('API Base URL:', ENV_INFO.apiUrl);
  console.log('Is Development:', ENV_INFO.isDevelopment);
  console.log('Is Production:', ENV_INFO.isProduction);
  console.groupEnd();
}

// Log configuration in development
if (ENV_INFO.isDevelopment) {
  logApiConfig();
}