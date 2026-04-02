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

/**
 * STRATEGI ROUTING GANGGUAN:
 * 1. Admin endpoints: CRUD gangguan
 * 2. Teknisi endpoints: melihat tugas mereka
 * 3. Nested routes: assignment sebagai sub-resource
 */

// --- ADMIN ENDPOINTS ---
router.post('/', authGuard, authorizeRole(['ADMIN']), createGangguan)
router.get('/', authGuard, authorizeRole(['ADMIN']), getAllGangguan)
router.get('/:id', authGuard, authorizeRole(['ADMIN']), getGangguanById)
router.patch('/:id', authGuard, authorizeRole(['ADMIN']), updateGangguan)

// --- NESTED ROUTES: ASSIGNMENT ---
router.use('/', assignmentRoute)

// --- TEKNISI ENDPOINTS ---
router.get('/my-task/tasks', authGuard, authorizeRole(['TEKNISI']), getMyTasks)

export default router