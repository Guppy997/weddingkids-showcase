import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { apiLogin, apiVerifyToken, apiRegisterUser, apiUpdateProfile, apiChangePassword } from '../api';

export interface AuthUser {
  id: string;
  name: string;
  role: 'Admin' | 'Staff';
  department: string;
  avatarColor: string;
  avatarImage: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  registerUser: (username: string, password: string, name: string, department: string, role?: string) => Promise<void>;
  updateProfile: (updates: { name?: string; avatarColor?: string; avatarImage?: string | null }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Globaler Auto-Logout, wenn API 401 zurückgibt (Token abgelaufen / ungültig)
  useEffect(() => {
    const handleExpired = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (!storedToken) { setIsLoading(false); return; }

    apiVerifyToken(storedToken)
      .then(({ user: u }) => {
        const authUser: AuthUser = {
          id: u.userId, name: u.name, role: u.role, department: u.department,
          avatarColor: u.avatarColor ?? '#008080',
          avatarImage: u.avatarImage ?? null,
        };
        setToken(storedToken);
        setUser(authUser);
        localStorage.setItem('authUser', JSON.stringify(authUser));
      })
      .catch(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const { token: newToken, user: newUser } = await apiLogin(username, password);
    const authUser: AuthUser = { ...newUser, avatarColor: newUser.avatarColor ?? '#008080', avatarImage: newUser.avatarImage ?? null };
    setToken(newToken);
    setUser(authUser);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(authUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  const registerUser = async (username: string, password: string, name: string, department: string, role?: string) => {
    if (!token) throw new Error('Must be logged in to register users');
    await apiRegisterUser(token, { username, password, name, department, role });
  };

  const updateProfile = async (updates: { name?: string; avatarColor?: string; avatarImage?: string | null }) => {
    if (!token) throw new Error('Not logged in');
    const { token: newToken, user: updated } = await apiUpdateProfile(token, updates);
    const authUser: AuthUser = { ...updated, avatarColor: updated.avatarColor ?? '#008080', avatarImage: updated.avatarImage ?? null };
    setToken(newToken);
    setUser(authUser);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(authUser));
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) throw new Error('Not logged in');
    await apiChangePassword(token, currentPassword, newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, registerUser, updateProfile, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
