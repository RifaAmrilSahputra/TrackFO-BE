import { Router } from 'express'
import {
  createLaporan,
  getAllLaporan,
  getLaporanById,
  getMyLaporan
} from '../controllers/laporan.controller.js'
import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

/**
 * LAPORAN ENDPOINTS
 * Laporan adalah hasil akhir pekerjaan teknisi
 */

// --- TEKNISI ENDPOINTS ---
router.post('/', authGuard, authorizeRole(['TEKNISI']), createLaporan)
router.get('/my', authGuard, authorizeRole(['TEKNISI']), getMyLaporan)

// --- ADMIN ENDPOINTS ---
router.get('/', authGuard, authorizeRole(['ADMIN']), getAllLaporan)
router.get('/:id', authGuard, authorizeRole(['ADMIN']), getLaporanById)

export default router