import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { firebaseAuth } from "../lib/firebase";

const baseURL =
  import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export const axiosClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

axiosClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await firebaseAuth?.currentUser?.getIdToken();
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  },
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string }>) => {
    if (!error.response) {
      if (error.code === "ERR_CANCELED") return Promise.reject(error);
      return Promise.reject(
        new Error(
          `Cannot connect to the backend API at ${baseURL}. Start the backend from its folder with "npm run dev" and make sure MongoDB is running.`,
        ),
      );
    }

    const message =
      error.response.data?.error ??
      `Request failed (${error.response.status}).`;
    return Promise.reject(
      Object.assign(new Error(message), { status: error.response.status }),
    );
  },
);
