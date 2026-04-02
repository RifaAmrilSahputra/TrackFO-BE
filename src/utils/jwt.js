import jwt from 'jsonwebtoken';

/**
 * Membuat Access Token (Umur pendek, misal: 1 jam)
 */
export const signToken = (payload) => {
  // Hanya simpan data minimal
  const tokenPayload = {
    id: payload.id,
    email: payload.email,
  };

  return jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h', // Gunakan 1 jam untuk keamanan
    issuer: 'laporketua-api', // Labeli token ini milik sistemmu
  });
};

/**
 * Membuat Refresh Token (Umur panjang, misal: 7-30 hari)
 */
export const signRefreshToken = (payload) => {
  return jwt.sign(
    { id: payload.id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { 
      expiresIn: '7d',
      issuer: 'laporketua-api'
    }
  );
};

/**
 * Verifikasi Token
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'laporketua-api',
    });
  } catch (error) {
    // Melempar error agar ditangkap oleh catch block di middleware
    throw error;
  }
};