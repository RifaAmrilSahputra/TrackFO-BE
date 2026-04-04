import prisma from '../../config/prisma.js'
import bcrypt from 'bcrypt'

// Helper: Format Response User
const formatUserResponse = (user) => {
  if (!user) return null
  return {
    id: user.id,
    nama: user.nama,
    email: user.email,
    isActive: user.isActive,
    roles: user.roles?.map(ur => ur.role.nama_role) || [],
    teknisi: user.teknisi ? {
      noHp: user.teknisi.noHp,
      areaKerja: user.teknisi.areaKerja,
      alamat: user.teknisi.alamat,
      latitude: user.teknisi.latitude,
      longitude: user.teknisi.longitude,
    } : null,
    createdAt: user.createdAt
  }
}

// CREATE USER + PROFILE TEKNISI (Transaction)
async function createUserWithProfile(data) {
  const { nama, email, password, roles, noHp, areaKerja, alamat, latitude, longitude } = data

  return await prisma.$transaction(async (tx) => {
    // 1. Cek Email (toLowerCase)
    const existing = await tx.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existing) throw { statusCode: 409, message: 'Email sudah terdaftar' }

    // 2. Ambil semua Role dalam 1 Query
    const roleRecords = await tx.role.findMany({
      where: { nama_role: { in: roles.map(r => r.toUpperCase()) } }
    })

    if (roleRecords.length === 0) throw { statusCode: 400, message: 'Role tidak valid' }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 12)

    // 4. Create User + Roles + Teknisi (Nested Write)
    const user = await tx.user.create({
      data: {
        nama,
        email: email.toLowerCase(),
        password: hashedPassword,
        roles: {
          create: roleRecords.map(role => ({
            role: { connect: { id: role.id } }
          }))
        },
        // Hanya buat data teknisi jika role TEKNISI dipilih
        ...(roles.includes('TEKNISI') && {
          teknisi: {
            create: {
              noHp: noHp ?? '',
              areaKerja: areaKerja ?? '',
              alamat,
              latitude: latitude ? parseFloat(latitude) : null,
              longitude: longitude ? parseFloat(longitude) : null,
            }
          }
        })
      },
      include: {
        roles: { include: { role: true } },
        teknisi: true
      }
    })

    return formatUserResponse(user)
  })
}

// UPDATE USER + PROFILE TEKNISI (Transaction)
async function updateFullUserProfile(id, data) {
  const userId = Number(id)

  return await prisma.$transaction(async (tx) => {
    // 1. Update Data Dasar User
    const userUpdateData = {}
    if (data.nama) userUpdateData.nama = data.nama
    if (data.email) userUpdateData.email = data.email.toLowerCase()

    if (Object.keys(userUpdateData).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: userUpdateData
      })
    }

    // 2. Update Data Teknisi (Upsert: Jika belum ada maka buat, jika ada maka update)
    if (data.noHp || data.areaKerja || data.alamat || data.latitude !== undefined) {
      await tx.dataTeknisi.upsert({
        where: { userId: userId },
        update: {
          noHp: data.noHp,
          areaKerja: data.areaKerja,
          alamat: data.alamat,
          latitude: data.latitude ? parseFloat(data.latitude) : undefined,
          longitude: data.longitude ? parseFloat(data.longitude) : undefined,
        },
        create: {
          userId: userId,
          noHp: data.noHp ?? '',
          areaKerja: data.areaKerja ?? '',
          alamat: data.alamat,
        }
      })
    }

    // 3. Ambil data terbaru
    const updatedUser = await tx.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } }, teknisi: true }
    })

    return formatUserResponse(updatedUser)
  })
}

// GET USERS BY ROLE (Admin Only)
async function getUsersByRole(roleName) {
  const users = await prisma.user.findMany({
    where: {
      roles: {
        some: { role: { nama_role: roleName.toUpperCase() } }
      },
      isActive: true // Hanya ambil yang aktif
    },
    include: {
      roles: { include: { role: true } },
      teknisi: true
    },
    orderBy: { createdAt: 'desc' }
  })
  return users.map(formatUserResponse)
}

// SOFT DELETE USER (Admin Only)
async function deleteUser(id) {
  return await prisma.user.update({
    where: { id: Number(id) },
    data: { isActive: false }
  })
}

// UPDATE PASSWORD
async function updatePassword(id, hashedPassword) {
  return await prisma.user.update({
    where: { id: Number(id) },
    data: { password: hashedPassword }
  })
}

// GET USER BY ID
async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: {
      roles: { include: { role: true } },
      teknisi: true
    }
  })
  return formatUserResponse(user)
}

export default {
  createUserWithProfile,
  updateFullUserProfile,
  getUsersByRole,
  deleteUser,
  updatePassword,
  getUserById,
  getUserByEmail: (email) => prisma.user.findUnique({ where: { email: email.toLowerCase() } })
}