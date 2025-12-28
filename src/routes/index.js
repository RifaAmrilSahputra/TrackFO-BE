import { Router } from 'express'
const router = Router()

import authRoute from './auth.route.js'
import userRoute from './user.route.js'

router.use('/auth', authRoute)
router.use('/users', userRoute)

router.get('/cek', (req, res) => {
  res.json({ status: 'ANJAAYY' })
})

export default router
