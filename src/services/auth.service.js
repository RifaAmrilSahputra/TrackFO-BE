import prisma from '../../config/prisma.js' // Gunakan singleton prisma kita
import bcrypt from 'bcrypt'
import { signToken } from '../utils/jwt.js'
import userService from './user.service.js'

/**
 * LOGIN SERVICE
 */
async function login(email, password) {
  // 1. Cari user & include roles untuk pengecekan awal
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: { role: true },
      },
    },
  })

  // 2. Validasi Keberadaan User
  if (!user) {
    throw { statusCode: 401, message: 'Email atau password salah' }
  }

  // 3. Validasi Status Aktif (Saran Model 1)
  if (!user.isActive) {
    throw { statusCode: 403, message: 'Akun Anda telah dinonaktifkan. Silakan hubungi admin.' }
  }

  // 4. Verifikasi Password
  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    throw { statusCode: 401, message: 'Email atau password salah' }
  }

  // 5. Mapping Roles untuk Response (bukan untuk JWT)
  const roles = user.roles.map(r => r.role.nama_role.toUpperCase())

  // 6. Generate Token (Saran Model 2: Payload Minimalis)
  const token = signToken({
    id: user.id,
    email: user.email,
  })

  return {
    token,
    user: {
      id: user.id,
      nama: user.nama,
      email: user.email,
      roles,
    },
  }
}

/**
 * RESET PASSWORD (ADMIN ONLY - Tanpa Password Lama)
 */
async function changeUserPassword(userId, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
  })

  if (!user) {
    throw { statusCode: 404, message: 'User tidak ditemukan' }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  
  // Update via userService agar logic update terpusat
  return await userService.updatePassword(user.id, hashedPassword)
}

/**
 * GANTI PASSWORD SENDIRI (Wajib Password Lama)
 */
async function changeMyPassword(userId, oldPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
  })

  if (!user) {
    throw { statusCode: 404, message: 'User tidak ditemukan' }
  }

  // 1. Verifikasi Password Lama
  const isMatch = await bcrypt.compare(oldPassword, user.password)
  if (!isMatch) {
    throw { statusCode: 401, message: 'Password lama yang Anda masukkan salah' }
  }

  // 2. Cegah Password Baru Sama Dengan Password Lama (Saran Model 1)
  if (oldPassword === newPassword) {
    throw { statusCode: 400, message: 'Password baru tidak boleh sama dengan password lama' }
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12)
  
  return await userService.updatePassword(user.id, hashedPassword)
}

export default { 
  login, 
  changeUserPassword, 
  changeMyPassword 
}