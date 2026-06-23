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

// SUPER_ADMIN & ADMIN
router.post('/', authGuard, authorizeRole(['ADMIN', 'SUPER_ADMIN']), createGangguan)
router.get('/', authGuard, authorizeRole(['ADMIN', 'SUPER_ADMIN']), getAllGangguan)
router.patch('/:id', authGuard, authorizeRole(['ADMIN', 'SUPER_ADMIN']), updateGangguan)
router.get('/:id', authGuard, authorizeRole(['ADMIN', 'SUPER_ADMIN']), getGangguanById)

// Delete hanya boleh oleh SUPER_ADMIN (ADMIN tidak boleh menghapus gangguan)
router.delete('/:id', authGuard, authorizeRole(['SUPER_ADMIN']), async (req, res) => {
  // placeholder: delete endpoint saat ini belum ada di route gangguan.
  // Pastikan controller gangguan delete diimplementasikan jika diperlukan.
  res.status(501).json({ success: false, message: 'Delete gangguan belum diimplementasi pada backend.' })
})



// (Catatan) SUPER_ADMIN juga boleh akses view keseluruhan via rule di atas.

// Teknisi
router.get('/my/tasks', authGuard, authorizeRole(['TEKNISI']), getMyTasks)


// Nested: assignment
router.use('/', assignmentRoute)

export default router