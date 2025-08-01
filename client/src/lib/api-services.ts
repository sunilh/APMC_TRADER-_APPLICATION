/**
 * API Services Layer
 * Centralized API service functions using the standardized configuration
 * This demonstrates the cleanest way to handle all API calls
 */

import { apiRequest } from "./queryClient";
import { ApiEndpoints } from "./api-config";

// Type definitions for API responses
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

export interface DashboardStats {
  totalFarmers: number;
  activeLots: number;
  totalBagsToday: number;
  revenueToday: number;
}

export interface Farmer {
  id: number;
  name: string;
  mobile: string;
  place: string;
  bankName?: string;
  bankAccountNumber?: string;
  tenantId: number;
  createdAt: string;
}

export interface CreateFarmerData {
  name: string;
  mobile: string;
  place: string;
  bankName?: string;
  bankAccountNumber?: string;
}

/**
 * Authentication Services
 */
export class AuthService {
  static async login(credentials: { username: string; password: string }) {
    const response = await apiRequest("POST", ApiEndpoints.auth.login(), credentials);
    return response.json();
  }

  static async logout() {
    const response = await apiRequest("POST", ApiEndpoints.auth.logout());
    return response.json();
  }

  static async getCurrentUser() {
    const response = await apiRequest("GET", ApiEndpoints.auth.user());
    return response.json();
  }
}

/**
 * Farmer Services
 */
export class FarmerService {
  static async getAll(): Promise<Farmer[]> {
    const response = await apiRequest("GET", ApiEndpoints.farmers.list());
    return response.json();
  }

  static async getById(id: number): Promise<Farmer> {
    const response = await apiRequest("GET", ApiEndpoints.farmers.get(id));
    return response.json();
  }

  static async create(farmerData: CreateFarmerData): Promise<Farmer> {
    const response = await apiRequest("POST", ApiEndpoints.farmers.create(), farmerData);
    return response.json();
  }

  static async update(id: number, farmerData: Partial<CreateFarmerData>): Promise<Farmer> {
    const response = await apiRequest("PUT", ApiEndpoints.farmers.update(id), farmerData);
    return response.json();
  }

  static async delete(id: number): Promise<void> {
    await apiRequest("DELETE", ApiEndpoints.farmers.delete(id));
  }
}

/**
 * Dashboard Services
 */
export class DashboardService {
  static async getStats(): Promise<DashboardStats> {
    const response = await apiRequest("GET", ApiEndpoints.dashboard.stats());
    return response.json();
  }

  static async getMissingBags() {
    const response = await apiRequest("GET", ApiEndpoints.dashboard.missingBags());
    return response.json();
  }
}

/**
 * System Services
 */
export class SystemService {
  static async testConnection() {
    const response = await apiRequest("GET", ApiEndpoints.system.test());
    return response.json();
  }

  static async testDatabase() {
    const response = await apiRequest("POST", ApiEndpoints.system.testDb());
    return response.json();
  }

  static async setupDatabase() {
    const response = await apiRequest("POST", ApiEndpoints.system.setup());
    return response.json();
  }
}

/**
 * Report Services
 */
export class ReportService {
  static async getGSTReport(params?: { startDate?: string; endDate?: string }) {
    const url = ApiEndpoints.reports.gst();
    const queryParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await apiRequest("GET", `${url}${queryParams}`);
    return response.json();
  }

  static async getCessReport(params?: { startDate?: string; endDate?: string }) {
    const url = ApiEndpoints.reports.cess();
    const queryParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await apiRequest("GET", `${url}${queryParams}`);
    return response.json();
  }

  static async getFinalAccounts(params?: { fiscalYear?: string }) {
    const url = ApiEndpoints.reports.finalAccounts();
    const queryParams = params ? `?${new URLSearchParams(params).toString()}` : '';
    const response = await apiRequest("GET", `${url}${queryParams}`);
    return response.json();
  }
}

/**
 * Generic API Service for custom endpoints
 */
export class ApiService {
  static async get<T = any>(endpoint: string): Promise<T> {
    const response = await apiRequest("GET", endpoint);
    return response.json();
  }

  static async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await apiRequest("POST", endpoint, data);
    return response.json();
  }

  static async put<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await apiRequest("PUT", endpoint, data);
    return response.json();
  }

  static async delete<T = any>(endpoint: string): Promise<T> {
    const response = await apiRequest("DELETE", endpoint);
    return response.json();
  }
}

/**
 * Example usage in React components:
 * 
 * // Using React Query with the service
 * const { data: farmers, isLoading } = useQuery({
 *   queryKey: ['farmers'],
 *   queryFn: FarmerService.getAll
 * });
 * 
 * // Using mutations
 * const createFarmerMutation = useMutation({
 *   mutationFn: FarmerService.create,
 *   onSuccess: () => {
 *     queryClient.invalidateQueries(['farmers']);
 *   }
 * });
 * 
 * // Direct service call
 * const handleLogin = async (credentials) => {
 *   try {
 *     const result = await AuthService.login(credentials);
 *     console.log('Login successful:', result);
 *   } catch (error) {
 *     console.error('Login failed:', error);
 *   }
 * };
 */