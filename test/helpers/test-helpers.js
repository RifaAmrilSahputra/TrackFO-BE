import request from 'supertest'
import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'

import app from '../../src/app.js'
import {
  TEST_ADMIN_EMAIL,
  TEST_TEKNISI_EMAIL,
  TEST_PASSWORD,
  TEST_ADMIN_NAME,
  TEST_TEKNISI_NAME
} from './test-constants.js'

export const prisma = new PrismaClient()
export const suiteUniqueId = Date.now()

export const ADMIN_EMAIL = `${TEST_ADMIN_EMAIL.split('@')[0]}_${suiteUniqueId}@${TEST_ADMIN_EMAIL.split('@')[1]}`
export const TEKNISI_EMAIL = `${TEST_TEKNISI_EMAIL.split('@')[0]}_${suiteUniqueId}@${TEST_TEKNISI_EMAIL.split('@')[1]}`
export const INACTIVE_EMAIL = `inactive_${suiteUniqueId}@test.com`

let emailCounter = 0

export function makeEmail(prefix) {
  emailCounter += 1
  return `${prefix}_${suiteUniqueId}_${emailCounter}@test.com`
}

async function ensureRole(tx, nama_role) {
  return tx.role.upsert({
    where: { nama_role },
    update: {},
    create: { nama_role }
  })
}

export async function resetLoginLimiter(loginLimiter) {
  try {
    loginLimiter.resetKey('::ffff:127.0.0.1')
    loginLimiter.resetKey('127.0.0.1')
    loginLimiter.resetKey('::1')
  } catch (e) {
    // ignore if key not found
  }
}

export async function seedBaseUsers({ includeInactive = false } = {}) {
  await prisma.$transaction(async (tx) => {
    await tx.user.deleteMany({
      where: {
        OR: [
          { email: { in: [ADMIN_EMAIL, TEKNISI_EMAIL, INACTIVE_EMAIL] } },
          { email: { contains: `_${suiteUniqueId}_` } }
        ]
      }
    })

    const adminRole = await ensureRole(tx, 'ADMIN')
    const teknisiRole = await ensureRole(tx, 'TEKNISI')
    const hashedPw = await bcrypt.hash(TEST_PASSWORD, 12)

    const admin = await tx.user.create({
      data: {
        nama: TEST_ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPw,
        isActive: true
      }
    })
    await tx.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } })

    const teknisiUser = await tx.user.create({
      data: {
        nama: TEST_TEKNISI_NAME,
        email: TEKNISI_EMAIL,
        password: hashedPw,
        isActive: true
      }
    })
    await tx.userRole.create({ data: { userId: teknisiUser.id, roleId: teknisiRole.id } })
    await tx.dataTeknisi.create({
      data: {
        userId: teknisiUser.id,
        noHp: '081234567890',
        areaKerja: 'Test Area',
        alamat: 'Test Address'
      }
    })

    if (includeInactive) {
      await tx.user.create({
        data: {
          nama: 'Inactive',
          email: INACTIVE_EMAIL,
          password: hashedPw,
          isActive: false
        }
      })
    }
  })
}

export async function getAuthToken(email = ADMIN_EMAIL, password = TEST_PASSWORD) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password })

  if (res.status !== 200 || !res.body.success) {
    throw new Error(`Login failed: ${res.status} - ${JSON.stringify(res.body)}`)
  }

  return res.body.data.token
}

export async function getUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      roles: { include: { role: true } },
      teknisi: true
    }
  })
}

export async function getTeknisiByUserEmail(email = TEKNISI_EMAIL) {
  const user = await getUserByEmail(email)
  return user?.teknisi || null
}
