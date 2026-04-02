import axios from 'axios'

const api = axios.create({
  withCredentials: true, // отправляем session cookie с каждым запросом
})

// При 401 — сессия истекла, отправляем на логин
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
