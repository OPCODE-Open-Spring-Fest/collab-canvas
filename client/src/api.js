import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3000/api",
});

export const registerUser = (data) => API.post("/auth/signup", data);
export const loginUser = (data) => API.post("/auth/login", data);

