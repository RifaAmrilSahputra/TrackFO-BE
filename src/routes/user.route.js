import { Router } from 'express'

import {
  deleteUser,
  createUser,
  getAllTeknisi,
  updateTeknisi,
  getMyProfile
} from '../controllers/user.controller.js'

import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

// Self
router.get('/me', authGuard, authorizeRole(['TEKNISI']), getMyProfile)
router.patch('/me', authGuard, authorizeRole(['TEKNISI']), updateTeknisi)

// Admin
router.get('/teknisi', authGuard, authorizeRole(['ADMIN']), getAllTeknisi)
router.post('/', authGuard, authorizeRole(['ADMIN']), createUser)

// By ID
router.patch('/:id', authGuard, authorizeRole(['ADMIN', 'TEKNISI']), updateTeknisi)
router.delete('/:id', authGuard, authorizeRole(['ADMIN']), deleteUser)

export default router