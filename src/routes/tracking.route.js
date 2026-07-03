import { Router } from 'express'

import {
  postTracking,
  getAllTracking,
  getGangguanTracking,
  getActiveGangguanList,
  getTeknisiTracking
} from '../controllers/tracking.controller.js'

import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

router.post('/', authGuard, authorizeRole(['TEKNISI']), postTracking)

// ADMIN hanya melihat tracking teknisi tertentu, bukan seluruh sistem
router.get('/', authGuard, authorizeRole(['ADMIN']), getAllTracking)
router.get('/teknisi/:teknisiId', authGuard, authorizeRole(['ADMIN']), getTeknisiTracking)

// SUPER_ADMIN bisa melihat tracking teknisi tertentu, bukan seluruh sistem
router.get(
  '/gangguan/:gangguanId',
  authGuard,
  authorizeRole(['ADMIN', 'SUPER_ADMIN']),
  getGangguanTracking
)

// SUPER_ADMIN bisa melihat daftar gangguan yang sedang aktif (assigned, on_the_way, working)
router.get(
  '/gangguan',
  authGuard,
  authorizeRole(['ADMIN', 'SUPER_ADMIN']),
  getActiveGangguanList
)



export default router