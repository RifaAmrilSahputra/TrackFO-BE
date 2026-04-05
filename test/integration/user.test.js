import request from 'supertest'
import app from '../../src/app.js'
import { loginLimiter } from '../../src/routes/auth.route.js'
import { TEST_PASSWORD } from '../helpers/test-constants.js'
import {
  prisma,
  ADMIN_EMAIL,
  TEKNISI_EMAIL,
  makeEmail,
  seedBaseUsers,
  getAuthToken,
  resetLoginLimiter
} from '../helpers/test-helpers.js'

describe('User API', () => {
  let adminToken, teknisiToken

  beforeEach(async () => {
    await resetLoginLimiter(loginLimiter)
    await seedBaseUsers()
    adminToken = await getAuthToken(ADMIN_EMAIL, TEST_PASSWORD)
    teknisiToken = await getAuthToken(TEKNISI_EMAIL, TEST_PASSWORD)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('POST /api/users', () => {
    it('should create user successfully with admin token', async () => {
      const newUser = {
        name: 'New User',
        email: makeEmail('newuser'),
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
      expect(res.body.data.email).toBe(newUser.email)
      expect(res.body.data.roles).toContain('TEKNISI')
    })

    it('should generate temporary password if not provided', async () => {
      const newUser = {
        name: 'User No Pass',
        email: makeEmail('nopass'),
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
        email: makeEmail('unauth'),
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

  describe('PATCH /api/users/me', () => {
    it('should update own profile with teknisi token', async () => {
      const updateData = {
        noHp: '081234567890',
        areaKerja: 'Updated Area',
        alamat: 'Updated Address'
      }

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${teknisiToken}`)
        .send(updateData)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toBe('Profil berhasil diperbarui')
      expect(res.body.data.teknisi.noHp).toBe('081234567890')
      expect(res.body.data.teknisi.areaKerja).toBe('Updated Area')
    })

    it('should prevent teknisi from updating restricted fields', async () => {
      const updateData = {
        nama: 'Hacked Name',
        email: 'hacked@test.com',
        roles: ['ADMIN'],
        noHp: '081234567891'
      }

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${teknisiToken}`)
        .send(updateData)

      expect(res.status).toBe(200)
      // Should not update restricted fields
      expect(res.body.data.nama).not.toBe('Hacked Name')
      expect(res.body.data.email).not.toBe('hacked@test.com')
      expect(res.body.data.roles).not.toContain('ADMIN')
      // But should update allowed field
      expect(res.body.data.teknisi.noHp).toBe('081234567891')
    })

    it('should reject without authentication', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .send({ noHp: '081234567892' })

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
      expect(res.body.data.teknisi.noHp).toBe('081234567892')
      expect(res.body.data.teknisi.areaKerja).toBe('Self Updated Area')
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
