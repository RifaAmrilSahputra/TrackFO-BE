import { jest } from '@jest/globals'

const laporanServiceMock = {
  createLaporan: jest.fn(),
  getAllLaporan: jest.fn(),
  getLaporanById: jest.fn(),
  getMyLaporan: jest.fn()
}

await jest.unstable_mockModule('../../src/services/laporan.service.js', () => ({
  default: laporanServiceMock
}))

const {
  createLaporan,
  getAllLaporan,
  getLaporanById,
  getMyLaporan
} = await import('../../src/controllers/laporan.controller.js')

function createMockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('laporan.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createLaporan', () => {
    // Menguji pembuatan laporan dan response 201 saat service berhasil.
    it('should create laporan and return 201 response', async () => {
      const req = {
        user: { id: 12 },
        body: {
          gangguanId: 7,
          catatan: 'Perbaikan selesai',
          foto: 'bukti.jpg'
        }
      }
      const res = createMockRes()
      const next = jest.fn()
      const laporan = { id: 1, gangguanId: 7 }

      laporanServiceMock.createLaporan.mockResolvedValue(laporan)

      await createLaporan(req, res, next)

      expect(laporanServiceMock.createLaporan).toHaveBeenCalledWith(12, req.body)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Laporan berhasil dibuat dan gangguan ditutup',
        data: laporan
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error pembuatan laporan diteruskan ke next().
    it('should forward create laporan errors to next', async () => {
      const req = {
        user: { id: 12 },
        body: { gangguanId: 7, catatan: 'Perbaikan selesai' }
      }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('create laporan failed')

      laporanServiceMock.createLaporan.mockRejectedValue(error)

      await createLaporan(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  describe('getAllLaporan', () => {
    // Menguji pengambilan seluruh data laporan untuk admin.
    it('should return all laporan', async () => {
      const req = {}
      const res = createMockRes()
      const next = jest.fn()
      const laporanList = [{ id: 1 }, { id: 2 }]

      laporanServiceMock.getAllLaporan.mockResolvedValue(laporanList)

      await getAllLaporan(req, res, next)

      expect(laporanServiceMock.getAllLaporan).toHaveBeenCalledTimes(1)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: laporanList
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error saat fetch seluruh laporan diteruskan ke next().
    it('should forward get all laporan errors to next', async () => {
      const req = {}
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('fetch laporan failed')

      laporanServiceMock.getAllLaporan.mockRejectedValue(error)

      await getAllLaporan(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('getLaporanById', () => {
    // Menguji pengambilan detail laporan berdasarkan id dari params.
    it('should return laporan by id', async () => {
      const req = { params: { id: '9' } }
      const res = createMockRes()
      const next = jest.fn()
      const laporan = { id: 9, catatan: 'Perbaikan selesai' }

      laporanServiceMock.getLaporanById.mockResolvedValue(laporan)

      await getLaporanById(req, res, next)

      expect(laporanServiceMock.getLaporanById).toHaveBeenCalledWith('9')
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: laporan
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error detail laporan diteruskan ke next().
    it('should forward get laporan by id errors to next', async () => {
      const req = { params: { id: '9' } }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('laporan not found')

      laporanServiceMock.getLaporanById.mockRejectedValue(error)

      await getLaporanById(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('getMyLaporan', () => {
    // Menguji pengambilan daftar laporan milik teknisi yang sedang login.
    it('should return my laporan', async () => {
      const req = { user: { id: 12 } }
      const res = createMockRes()
      const next = jest.fn()
      const laporanList = [{ id: 3, teknisiId: 5 }]

      laporanServiceMock.getMyLaporan.mockResolvedValue(laporanList)

      await getMyLaporan(req, res, next)

      expect(laporanServiceMock.getMyLaporan).toHaveBeenCalledWith(12)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: laporanList
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error saat mengambil laporan teknisi sendiri diteruskan ke next().
    it('should forward get my laporan errors to next', async () => {
      const req = { user: { id: 12 } }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('my laporan failed')

      laporanServiceMock.getMyLaporan.mockRejectedValue(error)

      await getMyLaporan(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })
})
