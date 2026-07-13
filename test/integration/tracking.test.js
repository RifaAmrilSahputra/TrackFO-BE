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
  resetLoginLimiter,
  makeEmail,
  getUserByEmail
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

  it('should create teknisi, gangguan, assign, and record tracking while simulating 3m movements', async () => {
    const newTeknisiEmail = makeEmail('tekni')
    const newTeknisiPassword = 'Teknisi123!'

    const createTeknisiRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Teknisi Simulasi',
        email: newTeknisiEmail,
        password: newTeknisiPassword,
        roles: ['TEKNISI'],
        noHp: '081234567890',
        areaKerja: 'Sumatera Utara',
        alamat: 'Alamat Teknisi',
        latitude: 2.6562584618612455,
        longitude: 99.68299631864714
      })

    expect(createTeknisiRes.status).toBe(201)
    expect(createTeknisiRes.body.success).toBe(true)

    const newTeknisi = await getUserByEmail(newTeknisiEmail)
    expect(newTeknisi).not.toBeNull()
    const teknisiUserId = newTeknisi.id
    const teknisiData = newTeknisi.teknisi
    expect(teknisiData.latitude).toBeCloseTo(2.6562584618612455, 12)
    expect(teknisiData.longitude).toBeCloseTo(99.68299631864714, 12)

    const newTeknisiRecord = await prisma.dataTeknisi.findUnique({
      where: { userId: teknisiUserId }
    })
    expect(newTeknisiRecord).not.toBeNull()
    const newTeknisiId = newTeknisiRecord.id

    const newTeknisiToken = await getAuthToken(newTeknisiEmail, newTeknisiPassword)

    const createGangguanRes = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        judul: 'Gangguan Tracking Simulasi',
        deskripsi: 'Gangguan dibuat untuk simulasi tracking 3m',
        latitude: 2.6521302242652367,
        longitude: 99.64010854249948,
        alamat: 'Lokasi Gangguan',
        area: 'Sumatera Utara',
        priority: 'medium'
      })

    expect(createGangguanRes.status).toBe(201)
    expect(createGangguanRes.body.success).toBe(true)
    const gangguanId = createGangguanRes.body.data.id

    const assignRes = await request(app)
      .post(`/api/issues/${gangguanId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ teknisiIds: [teknisiUserId], method: 'manual' })

    expect(assignRes.status).toBe(200)
    expect(assignRes.body.success).toBe(true)
    expect(assignRes.body.data).toHaveLength(1)
    const assignmentId = assignRes.body.data[0].id

    const movementPoints = [
      { latitude: 2.6562611791596646, longitude: 99.68291583339702 },
      { latitude: 2.6562611998326084, longitude: 99.68286215546578 },
      { latitude: 2.6562370858889386, longitude: 99.68281391988343 },
      { latitude: 2.656223703197029, longitude: 99.68275489104828 }
    ]

    const trackResults = []
    for (const point of movementPoints) {
      const trackRes = await request(app)
        .post('/api/tracking')
        .set('Authorization', `Bearer ${newTeknisiToken}`)
        .send(point)

      expect(trackRes.status).toBe(200)
      expect(trackRes.body.success).toBe(true)
      trackResults.push(trackRes.body.data.tracked)
    }

    expect(trackResults.some(Boolean)).toBe(true)

    const historyRes = await request(app)
      .get(`/api/tracking/teknisi/${newTeknisiId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(historyRes.status).toBe(200)
    expect(historyRes.body.success).toBe(true)
    expect(historyRes.body.data[0].teknisiId).toBe(newTeknisi.teknisi.id)
    expect(historyRes.body.data[0].latitude).toBeCloseTo(2.656223703197029, 12)
    expect(historyRes.body.data[0].longitude).toBeCloseTo(99.68275489104828, 12)
  })
  it('should track teknisi movement in real time across a longer route', async () => {
    const newTeknisiEmail = makeEmail('tekni')
    const newTeknisiPassword = 'Teknisi123!'

    const createTeknisiRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Teknisi Real Time',
        email: newTeknisiEmail,
        password: newTeknisiPassword,
        roles: ['TEKNISI'],
        noHp: '081234567891',
        areaKerja: 'Sumatera Utara',
        alamat: 'Alamat Real Time',
        latitude: 2.6562584618612455,
        longitude: 99.68299631864714
      })

    expect(createTeknisiRes.status).toBe(201)
    expect(createTeknisiRes.body.success).toBe(true)

    const newTeknisi = await getUserByEmail(newTeknisiEmail)
    expect(newTeknisi).not.toBeNull()
    const teknisiUserId = newTeknisi.id

    const newTeknisiRecord = await prisma.dataTeknisi.findUnique({
      where: { userId: teknisiUserId }
    })
    expect(newTeknisiRecord).not.toBeNull()
    const newTeknisiId = newTeknisiRecord.id

    const newTeknisiToken = await getAuthToken(newTeknisiEmail, newTeknisiPassword)

    const createGangguanRes = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        judul: 'Gangguan RT Tracking',
        deskripsi: 'Gangguan untuk simulasi realtime tracking teknisi',
        latitude: 2.6521302242652367,
        longitude: 99.64010854249948,
        alamat: 'Lokasi Gangguan RT',
        area: 'Sumatera Utara',
        priority: 'medium'
      })

    expect(createGangguanRes.status).toBe(201)
    expect(createGangguanRes.body.success).toBe(true)
    const gangguanId = createGangguanRes.body.data.id

    const assignRes = await request(app)
      .post(`/api/issues/${gangguanId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ teknisiIds: [teknisiUserId], method: 'manual' })

    expect(assignRes.status).toBe(200)
    expect(assignRes.body.success).toBe(true)
    expect(assignRes.body.data).toHaveLength(1)

    const movementPoints = [
      { latitude: 2.6562611791596646, longitude: 99.68291583339702 },
      { latitude: 2.6562611998326084, longitude: 99.68286215546578 },
      { latitude: 2.6562370858889386, longitude: 99.68281391988343 },
      { latitude: 2.656223703197029, longitude: 99.68275489104828 },
      { latitude: 2.656229903670264, longitude: 99.68265517211745 },
      { latitude: 2.6562245411783567, longitude: 99.68257473339703 },
      { latitude: 2.6562244998325957, longitude: 99.68248350454299 },
      { latitude: 2.656203065215389, longitude: 99.68234134257627 },
      { latitude: 2.656197741178245, longitude: 99.68223401129033 },
      { latitude: 2.6561816238693767, longitude: 99.68213207570788 }
    ]

    const trackResults = []
    for (const point of movementPoints) {
      const trackRes = await request(app)
        .post('/api/tracking')
        .set('Authorization', `Bearer ${newTeknisiToken}`)
        .send(point)

      expect(trackRes.status).toBe(200)
      expect(trackRes.body.success).toBe(true)
      trackResults.push(trackRes.body.data.tracked)
    }

    expect(trackResults.every(Boolean)).toBe(true)

    const latestTrackingRes = await request(app)
      .get('/api/tracking')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(latestTrackingRes.status).toBe(200)
    expect(latestTrackingRes.body.success).toBe(true)
    const latestItem = latestTrackingRes.body.data.find(item => item.userId === teknisiUserId)
    expect(latestItem).toBeDefined()
    expect(latestItem.location.latitude).toBeCloseTo(2.6561816238693767, 10)
    expect(latestItem.location.longitude).toBeCloseTo(99.68213207570788, 10)

    const gangguanTrackingRes = await request(app)
      .get(`/api/tracking/gangguan/${gangguanId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(gangguanTrackingRes.status).toBe(200)
    expect(gangguanTrackingRes.body.success).toBe(true)
    expect(gangguanTrackingRes.body.data.teknisi).toHaveLength(1)
    expect(gangguanTrackingRes.body.data.teknisi[0].location.latitude).toBeCloseTo(2.6561816238693767, 10)
    expect(gangguanTrackingRes.body.data.teknisi[0].location.longitude).toBeCloseTo(99.68213207570788, 10)
  })
