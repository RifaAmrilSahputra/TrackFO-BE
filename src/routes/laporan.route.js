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

// Teknisi
router.post('/', authGuard, authorizeRole(['TEKNISI']), createLaporan)
router.get('/my', authGuard, authorizeRole(['TEKNISI']), getMyLaporan)

// ADMIN tidak boleh mengakses report selain miliknya
router.get('/', authGuard, authorizeRole(['ADMIN', 'SUPER_ADMIN']), getAllLaporan)
router.get('/:id', authGuard, authorizeRole(['ADMIN', 'SUPER_ADMIN']), getLaporanById)



export default router