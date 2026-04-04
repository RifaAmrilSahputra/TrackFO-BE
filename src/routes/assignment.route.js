import { Router } from 'express'

import {
  assignTeknisiToGangguan,
  getAssignmentsByGangguanId,
  updateAssignmentStatus
} from '../controllers/assignment.controller.js'

import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

// Admin
router.post('/:id/assign', authGuard, authorizeRole(['ADMIN']), assignTeknisiToGangguan)
router.get('/:id/assignments', authGuard, authorizeRole(['ADMIN']), getAssignmentsByGangguanId)

// Teknisi
router.patch(
  '/:id/assignment/:assignmentId/status',
  authGuard,
  authorizeRole(['TEKNISI']),
  updateAssignmentStatus
)

export default router