import userService from '../services/user.service.js'
import crypto from 'crypto' // Lebih aman daripada Math.random

// Helper sederhana untuk validasi email (Saran Model 2)
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

/**
 * CREATE USER (Admin Only)
 */
async function createUser(req, res, next) {
  try {
    const { name, email, password, roles, ...teknisiData } = req.body

    // 1. Validasi Input
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ success: false, message: 'Nama dan email wajib diisi' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Format email tidak valid' })
    }
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal pilih satu role' })
    }

    // 2. Password Management (Saran Model 1 & 2)
    let finalPassword = password
    let tempPassword = null
    if (!finalPassword) {
      tempPassword = crypto.randomBytes(4).toString('hex') // Generate 8 karakter random
      finalPassword = tempPassword
    }

    // 3. Delegasi ke Service (Controller tidak boleh akses DB langsung!)
    const newUser = await userService.createUserWithProfile({
      nama: name.trim(),
      email: email.toLowerCase().trim(),
      password: finalPassword,
      roles: roles.map(r => r.toUpperCase()),
      ...teknisiData
    })

    res.status(201).json({
      success: true,
      message: 'User berhasil dibuat',
      data: newUser,
      ...(tempPassword && { temporaryPassword: tempPassword })
    })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE USER (Admin Only)
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params
    const authUserId = req.user.id

    // Prevent Self-Delete (Saran Model 2)
    if (Number(id) === authUserId) {
      return res.status(400).json({ success: false, message: 'Anda tidak bisa menghapus akun sendiri' })
    }

    await userService.deleteUser(id)

    res.json({ success: true, message: 'User berhasil dihapus' })
  } catch (err) {
    next(err)
  }
}

/**
 * GET ALL TEKNISI (Admin Only)
 */
async function getAllTeknisi(req, res, next) {
  try {
    const teknisiList = await userService.getUsersByRole('TEKNISI')
    
    res.json({
      success: true,
      message: 'Data teknisi berhasil diambil',
      data: teknisiList
    })
  } catch (err) {
    next(err)
  }
}

/**
 * UPDATE TEKNISI (Admin atau Teknisi itu sendiri)
 */
async function updateTeknisi(req, res, next) {
  try {
    const { id } = req.params
    const authUser = req.user
    const updateData = req.body

    // Authorization Check
    const isAdmin = authUser.roles.includes('ADMIN')
    const isSelf = authUser.id === Number(id)

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' })
    }

    // Jika bukan admin, teknisi dilarang ubah nama/email/role sendiri lewat endpoint ini
    if (!isAdmin) {
      delete updateData.nama
      delete updateData.email
      delete updateData.roles
    }

    const updated = await userService.updateFullUserProfile(id, updateData)

    res.json({
      success: true,
      message: 'Data berhasil diperbarui',
      data: updated
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET PROFILE (Untuk Teknisi melihat datanya sendiri)
 */
async function getMyProfile(req, res, next) {
  try {
    const profile = await userService.getUserById(req.user.id)
    res.json({ success: true, data: profile })
  } catch (err) {
    next(err)
  }
}

export { 
  createUser, 
  deleteUser, 
  getAllTeknisi, 
  updateTeknisi, 
  getMyProfile 
}