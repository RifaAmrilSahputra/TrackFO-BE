import { jest } from '@jest/globals'

const trackingServiceMock = {
  recordTracking: jest.fn(),
  getLatestTracking: jest.fn(),
  getTrackingByTeknisi: jest.fn()
}

await jest.unstable_mockModule('../../src/services/tracking.service.js', () => ({
  default: trackingServiceMock
}))

const {
  postTracking,
  getAllTracking,
  getTeknisiTracking
} = await import('../../src/controllers/tracking.controller.js')

function createMockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('tracking.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('postTracking', () => {
    // Menguji penyimpanan tracking teknisi dan response sukses saat lokasi berubah signifikan.
    it('should record tracking and return success response when tracked', async () => {
      const req = {
        user: { id: 12 },
        body: { latitude: -6.2, longitude: 106.8 }
      }
      const res = createMockRes()
      const next = jest.fn()
      const result = {
        teknisiId: 5,
        lastSeen: new Date('2026-04-05T10:00:00.000Z'),
        tracked: true
      }

      trackingServiceMock.recordTracking.mockResolvedValue(result)

      await postTracking(req, res, next)

      expect(trackingServiceMock.recordTracking).toHaveBeenCalledWith(12, -6.2, 106.8)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Tracking tersimpan',
        data: {
          teknisiId: 5,
          lastSeen: result.lastSeen,
          tracked: true
        }
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji response saat lokasi tidak berubah signifikan sehingga tidak membuat track baru.
    it('should return no significant movement message when not tracked', async () => {
      const req = {
        user: { id: 12 },
        body: { latitude: -6.2, longitude: 106.8 }
      }
      const res = createMockRes()
      const next = jest.fn()
      const result = {
        teknisiId: 5,
        lastSeen: new Date('2026-04-05T10:05:00.000Z'),
        tracked: false
      }

      trackingServiceMock.recordTracking.mockResolvedValue(result)

      await postTracking(req, res, next)

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Tidak ada perubahan lokasi signifikan',
        data: {
          teknisiId: 5,
          lastSeen: result.lastSeen,
          tracked: false
        }
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error dari service tracking diteruskan ke next().
    it('should forward tracking errors to next', async () => {
      const req = {
        user: { id: 12 },
        body: { latitude: -6.2, longitude: 106.8 }
      }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('tracking failed')

      trackingServiceMock.recordTracking.mockRejectedValue(error)

      await postTracking(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('getAllTracking', () => {
    // Menguji pengambilan seluruh posisi tracking teknisi terbaru.
    it('should return all latest tracking positions', async () => {
      const req = {}
      const res = createMockRes()
      const next = jest.fn()
      const positions = [{ teknisiId: 1 }, { teknisiId: 2 }]

      trackingServiceMock.getLatestTracking.mockResolvedValue(positions)

      await getAllTracking(req, res, next)

      expect(trackingServiceMock.getLatestTracking).toHaveBeenCalledTimes(1)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: positions
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error saat mengambil tracking global diteruskan ke next().
    it('should forward latest tracking errors to next', async () => {
      const req = {}
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('fetch latest failed')

      trackingServiceMock.getLatestTracking.mockRejectedValue(error)

      await getAllTracking(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('getTeknisiTracking', () => {
    // Menguji pengambilan histori tracking berdasarkan teknisiId dari params.
    it('should return tracking history by teknisi id', async () => {
      const req = { params: { teknisiId: '5' } }
      const res = createMockRes()
      const next = jest.fn()
      const points = [{ id: 1, teknisiId: 5 }]

      trackingServiceMock.getTrackingByTeknisi.mockResolvedValue(points)

      await getTeknisiTracking(req, res, next)

      expect(trackingServiceMock.getTrackingByTeknisi).toHaveBeenCalledWith('5')
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: points
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error saat mengambil histori tracking teknisi diteruskan ke next().
    it('should forward teknisi tracking errors to next', async () => {
      const req = { params: { teknisiId: '5' } }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('fetch history failed')

      trackingServiceMock.getTrackingByTeknisi.mockRejectedValue(error)

      await getTeknisiTracking(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })
})
