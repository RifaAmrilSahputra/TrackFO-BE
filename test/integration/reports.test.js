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

describe('Reports API', () => {
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

  async function createAssignedIssue() {
    const createRes = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        judul: 'Trafo panas',
        deskripsi: 'Perlu laporan setelah perbaikan',
        latitude: -6.2,
        longitude: 106.8,
        alamat: 'Jl. Gatot Subroto'
      })

    const issueId = createRes.body.data.id

    await request(app)
      .post(`/api/issues/${issueId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        teknisiIds: [teknisi.userId],
        method: 'manual'
      })

    return issueId
  }

  it('should let leader teknisi create report and close the issue', async () => {
    const issueId = await createAssignedIssue()

    const res = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${teknisiToken}`)
      .send({
        gangguanId: issueId,
        catatan: 'Perbaikan selesai total',
        foto: 'bukti-perbaikan.jpg'
      })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.gangguanId).toBe(issueId)

    const issue = await prisma.gangguan.findUnique({ where: { id: issueId } })
    const assignments = await prisma.assignment.findMany({ where: { gangguanId: issueId } })
    const refreshedTeknisi = await prisma.dataTeknisi.findUnique({ where: { id: teknisi.id } })

    expect(issue.status).toBe('done')
    expect(assignments.every(item => item.status === 'done')).toBe(true)
    expect(refreshedTeknisi.status).toBe('available')
  })

  it('should expose reports to admin and teknisi after report creation', async () => {
    const issueId = await createAssignedIssue()

    const createReportRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${teknisiToken}`)
      .send({
        gangguanId: issueId,
        catatan: 'Laporan akhir pekerjaan'
      })

    const reportId = createReportRes.body.data.id

    const myRes = await request(app)
      .get('/api/reports/my')
      .set('Authorization', `Bearer ${teknisiToken}`)

    expect(myRes.status).toBe(200)
    expect(myRes.body.success).toBe(true)
    expect(myRes.body.data.some(item => item.id === reportId)).toBe(true)

    const allRes = await request(app)
      .get('/api/reports')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(allRes.status).toBe(200)
    expect(allRes.body.success).toBe(true)
    expect(allRes.body.data.some(item => item.id === reportId)).toBe(true)

    const detailRes = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(detailRes.status).toBe(200)
    expect(detailRes.body.success).toBe(true)
    expect(detailRes.body.data.id).toBe(reportId)
  })
})
