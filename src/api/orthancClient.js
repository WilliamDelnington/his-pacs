import axios from 'axios';

const orthancClient = axios.create({
  baseURL: 'http://localhost:3000/orthanc',
});

orthancClient.interceptors.response.use(
  res => res,
  err => {
    // Orthanc error shape: { Message: "...", HttpError: "...", HttpStatus: 404 }
    const msg =
      err.response?.data?.Message ||
      err.response?.data?.message ||
      (typeof err.response?.data === 'string' ? err.response.data : null) ||
      err.message ||
      'Orthanc request failed';
    return Promise.reject(new Error(String(msg)));
  }
);

export function configureOrthanc(_baseURL, username, password) {
  orthancClient.defaults.auth = { username, password };
}

export default orthancClient;
