import { Router } from 'express'

import {
  postTracking,
  getAllTracking,
  getTeknisiTracking
} from '../controllers/tracking.controller.js'

import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

router.post('/', authGuard, authorizeRole(['TEKNISI']), postTracking)

// ADMIN hanya melihat tracking teknisi tertentu, bukan seluruh sistem
router.get('/', authGuard, authorizeRole(['ADMIN']), getAllTracking)
router.get('/teknisi/:teknisiId', authGuard, authorizeRole(['ADMIN']), getTeknisiTracking)



export default router