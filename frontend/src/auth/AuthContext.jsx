import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api, setToken } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("house_pulse_token");
    if (!token) {
      setBooting(false);
      return;
    }
    api
      .get("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setToken(""))
      .finally(() => setBooting(false));
  }, []);

  const login = async (username, password) => {
    const data = await api.post("/auth/login", { username, password });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const data = await api.post("/auth/register", payload);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    setToken("");
    setUser(null);
  };

  const refresh = async () => {
    const data = await api.get("/auth/me");
    setUser(data.user);
    return data.user;
  };

  const value = useMemo(
    () => ({ user, booting, login, register, logout, refresh }),
    [user, booting]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
