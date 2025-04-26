// axiosConfig.js
import axios from 'axios';

const instance = axios.create({
  baseURL: "https://mern-chat-backend1-9zu0.onrender.com",
  withCredentials: true,
});

export default instance;
