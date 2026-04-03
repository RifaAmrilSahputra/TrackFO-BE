import { Router } from 'express'
import authRoute from './auth.route.js'
import userRoute from './user.route.js'
import gangguanRoute from './gangguan.route.js'
import trackingRoute from './tracking.route.js'
import laporanRoute from './laporan.route.js'

const router = Router()

// Health Check (Standar Industri)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds` 
  })
})

router.use('/auth', authRoute)
router.use('/users', userRoute)
router.use('/gangguan', gangguanRoute)
router.use('/tracking', trackingRoute)
router.use('/laporan', laporanRoute)

export default router