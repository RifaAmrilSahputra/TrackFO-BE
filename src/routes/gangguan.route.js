import { Router } from 'express'

import {
  createGangguan,
  getAllGangguan,
  getGangguanById,
  updateGangguan,
  getMyTasks
} from '../controllers/gangguan.controller.js'

import assignmentRoute from './assignment.route.js'
import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

// Admin
router.post('/', authGuard, authorizeRole(['ADMIN']), createGangguan)
router.get('/', authGuard, authorizeRole(['ADMIN']), getAllGangguan)
router.patch('/:id', authGuard, authorizeRole(['ADMIN']), updateGangguan)

// Teknisi
router.get('/my/tasks', authGuard, authorizeRole(['TEKNISI']), getMyTasks)

// Admin
router.get('/:id', authGuard, authorizeRole(['ADMIN']), getGangguanById)

// Nested: assignment
router.use('/', assignmentRoute)

export default router