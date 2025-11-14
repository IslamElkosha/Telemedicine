import { ApiResponse } from './types.js';

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = '/api/v1') {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private saveToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  private removeToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            code: 'HTTP_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
        },
      };
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.token) {
      this.saveToken(response.data.token);
    }

    return response;
  }

  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    this.removeToken();
    return response;
  }

  async refreshToken() {
    const response = await this.request<{ token: string }>('/auth/refresh', {
      method: 'POST',
    });

    if (response.success && response.data?.token) {
      this.saveToken(response.data.token);
    }

    return response;
  }

  // User profile
  async getMe() {
    return this.request('/me');
  }

  async updateProfile(updates: any) {
    return this.request('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Appointments
  async getAppointments(filters: any = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/appointments?${params}`);
  }

  async createAppointment(appointmentData: any) {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointmentData),
    });
  }

  async updateAppointment(id: string, updates: any) {
    return this.request(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async confirmAppointment(id: string) {
    return this.request(`/appointments/${id}/confirm`, {
      method: 'POST',
    });
  }

  async startAppointment(id: string) {
    return this.request(`/appointments/${id}/start`, {
      method: 'POST',
    });
  }

  async completeAppointment(id: string, summary?: string) {
    return this.request(`/appointments/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ summary }),
    });
  }

  async cancelAppointment(id: string, reason?: string) {
    return this.request(`/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Technician specific
  async getTechnicianProfile() {
    return this.request('/technicians/me');
  }

  async updateTechnicianProfile(updates: any) {
    return this.request('/technicians/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async updateTechnicianLocation(lat: number, lng: number) {
    return this.request('/technicians/me/geo', {
      method: 'PATCH',
      body: JSON.stringify({ lat, lng }),
    });
  }

  async getMyKits() {
    return this.request('/kits/me');
  }

  async updateKitStatus(kitId: string, status: string) {
    return this.request(`/kits/${kitId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Devices
  async pairDevice(pairingCode: string, kitId?: string) {
    return this.request('/devices/pair', {
      method: 'POST',
      body: JSON.stringify({ pairingCode, kitId }),
    });
  }

  async getDevice(id: string) {
    return this.request(`/devices/${id}`);
  }

  async updateDevice(id: string, updates: any) {
    return this.request(`/devices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Sessions
  async createSession(appointmentId: string) {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    });
  }

  async closeSession(sessionId: string, summary?: string) {
    return this.request(`/sessions/${sessionId}/close`, {
      method: 'POST',
      body: JSON.stringify({ summary }),
    });
  }

  async submitReading(sessionId: string, reading: any) {
    return this.request(`/sessions/${sessionId}/readings`, {
      method: 'POST',
      body: JSON.stringify(reading),
    });
  }

  async getSessionReadings(sessionId: string, cursor?: string) {
    const params = cursor ? `?cursor=${cursor}` : '';
    return this.request(`/sessions/${sessionId}/readings${params}`);
  }

  // Payments
  async createPaymentIntent(appointmentId: string) {
    return this.request('/payments/intent', {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    });
  }

  async getPayment(id: string) {
    return this.request(`/payments/${id}`);
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }
}

export const apiClient = new ApiClient();