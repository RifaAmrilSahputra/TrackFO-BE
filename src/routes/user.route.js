import { Router } from 'express'
import { 
  deleteUser, 
  createUser, 
  getAllTeknisi, 
  updateTeknisi, 
  getMyProfile 
} from '../controllers/user.controller.js'
import authGuard from '../middlewares/auth.middleware.js'
import authorizeRole from '../middlewares/role.middleware.js'

const router = Router()

/**
 * STRATEGI ROUTING:
 * 1. Urutan: Statis/Spesifik (me, teknisi) -> Dinamis (/:id)
 * 2. Konsistensi: Gunakan PATCH untuk update sebagian data
 */

// --- 1. SELF SERVICE (Paling Spesifik) ---
// Teknisi melihat & update profilnya sendiri
router.get('/me', authGuard, authorizeRole(['TEKNISI']), getMyProfile)
router.patch('/me', authGuard, authorizeRole(['TEKNISI']), updateTeknisi) 
// (Note: di controller kita sudah buat logic id = req.user.id jika bukan admin)


// --- 2. COLLECTION DATA (Admin Only) ---
// Mendapatkan semua user dengan role teknisi
router.get('/teknisi', authGuard, authorizeRole(['ADMIN']), getAllTeknisi)

// Membuat user baru (Admin, Teknisi, dll)
router.post('/', authGuard, authorizeRole(['ADMIN']), createUser)


// --- 3. PARAMETERIZED ROUTES (Paling General - Taruh di Bawah) ---
// Update teknisi spesifik (Bisa oleh Admin atau Teknisi itu sendiri)
router.patch('/:id', authGuard, authorizeRole(['ADMIN', 'TEKNISI']), updateTeknisi)

// Hapus user (Hanya Admin)
router.delete('/:id', authGuard, authorizeRole(['ADMIN']), deleteUser)

export default router