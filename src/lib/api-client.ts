import { useAuthStore } from '@/stores/auth-store';

const API_BASE = '/api';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return useAuthStore.getState().token;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string> || {}),
    };

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (networkError: any) {
      // Handle network errors (server unreachable, DNS failure, etc.)
      throw new Error('Unable to connect to server. Please check your connection.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async register(data: { name: string; email: string; phone?: string; password: string; role: string; skills?: string; hourlyRate?: number; location?: string; bio?: string; bankName?: string; accountNumber?: string; accountName?: string }) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Profile
  async getProfile() {
    return this.request<any>('/profile');
  }

  async updateProfile(data: any) {
    const result = await this.request<any>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result;
  }

  // Services
  async getServices(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<{ requests: any[]; total: number; page: number; limit: number }>(`/services${query}`);
  }

  async createService(data: { serviceType: string; description?: string; location: string; requestedDate: string; requestedTime: string; amount?: number; providerId?: string }) {
    return this.request<any>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Artisans Search with filters
  async searchArtisans(params?: {
    q?: string;
    service?: string;
    location?: string;
    minRate?: number;
    maxRate?: number;
    minRating?: number;
    availability?: string;
    sort?: string;
  }) {
    const filteredParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          filteredParams[key] = String(value);
        }
      });
    }
    const query = Object.keys(filteredParams).length > 0
      ? '?' + new URLSearchParams(filteredParams).toString()
      : '';
    return this.request<{
      artisans: any[];
      total: number;
      filters: {
        locations: string[];
        rateRange: { min: number; max: number };
        availabilities: string[];
        serviceTypes: { value: string; label: string }[];
      };
    }>(`/artisans/search${query}`);
  }

  // Providers
  async getProviders(serviceType: string) {
    return this.request<{ providers: any[] }>(`/providers?serviceType=${encodeURIComponent(serviceType)}`);
  }

  async matchProviders(requestId: string) {
    return this.request<{ matches: any[] }>(`/services/match?requestId=${requestId}`);
  }

  async serviceAction(requestId: string, action: string, providerId?: string) {
    return this.request<any>('/services/match', {
      method: 'POST',
      body: JSON.stringify({ requestId, action, providerId }),
    });
  }

  // Payments
  async getPayments(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<{ transactions: any[]; summary: { totalInEscrow: number; totalReleased: number; totalRefunded: number; platformFeeRate: number } }>(`/payments${query}`);
  }

  // Legacy mock payment (kept as fallback)
  async createPayment(requestId: string, paymentMethod?: string) {
    return this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify({ requestId, paymentMethod }),
    });
  }

  // Paystack: Initialize a real payment
  async initializePaystackPayment(requestId: string) {
    return this.request<{
      authorizationUrl: string;
      reference: string;
      accessCode: string;
      amount: number;
      requestId: string;
    }>('/payments/paystack', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    });
  }

  async paymentAction(transactionId: string, action: 'release' | 'refund') {
    return this.request<any>('/payments', {
      method: 'PUT',
      body: JSON.stringify({ transactionId, action }),
    });
  }

  // Feedback
  async getFeedback(providerId: string) {
    return this.request<any[]>(`/feedback?providerId=${providerId}`);
  }

  async submitFeedback(requestId: string, rating: number, comment?: string) {
    return this.request<any>('/feedback', {
      method: 'POST',
      body: JSON.stringify({ requestId, rating, comment }),
    });
  }

  // Notifications
  async getNotifications(unreadOnly?: boolean) {
    const query = unreadOnly ? '?unreadOnly=true' : '';
    return this.request<{ notifications: any[]; unreadCount: number }>(`/notifications${query}`);
  }

  async markNotificationsRead(notificationId?: string, markAllRead?: boolean) {
    return this.request<any>('/notifications', {
      method: 'PUT',
      body: JSON.stringify({ notificationId, markAllRead }),
    });
  }

  // Messages
  async getMessages(requestId: string) {
    return this.request<any[]>(`/messages?requestId=${requestId}`);
  }

  async sendMessage(requestId: string, content: string) {
    return this.request<any>('/messages', {
      method: 'POST',
      body: JSON.stringify({ requestId, content }),
    });
  }

  // Stats
  async getStats() {
    return this.request<any>('/stats');
  }

  // Admin
  async getAdminData(action?: string) {
    const query = action ? `?action=${action}` : '';
    return this.request<any>(`/admin${query}`);
  }

  async adminAction(action: string, targetId: string, details?: string) {
    return this.request<any>('/admin', {
      method: 'POST',
      body: JSON.stringify({ action, targetId, details }),
    });
  }
}

export const api = new ApiClient();
