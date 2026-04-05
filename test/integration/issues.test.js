import request from 'supertest'

import app from '../../src/app.js'
import { loginLimiter } from '../../src/routes/auth.route.js'
import { TEST_PASSWORD } from '../helpers/test-constants.js'
import {
  prisma,
  ADMIN_EMAIL,
  TEKNISI_EMAIL,
  seedBaseUsers,
  getAuthToken,
  getTeknisiByUserEmail,
  resetLoginLimiter
} from '../helpers/test-helpers.js'

describe('Issues API', () => {
  let adminToken
  let teknisiToken
  let teknisi

  beforeEach(async () => {
    await resetLoginLimiter(loginLimiter)
    await seedBaseUsers()
    adminToken = await getAuthToken(ADMIN_EMAIL, TEST_PASSWORD)
    teknisiToken = await getAuthToken(TEKNISI_EMAIL, TEST_PASSWORD)
    teknisi = await getTeknisiByUserEmail(TEKNISI_EMAIL)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  async function createIssue() {
    const payload = {
      judul: 'Kabel putus',
      deskripsi: 'Perlu penanganan lapangan',
      latitude: -6.2,
      longitude: 106.8,
      alamat: 'Jl. Sudirman',
      priority: 'high'
    }

    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)

    return res
  }

  describe('POST /api/issues', () => {
    it('should create issue successfully with admin token', async () => {
      const res = await createIssue()

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.judul).toBe('Kabel putus')
      expect(res.body.data.status).toBe('open')
    })
  })

  describe('GET /api/issues and GET /api/issues/:id', () => {
    it('should return issue list and issue detail for admin', async () => {
      const createRes = await createIssue()
      const issueId = createRes.body.data.id

      const listRes = await request(app)
        .get('/api/issues')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(listRes.status).toBe(200)
      expect(listRes.body.success).toBe(true)
      expect(listRes.body.data.some(issue => issue.id === issueId)).toBe(true)

      const detailRes = await request(app)
        .get(`/api/issues/${issueId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(detailRes.status).toBe(200)
      expect(detailRes.body.success).toBe(true)
      expect(detailRes.body.data.id).toBe(issueId)
      expect(detailRes.body.data.judul).toBe('Kabel putus')
    })
  })

  describe('PATCH /api/issues/:id', () => {
    it('should update issue successfully', async () => {
      const createRes = await createIssue()
      const issueId = createRes.body.data.id

      const res = await request(app)
        .patch(`/api/issues/${issueId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'assigned', alamat: 'Alamat Baru' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('assigned')
      expect(res.body.data.alamat).toBe('Alamat Baru')
    })
  })

  describe('Assignment flow under /api/issues', () => {
    it('should assign teknisi, show assignments, and expose task to teknisi', async () => {
      const createRes = await createIssue()
      const issueId = createRes.body.data.id

      const assignRes = await request(app)
        .post(`/api/issues/${issueId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teknisiIds: [teknisi.userId],
          method: 'manual'
        })

      expect(assignRes.status).toBe(200)
      expect(assignRes.body.success).toBe(true)
      expect(assignRes.body.data).toHaveLength(1)
      expect(assignRes.body.data[0].status).toBe('assigned')
      expect(assignRes.body.data[0].isLeader).toBe(true)

      const assignmentsRes = await request(app)
        .get(`/api/issues/${issueId}/assignments`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(assignmentsRes.status).toBe(200)
      expect(assignmentsRes.body.data).toHaveLength(1)

      const myTasksRes = await request(app)
        .get('/api/issues/my/tasks')
        .set('Authorization', `Bearer ${teknisiToken}`)

      expect(myTasksRes.status).toBe(200)
      expect(myTasksRes.body.success).toBe(true)
      expect(myTasksRes.body.data).toHaveLength(1)
      expect(myTasksRes.body.data[0].gangguan.id).toBe(issueId)
    })

    it('should let teknisi update assignment status following the flow', async () => {
      const createRes = await createIssue()
      const issueId = createRes.body.data.id

      const assignRes = await request(app)
        .post(`/api/issues/${issueId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teknisiIds: [teknisi.userId],
          method: 'manual'
        })

      const assignmentId = assignRes.body.data[0].id

      const res = await request(app)
        .patch(`/api/issues/assignment/${assignmentId}/status`)
        .set('Authorization', `Bearer ${teknisiToken}`)
        .send({ status: 'on_the_way' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.status).toBe('on_the_way')
    })
  })
})
