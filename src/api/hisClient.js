import axios from 'axios';

const hisClient = axios.create({
  baseURL: 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

hisClient.interceptors.response.use(
  res => res,
  err => {
    const msg =
      err.response?.data?.message ||
      (typeof err.response?.data === 'string' ? err.response.data : null) ||
      err.message ||
      'HIS request failed';
    return Promise.reject(new Error(String(msg)));
  }
);

export default hisClient;
