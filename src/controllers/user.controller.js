import userService from '../services/user.service.js'
import crypto from 'crypto'

// Helper validasi email
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

// CREATE USER (Admin / SUPER_ADMIN)
async function createUser(req, res, next) {
  try {
    const { name, email, password, roles, ...teknisiData } = req.body
    const authUser = req.user

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

    const normalizedRoles = roles.map(r => r.toUpperCase())
    const isSuperAdmin = authUser.roles.includes('SUPER_ADMIN')

    if (!isSuperAdmin) {
      const forbiddenRoles = normalizedRoles.filter((role) => role === 'ADMIN' || role === 'SUPER_ADMIN')
      if (forbiddenRoles.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Hanya SUPER_ADMIN yang dapat membuat akun ADMIN atau SUPER_ADMIN'
        })
      }
    }

    // 2. Password Management
    let finalPassword = password
    let tempPassword = null
    if (!finalPassword) {
      tempPassword = crypto.randomBytes(4).toString('hex') // Generate 8 karakter random
      finalPassword = tempPassword
    }

    // 3. Delegasi ke Service
    const newUser = await userService.createUserWithProfile({
      nama: name.trim(),
      email: email.toLowerCase().trim(),
      password: finalPassword,
      roles: normalizedRoles,
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

// DELETE USER (Admin)
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params
    const authUserId = req.user.id

    // Prevent Self-Delete
    if (Number(id) === authUserId) {
      return res.status(400).json({ success: false, message: 'Anda tidak bisa menghapus akun sendiri' })
    }

    await userService.deleteUser(id)

    res.json({ success: true, message: 'User berhasil dihapus' })
  } catch (err) {
    next(err)
  }
}

// GET ALL TEKNISI (Admin + SUPER_ADMIN)
async function getAllTeknisi(req, res, next) {
  try {
    const { area } = req.query

    const teknisiList = area
      ? await userService.getTeknisiByArea(area)
      : await userService.getUsersByRole('TEKNISI')

    res.json({
      success: true,
      message: 'Data teknisi berhasil diambil',
      data: teknisiList
    })
  } catch (err) {
    next(err)
  }
}

// UPDATE TEKNISI
async function updateTeknisi(req, res, next) {
  try {
    const { id } = req.params
    const authUser = req.user
    const updateData = req.body

    // Authorization Check
    const isAdmin = authUser.roles.includes('ADMIN') || authUser.roles.includes('SUPER_ADMIN')

    const isSelf = authUser.id === Number(id)

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' })
    }

    // Jika bukan admin, teknisi dilarang ubah nama/email/role sendiri
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

// UPDATE MY PROFILE (Teknisi)
async function updateMyProfile(req, res, next) {
  try {
    const authUser = req.user
    const updateData = req.body

    // Teknisi hanya bisa ubah password dan mungkin field lain yang diizinkan
    // Tidak bisa ubah nama, email, roles
    delete updateData.nama
    delete updateData.email
    delete updateData.roles

    const updated = await userService.updateFullUserProfile(authUser.id, updateData)

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui',
      data: updated
    })
  } catch (err) {
    next(err)
  }
}

// GET PROFILE (Teknisi)
async function getMyProfile(req, res, next) {
  try {
    const profile = await userService.getUserById(req.user.id)
    res.json({ success: true, data: profile })
  } catch (err) {
    next(err)
  }
}

// GET ALL ADMINS (SUPER_ADMIN)
async function getAllAdmins(req, res, next) {
  try {
    const admins = await userService.getUsersByRole('ADMIN')

    res.json({
      success: true,
      message: 'Data admin berhasil diambil',
      data: admins
    })
  } catch (err) {
    next(err)
  }
}

// GET USER BY ID (SUPER_ADMIN)
async function getUserById(req, res, next) {
  try {
    const { id } = req.params
    const user = await userService.getUserById(id)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' })
    }

    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
}

// GET Areas
async function getAreas(req, res, next) {
  try {
    const areas = await userService.getAreas()

    res.json({
      success: true,
      data: areas
    })
  } catch (err) {
    next(err)
  }
}

export { 
  createUser, 
  deleteUser, 
  getAllTeknisi, 
  updateTeknisi, 
  updateMyProfile,
  getMyProfile,
  getAreas,
  getAllAdmins,
  getUserById
} 