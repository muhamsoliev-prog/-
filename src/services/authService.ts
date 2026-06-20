import axios from 'axios';

const API = '/api/auth';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  ipName: string;
  plan: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await axios.post<AuthResponse>(`${API}/login`, { email, password });
    return data;
  },

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const { data } = await axios.post<AuthResponse>(`${API}/register`, { email, password, name });
    return data;
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await axios.get<AuthUser>(`${API}/me`);
    return data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await axios.post(`${API}/change-password`, { oldPassword, newPassword });
  },

  setAuthHeader(token: string) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  clearAuthHeader() {
    delete axios.defaults.headers.common['Authorization'];
  },
};
