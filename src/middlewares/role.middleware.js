const authorizeRole = (rolesAllowed = []) => {
  return (req, res, next) => {
    // 1. Pastikan user sudah melewati authGuard
    if (!req.user || !req.user.roles) {
      return res.status(401).json({
        success: false,
        message: 'Sesi tidak valid atau user tidak ditemukan',
      });
    }

    // 2. Normalisasi input ke Lowercase untuk konsistensi
const allowed = rolesAllowed.map(r => r.toUpperCase());
    const userRoles = req.user.roles.map(r => r.toUpperCase());

    // 3. Cek apakah ada role user yang cocok dengan role yang diizinkan
    const hasAccess = userRoles.some(role => allowed.includes(role));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak: Anda tidak memiliki izin untuk halaman ini',
      });
    }

    next();
  };
};

export default authorizeRole;