import { create } from 'zustand'
import { api } from '../api'

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  checkUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    
    try {
      const { user } = await api.auth.me();
      set({ user, loading: false });
    } catch (error) {
      console.error(error);
      localStorage.removeItem('token');
      set({ user: null, loading: false });
    }
  },
  signIn: async (email, password) => {
    const { user, token } = await api.auth.login(email, password);
    localStorage.setItem('token', token);
    set({ user });
    return user;
  },
  signUp: async (email, password) => {
    const { user, token } = await api.auth.register(email, password);
    localStorage.setItem('token', token);
    set({ user });
    return user;
  },
  signOut: async () => {
    localStorage.removeItem('token');
    set({ user: null });
  }
}))

// Auto-check on load
useAuthStore.getState().checkUser()
