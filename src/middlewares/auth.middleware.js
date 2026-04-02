import { verifyToken } from '../utils/jwt.js';
import prisma from '../../config/prisma.js';

/**
 * AUTH GUARD: Memastikan user memiliki token yang valid
 * dan datanya masih aktif di database.
 */
const authGuard = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Validasi format Bearer Token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Akses ditolak, silakan login terlebih dahulu',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verifikasi Token (Melempar error jika expired/invalid)
    const decoded = verifyToken(token);

    // 3. Database Sync: Pastikan data user & role paling update
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    // 4. Cek keberadaan user
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Sesi tidak valid, user tidak ditemukan',
      });
    }

    // 5. Cek status aktif (Soft Delete/Suspended check)
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan',
      });
    }

    // 6. Pasang data user yang sudah di-format ke object request (req.user)
    // Kita simpan roles sebagai array string murni: ['ADMIN', 'TEKNISI']
    req.user = {
      id: user.id,
      nama: user.nama,
      email: user.email,
      roles: user.roles.map((ur) => ur.role.nama_role.toUpperCase()), // Force uppercase
    };

    next();
  } catch (err) {
    // 7. Error Handling spesifik untuk JWT
    let statusCode = 401;
    let message = 'Sesi tidak valid';

    if (err.name === 'TokenExpiredError') {
      message = 'Sesi Anda telah berakhir, silakan login ulang';
    } else if (err.name === 'JsonWebTokenError') {
      message = 'Token tidak valid atau rusak';
    }

    return res.status(statusCode).json({
      success: false,
      message: message,
    });
  }
};

/**
 * AUTHORIZE ROLE: Middleware untuk membatasi akses berdasarkan role.
 * Digunakan SETELAH authGuard.
 */
export const authorizeRole = (rolesAllowed = []) => {
  return (req, res, next) => {
    // Pastikan authGuard sudah dijalankan sebelumnya
    if (!req.user || !req.user.roles) {
      return res.status(401).json({
        success: false,
        message: 'Otorisasi gagal, data user tidak ditemukan',
      });
    }

    const allowed = rolesAllowed.map((r) => r.toUpperCase());
    const hasAccess = req.user.roles.some((role) => allowed.includes(role));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Akses ditolak, fitur ini khusus untuk: ${allowed.join(', ')}`,
      });
    }

    next();
  };
};

/**
 * GRANT ACCESS HELPER: Menggabungkan Guard & Role dalam satu baris.
 * Contoh penggunaan: router.get('/admin', grantAccess(['ADMIN']), controller)
 */
export const grantAccess = (roles = []) => {
  return [authGuard, authorizeRole(roles)];
};

export default authGuard;