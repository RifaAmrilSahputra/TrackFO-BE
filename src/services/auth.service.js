import { PrismaClient } from '@prisma/client'
import { compare } from 'bcrypt'
import { signToken } from '../utils/jwt'

const prisma = new PrismaClient()

async function login(email, password) {
  // 1. Cari user berdasarkan email
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: { role: true },
      },
    },
  })

  // 2. Jika user tidak ditemukan
  if (!user) {
    const err = new Error('Email atau password salah')
    err.statusCode = 401
    throw err
  }

  // 3. Cek password
  const isMatch = await compare(password, user.password)
  if (!isMatch) {
    const err = new Error('Email atau password salah')
    err.statusCode = 401
    throw err
  }

  // 4. Ambil role & konsistenkan (UPPERCASE)
  const roles = user.roles.map(r => r.role.nama_role.toUpperCase())

  // 5. Generate JWT
  const token = signToken({
    id: user.id_user,
    email: user.email,
    roles,
  })

  // 6. Return response (tanpa password)
  return {
    token,
    user: {
      id: user.id_user,
      name: user.nama,
      email: user.email,
      roles,
    },
  }
}

export default { login }
