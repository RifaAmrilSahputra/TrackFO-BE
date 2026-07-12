import { Router } from 'express'

import {
  deleteUser,
  createUser,
  getAllTeknisi,
  updateTeknisi,
  updateMyProfile,
  getMyProfile,
  getAreas,
  getAllAdmins,
  getUserById
} from '../controllers/user.controller.js'

import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

// Self
router.get('/me', authGuard, authorizeRole(['TEKNISI']), getMyProfile)
router.patch('/me', authGuard, authorizeRole(['TEKNISI']), updateMyProfile)

// SUPER_ADMIN saja yang boleh mengelola Admin/Teknisi
router.get('/admins', authGuard, authorizeRole(['SUPER_ADMIN']), getAllAdmins)
router.get('/teknisi', authGuard, authorizeRole(['SUPER_ADMIN', 'ADMIN']), getAllTeknisi)
router.post('/', authGuard, authorizeRole(['SUPER_ADMIN', 'ADMIN']), createUser)
router.get(
  '/areas',
  authGuard,
  authorizeRole(['SUPER_ADMIN', 'ADMIN']),
  getAreas
)

router.get('/:id', authGuard, authorizeRole(['SUPER_ADMIN']), getUserById)

// By ID
router.patch('/:id', authGuard, authorizeRole(['SUPER_ADMIN', 'ADMIN', 'TEKNISI']), updateTeknisi)
router.delete('/:id', authGuard, authorizeRole(['SUPER_ADMIN']), deleteUser)

export default router
