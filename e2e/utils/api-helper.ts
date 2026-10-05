import { APIRequestContext, request as playwrightRequest } from '@playwright/test';
import { TEST_CONFIG } from './constants';

export class ApiHelper {
  private request: APIRequestContext;
  private token?: string;
  private role?: string;

  constructor(request: APIRequestContext, token?: string, role?: string) {
    this.request = request;
    this.token = token;
    this.role = role;
  }

  static async create(token?: string, role?: string): Promise<ApiHelper> {
    const ctx = await playwrightRequest.newContext({
      baseURL: TEST_CONFIG.API_URL,
    });
    return new ApiHelper(ctx, token, role);
  }

  setAuth(token: string, role?: string) {
    this.token = token;
    this.role = role;
  }

  private getHeaders(extraHeaders: Record<string, string> = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.role) {
      headers['x-user-role'] = this.role;
    }
    return headers;
  }

  async login(email: string, pass: string) {
    const res = await this.request.post(`${TEST_CONFIG.API_URL}/auth/login`, {
      data: { email, password: pass },
    });
    const json = await res.json();
    if (json.success && json.data) {
      this.token = json.data.token;
      this.role = json.data.user?.role;
    }
    return { status: res.status(), body: json };
  }

  async get(endpoint: string, params?: Record<string, any>, extraHeaders?: Record<string, string>) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const res = await this.request.get(`${TEST_CONFIG.API_URL}/${cleanEndpoint}`, {
      headers: this.getHeaders(extraHeaders),
      params,
    });
    let body: any;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    return { status: res.status(), body };
  }

  async post(endpoint: string, data?: any, extraHeaders?: Record<string, string>) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const res = await this.request.post(`${TEST_CONFIG.API_URL}/${cleanEndpoint}`, {
      headers: this.getHeaders(extraHeaders),
      data,
    });
    let body: any;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    return { status: res.status(), body };
  }

  async patch(endpoint: string, data?: any, extraHeaders?: Record<string, string>) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const res = await this.request.patch(`${TEST_CONFIG.API_URL}/${cleanEndpoint}`, {
      headers: this.getHeaders(extraHeaders),
      data,
    });
    let body: any;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    return { status: res.status(), body };
  }

  async delete(endpoint: string, extraHeaders?: Record<string, string>) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const res = await this.request.delete(`${TEST_CONFIG.API_URL}/${cleanEndpoint}`, {
      headers: this.getHeaders(extraHeaders),
    });
    let body: any;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    return { status: res.status(), body };
  }
}
