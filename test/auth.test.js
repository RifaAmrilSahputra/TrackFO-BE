import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import app from '../src/app.js'
import { loginLimiter } from '../src/routes/auth.route.js'
import { TEST_ADMIN_EMAIL, TEST_TEKNISI_EMAIL, TEST_PASSWORD, TEST_ADMIN_NAME, TEST_TEKNISI_NAME } from './test-constants.js'

const prisma = new PrismaClient()

// Add unique suffix to avoid conflicts between test runs
const uniqueId = Date.now()
const ADMIN_EMAIL = `${TEST_ADMIN_EMAIL.split('@')[0]}_${uniqueId}@${TEST_ADMIN_EMAIL.split('@')[1]}`
const TEKNISI_EMAIL = `${TEST_TEKNISI_EMAIL.split('@')[0]}_${uniqueId}@${TEST_TEKNISI_EMAIL.split('@')[1]}`

// Helper to seed test data
async function seedTestData() {
  await prisma.$transaction(async (tx) => {
    // Clear in correct order with CASCADE to ensure complete cleanup
    await tx.dataTeknisi.deleteMany({ where: {} })
    await tx.userRole.deleteMany({ where: {} })
    await tx.user.deleteMany({ where: {} })
    await tx.role.deleteMany({ where: {} })

    // Create roles
    const adminRole = await tx.role.create({ data: { nama_role: 'ADMIN' } })
    const teknisiRole = await tx.role.create({ data: { nama_role: 'TEKNISI' } })

    // Create admin
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

    // Create teknisi
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
        areaKerja: 'Test Area'
      }
    })

    // Inactive user for test
    const inactiveUser = await tx.user.create({
      data: {
        nama: 'Inactive',
        email: 'inactive@test.com',
        password: hashedPw,
        isActive: false
      }
    })
  })
}

describe('Auth API', () => {
  beforeEach(async () => {
    // reset rate limit between tests to avoid test bleeding
    try {
      loginLimiter.resetKey('::ffff:127.0.0.1')
      loginLimiter.resetKey('127.0.0.1')
      loginLimiter.resetKey('::1')
    } catch (e) {
      // ignore if key not found
    }
    await seedTestData()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/auth/login', () => {
    it('should login admin successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.token).toBeDefined()
      expect(res.body.data.user.roles).toContain('ADMIN')
    })

    it('should login teknisi successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEKNISI_EMAIL, password: TEST_PASSWORD })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.roles).toContain('TEKNISI')
    })

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@test.com', password: 'wrong' })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('should reject inactive user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inactive@test.com', password: TEST_PASSWORD })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.message).toBe('Akun Anda telah dinonaktifkan. Silakan hubungi admin.')
    })

    it('should rate limit excessive logins', async () => {
      const promises = []
      for (let i = 0; i < 51; i++) { // max=50 test, 51th should 429
        promises.push(request(app).post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'wrong' }))
      }
      const responses = await Promise.all(promises)
      const last = responses[responses.length - 1]
      expect(last.status).toBe(429)
    }, 30000)
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully (stateless)', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD })

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginRes.body.data.token}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('PATCH /api/auth/change-password', () => {
    it('should change own password successfully', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD })
      const token = loginRes.body.data.token

      const res = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: TEST_PASSWORD, newPassword: 'newpass123' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should reject wrong old password', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD })
      const token = loginRes.body.data.token

      const res = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'wrong', newPassword: 'newpass123' })

      expect(res.status).toBe(401)
      expect(res.body.message).toContain('Password lama')
    })

    it('should reject same new/old password', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD })
      const token = loginRes.body.data.token

      const res = await request(app)
        .patch('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD })

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('sama dengan password lama')
    })
  })

  describe('PATCH /api/auth/users/:id/password (Admin reset teknisi)', () => {
    let adminToken
    let teknisiId

    beforeEach(async () => {
      await seedTestData() // Ensure fresh data before login + lookup
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD })
      adminToken = loginRes.body.data.token

      const teknisi = await prisma.user.findUnique({ where: { email: TEKNISI_EMAIL } })
      teknisiId = teknisi.id
    })

    it('admin should reset teknisi password successfully', async () => {
      const res = await request(app)
        .patch(`/api/auth/users/${teknisiId}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'resetpass123' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should reject non-teknisi target', async () => {
      const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } })
      const res = await request(app)
        .patch(`/api/auth/users/${admin.id}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'newpass' })

      expect(res.status).toBe(403)
      expect(res.body.message).toContain('bukan seorang teknisi')
    })
  })
})
