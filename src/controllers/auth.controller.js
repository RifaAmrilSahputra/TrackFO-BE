import authService from '../services/auth.service.js'
import userService from '../services/user.service.js'

// LOGIN
async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi',
      })
    }

    const result = await authService.login(email, password)
    console.log('LOGIN RESULT:', JSON.stringify(result, null, 2));
    res.json({
      success: true,
      message: 'Login berhasil',
      data: result,
    })
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    next(err)
  }
}

// LOGOUT (Hanya untuk memberi tahu client agar hapus token, karena JWT stateless)
async function logout(req, res, next) {
  try {
    res.json({
      success: true,
      message: 'Logout berhasil. Silakan hapus token dari penyimpanan lokal.',
    })
  } catch (err) {
    next(err)
  }
}

// CHANGE MY PASSWORD (Teknisi atau Admin untuk diri sendiri)
async function changeMyPassword(req, res, next) {
  try {
    console.log('changeMyPassword - req.user:', req.user)
    const { oldPassword, newPassword } = req.body
    const { id, roles } = req.user

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password baru minimal 6 karakter',
      })
    }

    if (!oldPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password lama wajib diisi untuk verifikasi keamanan',
      })
    }

    await authService.changeMyPassword(id, oldPassword, newPassword)

    res.json({
      success: true,
      message: 'Password Anda berhasil diperbarui',
    })
  } catch (err) {
    next(err)
  }
}

// CHANGE TEKNISI PASSWORD (Admin untuk teknisi lain)
async function changeTeknisiPassword(req, res, next) {
  try {
    console.log('changeTeknisiPassword - req.user:', req.user)
    const { id } = req.params
    const { newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password baru minimal 6 karakter',
      })
    }

    const targetUser = await userService.getUserById(id)
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan',
      })
    }

    if (!targetUser.roles || !targetUser.roles.includes('TEKNISI')) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: User target bukan seorang teknisi',
      })
    }

    await authService.changeUserPassword(id, newPassword)

    res.json({
      success: true,
      message: 'Password teknisi berhasil direset oleh Admin',
    })
  } catch (err) {
    next(err)
  }
}

export { login, logout, changeMyPassword, changeTeknisiPassword }
