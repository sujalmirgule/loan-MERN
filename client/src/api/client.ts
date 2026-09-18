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

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Array<{ field?: string; message: string }>;
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

  const isFormData = typeof FormData !== 'undefined' && customConfig.body instanceof FormData;

  const reqHeaders: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

    // Handle blob / binary responses
    const contentType = response.headers.get('content-type') || '';
    if (customConfig.cache === 'no-store' && !contentType.includes('application/json')) {
      // Return raw response for streams
      return response as unknown as T;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { data: {} } as unknown as T;
    }

    // If client requested blob
    if ((options as { responseType?: string }).responseType === 'blob') {
      const blob = await response.blob();
      return {
        data: blob,
        headers: {
          'content-type': response.headers.get('content-type') || 'application/octet-stream',
          'content-disposition': response.headers.get('content-disposition') || '',
        },
      } as unknown as T;
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

    // Wrap in { data } structure to support both data.field and res.data
    const wrapped = {
      ...data,
      data,
    };

    return wrapped as T;
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network error or service unavailable';
    throw new ApiError(500, message);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
apiClient.get = async (endpoint: string, options?: RequestOptions & { responseType?: string }): Promise<any> => {
  return apiClient<any>(endpoint, { ...options, method: 'GET' });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
apiClient.post = async (endpoint: string, body?: unknown, options?: RequestOptions): Promise<any> => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  return apiClient<any>(endpoint, {
    ...options,
    method: 'POST',
    body: isFormData ? (body as FormData) : JSON.stringify(body),
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
apiClient.patch = async (endpoint: string, body?: unknown, options?: RequestOptions): Promise<any> => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  return apiClient<any>(endpoint, {
    ...options,
    method: 'PATCH',
    body: isFormData ? (body as FormData) : JSON.stringify(body),
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
apiClient.delete = async (endpoint: string, options?: RequestOptions): Promise<any> => {
  return apiClient<any>(endpoint, { ...options, method: 'DELETE' });
};

