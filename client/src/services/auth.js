import api from "./api";

export const signup = async (email, password) => {
  const res = await api.post("/auth/signup", { email, password });
  return res.data;
};

export const login = async (email, password) => {
  const res = await api.post("/auth/login", { email, password });

  localStorage.setItem("token", res.data.data.token);
  localStorage.setItem("user", JSON.stringify(res.data.data.user));
  return res.data.data;
};

export const logout = () => {
  localStorage.removeItem("token");
};

export const getToken = () => localStorage.getItem("token");