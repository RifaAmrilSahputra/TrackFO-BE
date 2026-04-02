import request from 'supertest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import app from '../src/app.js'
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
        areaKerja: 'Test Area',
        alamat: 'Test Address'
      }
    })
  })
}

// Helper to get auth token
async function getAuthToken(email = ADMIN_EMAIL, password = TEST_PASSWORD) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password })

  if (res.status !== 200 || !res.body.success) {
    throw new Error(`Login failed: ${res.status} - ${JSON.stringify(res.body)}`)
  }

  return res.body.data.token
}

describe('User API', () => {
  let adminToken, teknisiToken

  beforeEach(async () => {
    await seedTestData()
    console.log('✅ User test data seeded')
    adminToken = await getAuthToken(ADMIN_EMAIL, TEST_PASSWORD)
    teknisiToken = await getAuthToken(TEKNISI_EMAIL, TEST_PASSWORD)
    console.log('✅ Tokens obtained')
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/users', () => {
    it('should create user successfully with admin token', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@test.com',
        password: 'newpass123',
        roles: ['TEKNISI'],
        noHp: '081234567891',
        areaKerja: 'New Area',
        alamat: 'New Address'
      }

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.nama).toBe('New User')
      expect(res.body.data.email).toBe('newuser@test.com')
      expect(res.body.data.roles).toContain('TEKNISI')
    })

    it('should generate temporary password if not provided', async () => {
      const newUser = {
        name: 'User No Pass',
        email: 'nopass@test.com',
        roles: ['TEKNISI']
      }

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)

      expect(res.status).toBe(201)
      expect(res.body.temporaryPassword).toBeDefined()
    })

    it('should reject invalid email format', async () => {
      const newUser = {
        name: 'Invalid Email',
        email: 'invalid-email',
        roles: ['TEKNISI']
      }

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('Format email tidak valid')
    })

    it('should reject duplicate email', async () => {
      const newUser = {
        name: 'Duplicate Email',
        email: ADMIN_EMAIL,
        roles: ['TEKNISI']
      }

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser)

      expect(res.status).toBe(409)
      expect(res.body.message).toContain('Email sudah terdaftar')
    })

    it('should reject without admin token', async () => {
      const newUser = {
        name: 'Unauthorized',
        email: 'unauth@test.com',
        roles: ['TEKNISI']
      }

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${teknisiToken}`)
        .send(newUser)

      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/users/teknisi', () => {
    it('should get all teknisi with admin token', async () => {
      const res = await request(app)
        .get('/api/users/teknisi')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
      expect(res.body.data[0].roles).toContain('TEKNISI')
    })

    it('should reject without admin token', async () => {
      const res = await request(app)
        .get('/api/users/teknisi')
        .set('Authorization', `Bearer ${teknisiToken}`)

      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/users/me', () => {
    it('should get own profile with teknisi token', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${teknisiToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.email).toBe(TEKNISI_EMAIL)
      expect(res.body.data.roles).toContain('TEKNISI')
    })

    it('should reject without authentication', async () => {
      const res = await request(app)
        .get('/api/users/me')

      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/users/:id', () => {
    it('should update teknisi data with admin token', async () => {
      // Get teknisi user ID
      const teknisiUser = await prisma.user.findUnique({
        where: { email: TEKNISI_EMAIL }
      })

      const updateData = {
        noHp: '081234567891',
        areaKerja: 'Updated Area',
        alamat: 'Updated Address'
      }

      const res = await request(app)
        .patch(`/api/users/${teknisiUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.teknisi.noHp).toBe('081234567891')
      expect(res.body.data.teknisi.areaKerja).toBe('Updated Area')
    })

    it('should allow teknisi to update own data (limited)', async () => {
      // Get teknisi user ID
      const teknisiUser = await prisma.user.findUnique({
        where: { email: TEKNISI_EMAIL }
      })

      const updateData = {
        noHp: '081234567892',
        areaKerja: 'Self Updated Area'
      }

      const res = await request(app)
        .patch(`/api/users/${teknisiUser.id}`)
        .set('Authorization', `Bearer ${teknisiToken}`)
        .send(updateData)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should prevent teknisi from updating restricted fields', async () => {
      // Get teknisi user ID
      const teknisiUser = await prisma.user.findUnique({
        where: { email: TEKNISI_EMAIL }
      })

      const updateData = {
        nama: 'Hacked Name',
        email: 'hacked@test.com',
        roles: ['ADMIN'],
        noHp: '081234567893'
      }

      const res = await request(app)
        .patch(`/api/users/${teknisiUser.id}`)
        .set('Authorization', `Bearer ${teknisiToken}`)
        .send(updateData)

      expect(res.status).toBe(200)
      // Should not update restricted fields
      expect(res.body.data.nama).not.toBe('Hacked Name')
      expect(res.body.data.email).not.toBe('hacked@test.com')
      expect(res.body.data.roles).not.toContain('ADMIN')
    })

    it('should reject unauthorized access', async () => {
      // Get admin user ID
      const adminUser = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL }
      })

      const res = await request(app)
        .patch(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${teknisiToken}`)
        .send({ noHp: '081234567894' })

      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /api/users/:id', () => {
    it('should soft delete user with admin token', async () => {
      // Get teknisi user ID
      const teknisiUser = await prisma.user.findUnique({
        where: { email: TEKNISI_EMAIL }
      })

      const res = await request(app)
        .delete(`/api/users/${teknisiUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify user is soft deleted
      const deletedUser = await prisma.user.findUnique({
        where: { id: teknisiUser.id }
      })
      expect(deletedUser.isActive).toBe(false)
    })

    it('should prevent self deletion', async () => {
      // Get admin user ID
      const adminUser = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL }
      })

      const res = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(400)
      expect(res.body.message).toContain('tidak bisa menghapus akun sendiri')
    })

    it('should reject without admin token', async () => {
      // Get admin user ID
      const adminUser = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL }
      })

      const res = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${teknisiToken}`)

      expect(res.status).toBe(403)
    })
  })
})