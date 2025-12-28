import userService from '../services/user.service.js'

function isValidEmail(email) {
  const regex = /^[^\s@]+@[^^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

const validRoles = ['admin', 'teknisi']

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params
    const authUser = req.user

    const isAdmin = (authUser.roles && authUser.roles.includes('ADMIN')) || authUser.role === 'admin'
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' })
    }

    const existingUser = await userService.getUserById(id)
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' })
    }

    await userService.deleteUser(id)

    res.status(200).json({
      success: true,
      message: 'User berhasil dihapus',
    })
  } catch (err) {
    next(err)
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, roles, phone, area_kerja, alamat, koordinat } = req.body
    const authUser = req.user

    const isAdminCreate = (authUser.roles && authUser.roles.includes('ADMIN')) || authUser.role === 'admin'
    if (!isAdminCreate) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' })
    }

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Nama dan email wajib diisi' })
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Email tidak valid' })
    }

    if (!roles || !roles.every(r => validRoles.includes(r))) {
      return res.status(400).json({ success: false, message: 'Role tidak valid' })
    }

    let pwd = password
    let temporaryPassword = null
    if (!pwd) {
      temporaryPassword = Math.random().toString(36).slice(-8)
      pwd = temporaryPassword
    }

    const user = await userService.createUserWithRolesAndTeknisi({
      name,
      email,
      password: pwd,
      roles,
      phone,
      area_kerja,
      alamat,
      koordinat,
    })

    const data = {
      id: user.id_user,
      name: user.nama,
      email: user.email,
      roles,
      createdAt: user.createdAt,
    }

    const response = { success: true, message: 'User berhasil dibuat', data }
    if (temporaryPassword) response.temporaryPassword = temporaryPassword

    res.status(201).json(response)
  } catch (err) {
    next(err)
  }
}

async function getAllTeknisi(req, res, next) {
  try {
    const authUser = req.user

    const isAdmin = (authUser.roles && authUser.roles.includes('ADMIN')) || authUser.role === 'admin'
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' })
    }

    const teknisiUsers = await userService.getTeknisiUsers()

    const formattedData = teknisiUsers.map(user => ({
      id: user.id_user,
      name: user.nama,
      email: user.email,
      roles: user.roles.map(ur => ur.role.nama_role),
      phone: user.teknisi?.no_hp || null,
      area_kerja: user.teknisi?.area_kerja || null,
      alamat: user.teknisi?.alamat || null,
      koordinat: user.teknisi?.koordinat || null,
      createdAt: user.createdAt,
    }))

    res.status(200).json({
      success: true,
      message: 'Data teknisi berhasil diambil',
      data: formattedData,
    })
  } catch (err) {
    next(err)
  }
}

export { deleteUser, createUser, getAllTeknisi }
