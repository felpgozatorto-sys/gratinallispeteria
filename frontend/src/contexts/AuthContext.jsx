import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=logged out, object=user
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
      } catch {
        setUser(false);
      }
    };
    fetchMe();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data?.token) localStorage.setItem("gratinalli_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    if (data?.token) localStorage.setItem("gratinalli_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const googleMock = async () => {
    const { data } = await api.post("/auth/google-mock");
    if (data?.token) localStorage.setItem("gratinalli_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const loginGoogle = async (credential) => {
    const { data } = await api.post("/auth/google", { credential });
    if (data?.token) localStorage.setItem("gratinalli_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("gratinalli_token");
    setUser(false);
  };

  const refreshMe = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, googleMock, loginGoogle, logout, refreshMe, showAuthPrompt, setShowAuthPrompt }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
