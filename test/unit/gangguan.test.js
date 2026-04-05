import { jest } from '@jest/globals'

const gangguanServiceMock = {
  createGangguan: jest.fn(),
  getAllGangguan: jest.fn(),
  getGangguanById: jest.fn(),
  updateGangguan: jest.fn(),
  getMyTasks: jest.fn()
}

await jest.unstable_mockModule('../../src/services/gangguan.service.js', () => ({
  default: gangguanServiceMock
}))

const {
  createGangguan,
  getAllGangguan,
  getGangguanById,
  updateGangguan,
  getMyTasks
} = await import('../../src/controllers/gangguan.controller.js')

function createMockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('gangguan.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createGangguan', () => {
    // Menguji response 201 dan payload sukses saat service berhasil membuat gangguan.
    it('should create gangguan and return 201 response', async () => {
      const req = {
        body: {
          judul: 'Tiang listrik rusak',
          deskripsi: 'Butuh penanganan cepat'
        },
        user: { id: 99 }
      }
      const res = createMockRes()
      const next = jest.fn()
      const createdGangguan = { id: 1, judul: 'Tiang listrik rusak' }

      gangguanServiceMock.createGangguan.mockResolvedValue(createdGangguan)

      await createGangguan(req, res, next)

      expect(gangguanServiceMock.createGangguan).toHaveBeenCalledWith(req.body, 99)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Gangguan berhasil dibuat',
        data: createdGangguan
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error dari service diteruskan ke middleware error lewat next().
    it('should forward errors to next', async () => {
      const req = { body: {}, user: { id: 99 } }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('create failed')

      gangguanServiceMock.createGangguan.mockRejectedValue(error)

      await createGangguan(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
      expect(res.status).not.toHaveBeenCalled()
    })
  })

  describe('getAllGangguan', () => {
    // Menguji pengambilan seluruh data gangguan dan format response sukses.
    it('should return all gangguan', async () => {
      const req = {}
      const res = createMockRes()
      const next = jest.fn()
      const gangguanList = [{ id: 1 }, { id: 2 }]

      gangguanServiceMock.getAllGangguan.mockResolvedValue(gangguanList)

      await getAllGangguan(req, res, next)

      expect(gangguanServiceMock.getAllGangguan).toHaveBeenCalledTimes(1)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: gangguanList
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa kegagalan saat fetch list diteruskan ke next().
    it('should forward service error to next', async () => {
      const req = {}
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('fetch failed')

      gangguanServiceMock.getAllGangguan.mockRejectedValue(error)

      await getAllGangguan(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('getGangguanById', () => {
    // Menguji pengambilan satu gangguan berdasarkan id dari req.params.
    it('should return gangguan by id', async () => {
      const req = { params: { id: '7' } }
      const res = createMockRes()
      const next = jest.fn()
      const gangguan = { id: 7, judul: 'Trafo meledak' }

      gangguanServiceMock.getGangguanById.mockResolvedValue(gangguan)

      await getGangguanById(req, res, next)

      expect(gangguanServiceMock.getGangguanById).toHaveBeenCalledWith('7')
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: gangguan
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error pencarian detail gangguan diteruskan ke next().
    it('should forward lookup error to next', async () => {
      const req = { params: { id: '7' } }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('not found')

      gangguanServiceMock.getGangguanById.mockRejectedValue(error)

      await getGangguanById(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('updateGangguan', () => {
    // Menguji update gangguan dan response sukses yang dikirim controller.
    it('should update gangguan and return success response', async () => {
      const req = {
        params: { id: '3' },
        body: { status: 'assigned' }
      }
      const res = createMockRes()
      const next = jest.fn()
      const updatedGangguan = { id: 3, status: 'assigned' }

      gangguanServiceMock.updateGangguan.mockResolvedValue(updatedGangguan)

      await updateGangguan(req, res, next)

      expect(gangguanServiceMock.updateGangguan).toHaveBeenCalledWith('3', req.body)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Gangguan berhasil diupdate',
        data: updatedGangguan
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error saat update gangguan tidak ditangani diam-diam oleh controller.
    it('should forward update error to next', async () => {
      const req = {
        params: { id: '3' },
        body: { status: 'done' }
      }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('update failed')

      gangguanServiceMock.updateGangguan.mockRejectedValue(error)

      await updateGangguan(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('getMyTasks', () => {
    // Menguji pengambilan daftar task milik teknisi yang sedang login.
    it('should return logged-in teknisi tasks', async () => {
      const req = { user: { id: 12 } }
      const res = createMockRes()
      const next = jest.fn()
      const tasks = [{ assignmentId: 10, gangguan: { id: 5 } }]

      gangguanServiceMock.getMyTasks.mockResolvedValue(tasks)

      await getMyTasks(req, res, next)

      expect(gangguanServiceMock.getMyTasks).toHaveBeenCalledWith(12)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: tasks
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error saat mengambil task teknisi diteruskan ke next().
    it('should forward task retrieval error to next', async () => {
      const req = { user: { id: 12 } }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('tasks failed')

      gangguanServiceMock.getMyTasks.mockRejectedValue(error)

      await getMyTasks(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })
})
