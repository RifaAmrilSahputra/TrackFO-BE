import { Router } from 'express'
const router = Router()

import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'
import { deleteUser, createUser } from '../controllers/user.controller.js'

router.delete(
  '/:id',
  authGuard,
  authorizeRole(['admin']),
  deleteUser
)

router.post(
  '/',
  authGuard,
  authorizeRole(['admin']),
  createUser
)

export default router
