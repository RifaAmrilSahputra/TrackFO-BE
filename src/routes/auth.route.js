import { Router } from 'express'
import rateLimit from 'express-rate-limit';
import { 
  login, 
  logout, 
  changeMyPassword, 
  changeTeknisiPassword 
} from '../controllers/auth.controller.js'
import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

/**
 * Rate Limiter (Saran Model 1)
 * Mencegah hacker mencoba ribuan password (Brute Force)
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: process.env.NODE_ENV === 'test' ? 50 : 10,
  message: { success: false, message: 'Terlalu banyak percobaan login, coba lagi nanti.' }
})

// --- PUBLIC ROUTES ---
router.post('/login', loginLimiter, login)

// --- PROTECTED ROUTES ---
// Sesuai saran Model 2: Logout butuh authGuard
router.post('/logout', authGuard, logout)

// Ganti password sendiri
router.patch('/change-password', authGuard, changeMyPassword)

/**
 * RESET PASSWORD (ADMIN ONLY)
 * Saran Model 1 & 2: Gunakan struktur RESTful /users/:id/password
 */
router.patch(
  '/users/:id/password', 
  authGuard, 
  authorizeRole(['ADMIN']), 
  changeTeknisiPassword
)

export { loginLimiter }
export default router