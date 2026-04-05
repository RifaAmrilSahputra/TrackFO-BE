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

describe('E2E Full Workflow', () => {
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

  it('should complete the main issue handling flow from creation until report verification', async () => {
    const createIssueRes = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        judul: 'Gardu padam total',
        deskripsi: 'Perlu penanganan penuh dari teknisi',
        latitude: -6.201,
        longitude: 106.816,
        alamat: 'Jl. Merdeka No. 1',
        priority: 'high'
      })

    expect(createIssueRes.status).toBe(201)
    expect(createIssueRes.body.success).toBe(true)
    const issueId = createIssueRes.body.data.id

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
    const assignmentId = assignRes.body.data[0].id

    const myTasksRes = await request(app)
      .get('/api/issues/my/tasks')
      .set('Authorization', `Bearer ${teknisiToken}`)

    expect(myTasksRes.status).toBe(200)
    expect(myTasksRes.body.success).toBe(true)
    expect(myTasksRes.body.data.some(task => task.gangguan.id === issueId)).toBe(true)

    const trackingRes = await request(app)
      .post('/api/tracking')
      .set('Authorization', `Bearer ${teknisiToken}`)
      .send({
        latitude: -6.202,
        longitude: 106.817
      })

    expect(trackingRes.status).toBe(200)
    expect(trackingRes.body.success).toBe(true)
    expect(trackingRes.body.data.tracked).toBe(true)

    const onTheWayRes = await request(app)
      .patch(`/api/issues/assignment/${assignmentId}/status`)
      .set('Authorization', `Bearer ${teknisiToken}`)
      .send({ status: 'on_the_way' })

    expect(onTheWayRes.status).toBe(200)
    expect(onTheWayRes.body.data.status).toBe('on_the_way')

    const workingRes = await request(app)
      .patch(`/api/issues/assignment/${assignmentId}/status`)
      .set('Authorization', `Bearer ${teknisiToken}`)
      .send({ status: 'working' })

    expect(workingRes.status).toBe(200)
    expect(workingRes.body.data.status).toBe('working')

    const createReportRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${teknisiToken}`)
      .send({
        gangguanId: issueId,
        catatan: 'Perbaikan selesai, listrik sudah normal',
        foto: 'foto-hasil.jpg'
      })

    expect(createReportRes.status).toBe(201)
    expect(createReportRes.body.success).toBe(true)
    expect(createReportRes.body.data.gangguanId).toBe(issueId)
    const reportId = createReportRes.body.data.id

    const reportDetailRes = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(reportDetailRes.status).toBe(200)
    expect(reportDetailRes.body.success).toBe(true)
    expect(reportDetailRes.body.data.id).toBe(reportId)
    expect(reportDetailRes.body.data.gangguanId).toBe(issueId)

    const issueDetailRes = await request(app)
      .get(`/api/issues/${issueId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(issueDetailRes.status).toBe(200)
    expect(issueDetailRes.body.success).toBe(true)
    expect(issueDetailRes.body.data.status).toBe('done')

    const latestTrackingRes = await request(app)
      .get('/api/tracking')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(latestTrackingRes.status).toBe(200)
    expect(latestTrackingRes.body.success).toBe(true)
    expect(latestTrackingRes.body.data.some(item => item.userId === teknisi.userId)).toBe(true)

    const myReportsRes = await request(app)
      .get('/api/reports/my')
      .set('Authorization', `Bearer ${teknisiToken}`)

    expect(myReportsRes.status).toBe(200)
    expect(myReportsRes.body.success).toBe(true)
    expect(myReportsRes.body.data.some(report => report.id === reportId)).toBe(true)

    const issueFromDb = await prisma.gangguan.findUnique({ where: { id: issueId } })
    const assignmentsFromDb = await prisma.assignment.findMany({ where: { gangguanId: issueId } })
    const teknisiFromDb = await prisma.dataTeknisi.findUnique({ where: { id: teknisi.id } })

    expect(issueFromDb.status).toBe('done')
    expect(assignmentsFromDb.every(item => item.status === 'done')).toBe(true)
    expect(teknisiFromDb.status).toBe('available')
  })
})
