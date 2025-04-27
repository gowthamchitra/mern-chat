// axiosConfig.js
import axios from 'axios';

const instance = axios.create({
  baseURL: "https://ultra-chat-app.onrender.com",
  withCredentials: true,
});

export default instance;
