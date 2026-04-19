import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      tenantId: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}

export const authService = {
  // Login
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Logout
  async logout(): Promise<void> {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  // Forgot password
  async forgotPassword(email: string): Promise<any> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Verify OTP
  async verifyOTP(email: string, otp: string): Promise<any> {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },

  // Resend OTP
  async resendOTP(email: string): Promise<any> {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  // Reset password
  async resetPassword(resetToken: string, newPassword: string): Promise<any> {
    const response = await api.post('/auth/reset-password', {
      resetToken,
      newPassword,
    });
    return response.data;
  },

  // Change password
  async changePassword(oldPassword: string, newPassword: string): Promise<any> {
    const response = await api.post('/auth/change-password', { oldPassword, newPassword });
    return response.data;
  },

  // Change profile (name, email, phone)
  async changeProfile(profileData: { name?: string; email?: string; mobile?: string }): Promise<any> {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  // Get current user
  async getCurrentUser(): Promise<any> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Refresh access token
  async refreshToken(): Promise<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken || refreshToken === 'null' || refreshToken === 'undefined') {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh-token', { refreshToken });
    const { accessToken, user } = response.data.data;
    
    localStorage.setItem('accessToken', accessToken);
    return { accessToken, user };
  },
};
