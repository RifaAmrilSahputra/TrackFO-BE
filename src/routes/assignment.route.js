import { Router } from 'express'
import {
  assignTeknisiToGangguan,
  getAssignmentsByGangguanId,
  updateAssignmentStatus
} from '../controllers/assignment.controller.js'
import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

/**
 * ASSIGNMENT ENDPOINTS
 * Assignment adalah sub-resource dari gangguan
 */

// --- ADMIN ENDPOINTS ---
router.post('/:id/assign', authGuard, authorizeRole(['ADMIN']), assignTeknisiToGangguan)
router.get('/:id/assignments', authGuard, authorizeRole(['ADMIN']), getAssignmentsByGangguanId)

// --- TEKNISI ENDPOINTS ---
router.patch('/assignment/:assignmentId/status', authGuard, authorizeRole(['TEKNISI']), updateAssignmentStatus)

export default router