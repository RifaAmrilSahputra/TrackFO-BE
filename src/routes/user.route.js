import { Router } from 'express'
const router = Router()

import authGuard from '../middlewares/auth.middleware'
import authorizeRole from '../middlewares/role.middleware'
import { deleteUser, createUser } from '../controllers/user.controller'

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
