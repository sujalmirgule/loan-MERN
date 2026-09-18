export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{ field?: string; message: string }>;
}

export class ApiError extends Error {
  public status: number;
  public errors?: Array<{ field?: string; message: string }>;

  constructor(status: number, message: string, errors?: Array<{ field?: string; message: string }>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions extends RequestInit {
  tokenType?: 'customer' | 'admin' | 'auto';
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { tokenType = 'auto', params, headers = {}, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Determine which token to attach
  let token: string | null = null;
  if (tokenType === 'admin') {
    token = localStorage.getItem('loan_approve_admin_token');
  } else if (tokenType === 'customer') {
    token = localStorage.getItem('loan_approve_customer_token');
  } else {
    // Auto: check active role or try admin then customer
    const activeRole = localStorage.getItem('loan_approve_active_role');
    if (activeRole === 'ADMIN') {
      token = localStorage.getItem('loan_approve_admin_token');
    } else {
      token = localStorage.getItem('loan_approve_customer_token') || localStorage.getItem('loan_approve_admin_token');
    }
  }

  if (token && !reqHeaders['Authorization']) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method: options.method || 'GET',
    headers: reqHeaders,
    ...customConfig,
  };

  try {
    const response = await fetch(url, config);

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.message || `HTTP ${response.status}: ${response.statusText}`;

      // Handle token expiration / unauthorized
      if (response.status === 401 && !endpoint.includes('/auth/')) {
        // Clear expired tokens if accessing protected resources
        localStorage.removeItem('loan_approve_customer_token');
        localStorage.removeItem('loan_approve_admin_token');
        localStorage.removeItem('loan_approve_active_role');
      }

      throw new ApiError(response.status, errorMessage, data?.errors);
    }

    return data as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network error or service unavailable';
    throw new ApiError(500, message);
  }
}
