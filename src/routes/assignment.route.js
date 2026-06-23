import { Router } from 'express'

import {
  assignTeknisiToGangguan,
  getAssignmentsByGangguanId,
  updateAssignmentStatus
} from '../controllers/assignment.controller.js'

import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

// SUPER_ADMIN + ADMIN
router.post('/:id/assign', authGuard, authorizeRole(['SUPER_ADMIN', 'ADMIN']), assignTeknisiToGangguan)
router.get('/:id/assignments', authGuard, authorizeRole(['SUPER_ADMIN', 'ADMIN']), getAssignmentsByGangguanId)

// Teknisi
router.patch(
  '/assignment/:assignmentId/status',
  authGuard,
  authorizeRole(['TEKNISI']),
  updateAssignmentStatus
)


export default router