// axiosConfig.js
import axios from 'axios';

const instance = axios.create({
  baseURL: "https://mern-chat-backend-tdgo.onrender.com",
  withCredentials: true,
});

export default instance;
