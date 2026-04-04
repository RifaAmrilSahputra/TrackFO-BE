import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import {
  login,
  logout,
  changeMyPassword,
  changeTeknisiPassword
} from '../controllers/auth.controller.js'

import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

// Limit login attempts to prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 50 : 10,
  message: { success: false, message: 'Terlalu banyak percobaan login, coba lagi nanti.' }
})

// Public
router.post('/login', loginLimiter, login)

// Protected
router.post('/logout', authGuard, logout)
router.patch('/change-password', authGuard, changeMyPassword)

// Admin only: reset user password
router.patch(
  '/users/:id/password',
  authGuard,
  authorizeRole(['ADMIN']),
  changeTeknisiPassword
)

export { loginLimiter }
export default router