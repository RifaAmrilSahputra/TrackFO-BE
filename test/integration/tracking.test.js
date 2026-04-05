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

describe('Tracking API', () => {
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

  it('should record tracking and expose latest/admin history endpoints', async () => {
    const postRes = await request(app)
      .post('/api/tracking')
      .set('Authorization', `Bearer ${teknisiToken}`)
      .send({ latitude: -6.21, longitude: 106.81 })

    expect(postRes.status).toBe(200)
    expect(postRes.body.success).toBe(true)
    expect(postRes.body.data.tracked).toBe(true)

    const allRes = await request(app)
      .get('/api/tracking')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(allRes.status).toBe(200)
    expect(allRes.body.success).toBe(true)
    expect(allRes.body.data.some(item => item.userId === teknisi.userId)).toBe(true)

    const historyRes = await request(app)
      .get(`/api/tracking/teknisi/${teknisi.id}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(historyRes.status).toBe(200)
    expect(historyRes.body.success).toBe(true)
    expect(historyRes.body.data.length).toBeGreaterThan(0)
    expect(historyRes.body.data[0].teknisiId).toBe(teknisi.id)
  })
})
