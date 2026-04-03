import { Router } from 'express'
import {
  postTracking,
  getAllTracking,
  getTeknisiTracking
} from '../controllers/tracking.controller.js'
import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

// Teknisi kirim lokasi periodik
router.post('/', authGuard, authorizeRole(['TEKNISI']), postTracking)

// Admin lihat semua teknisi terbaru
router.get('/', authGuard, authorizeRole(['ADMIN']), getAllTracking)

// Admin lihat track history teknisi
router.get('/teknisi/:teknisiId', authGuard, authorizeRole(['ADMIN']), getTeknisiTracking)

export default router
