import React, { createContext, useContext } from 'react';

interface AuthContextType {
  client: null;
  isAuthenticated: false;
  isAdmin: false;
  loading: false;
  login: () => Promise<{ success: boolean; error?: string }>;
  signup: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value: AuthContextType = {
    client: null,
    isAuthenticated: false,
    isAdmin: false,
    loading: false,
    login: async () => ({ success: false, error: "Auth removed" }),
    signup: async () => ({ success: false, error: "Auth removed" }),
    logout: async () => {},
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return {
      client: null,
      isAuthenticated: false,
      isAdmin: false,
      loading: false,
      login: async () => ({ success: false, error: "Auth removed" }),
      signup: async () => ({ success: false, error: "Auth removed" }),
      logout: async () => {},
    };
  }
  return context;
}