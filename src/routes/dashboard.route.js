import { Router } from "express";

import {
  getDashboard,
} from "../controllers/dashboard.controller.js";

import authGuard from "../middlewares/auth.middleware.js";

import authorizeRole from "../middlewares/role.middleware.js";

const router = Router();

router.get(
  "/",
  authGuard,
  authorizeRole([
    "ADMIN",
    "SUPER_ADMIN",
  ]),
  getDashboard
);

export default router;