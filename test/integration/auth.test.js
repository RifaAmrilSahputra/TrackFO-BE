import request from 'supertest'
import app from '../../src/app.js'
import { loginLimiter } from '../../src/routes/auth.route.js'
import { TEST_PASSWORD } from '../helpers/test-constants.js'
import {
  prisma,
  ADMIN_EMAIL,
  TEKNISI_EMAIL,
  INACTIVE_EMAIL,
  seedBaseUsers,
  resetLoginLimiter
} from '../helpers/test-helpers.js'

describe('Auth API', () => {
  beforeEach(async () => {
    await resetLoginLimiter(loginLimiter)
    await seedBaseUsers({ includeInactive: true })
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
        .send({ email: INACTIVE_EMAIL, password: TEST_PASSWORD })

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
      const limitedResponses = responses.filter(r => r.status === 429)
      expect(limitedResponses.length).toBeGreaterThan(0)
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

      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: TEST_PASSWORD })
      expect(oldLoginRes.status).toBe(401)

      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: ADMIN_EMAIL, password: 'newpass123' })
      expect(newLoginRes.status).toBe(200)
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
      await resetLoginLimiter(loginLimiter)
      await seedBaseUsers({ includeInactive: true }) // Ensure fresh data before login + lookup
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

      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: TEKNISI_EMAIL, password: TEST_PASSWORD })
      expect(oldLoginRes.status).toBe(401)

      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: TEKNISI_EMAIL, password: 'resetpass123' })
      expect(newLoginRes.status).toBe(200)
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
