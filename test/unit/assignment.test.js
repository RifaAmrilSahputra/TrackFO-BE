import { jest } from '@jest/globals'

const assignmentServiceMock = {
  assignTeknisiToGangguan: jest.fn(),
  getAssignmentsByGangguanId: jest.fn(),
  updateAssignmentStatus: jest.fn()
}

await jest.unstable_mockModule('../../src/services/assignment.service.js', () => ({
  default: assignmentServiceMock
}))

const {
  assignTeknisiToGangguan,
  getAssignmentsByGangguanId,
  updateAssignmentStatus
} = await import('../../src/controllers/assignment.controller.js')

function createMockRes() {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

describe('assignment.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('assignTeknisiToGangguan', () => {
    // Menguji assign teknisi ke gangguan dan response sukses dari controller.
    it('should assign teknisi to gangguan and return success response', async () => {
      const req = {
        params: { id: '10' },
        body: { teknisiIds: [2, 3], leaderId: 2, method: 'manual' },
        user: { id: 99 }
      }
      const res = createMockRes()
      const next = jest.fn()
      const assignments = [{ id: 1 }, { id: 2 }]

      assignmentServiceMock.assignTeknisiToGangguan.mockResolvedValue(assignments)

      await assignTeknisiToGangguan(req, res, next)

      expect(assignmentServiceMock.assignTeknisiToGangguan).toHaveBeenCalledWith(
        '10',
        req.body,
        99
      )
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Teknisi berhasil di-assign ke gangguan',
        data: assignments
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error dari service assign diteruskan ke next().
    it('should forward assign errors to next', async () => {
      const req = {
        params: { id: '10' },
        body: { teknisiIds: [2] },
        user: { id: 99 }
      }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('assign failed')

      assignmentServiceMock.assignTeknisiToGangguan.mockRejectedValue(error)

      await assignTeknisiToGangguan(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
      expect(res.json).not.toHaveBeenCalled()
    })
  })

  describe('getAssignmentsByGangguanId', () => {
    // Menguji pengambilan daftar assignment berdasarkan id gangguan.
    it('should return assignments by gangguan id', async () => {
      const req = { params: { id: '10' } }
      const res = createMockRes()
      const next = jest.fn()
      const assignments = [{ id: 1, gangguanId: 10 }]

      assignmentServiceMock.getAssignmentsByGangguanId.mockResolvedValue(assignments)

      await getAssignmentsByGangguanId(req, res, next)

      expect(assignmentServiceMock.getAssignmentsByGangguanId).toHaveBeenCalledWith('10')
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: assignments
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error fetch assignment diteruskan ke next().
    it('should forward fetch errors to next', async () => {
      const req = { params: { id: '10' } }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('fetch failed')

      assignmentServiceMock.getAssignmentsByGangguanId.mockRejectedValue(error)

      await getAssignmentsByGangguanId(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })

  describe('updateAssignmentStatus', () => {
    // Menguji validasi controller saat field status tidak dikirim.
    it('should reject request when status is missing', async () => {
      const req = {
        params: { assignmentId: '5' },
        body: {},
        user: { id: 12 }
      }
      const res = createMockRes()
      const next = jest.fn()

      await updateAssignmentStatus(req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status wajib diisi'
      })
      expect(assignmentServiceMock.updateAssignmentStatus).not.toHaveBeenCalled()
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji update status assignment saat payload valid.
    it('should update assignment status and return success response', async () => {
      const req = {
        params: { assignmentId: '5' },
        body: { status: 'working' },
        user: { id: 12 }
      }
      const res = createMockRes()
      const next = jest.fn()
      const assignment = { id: 5, status: 'working' }

      assignmentServiceMock.updateAssignmentStatus.mockResolvedValue(assignment)

      await updateAssignmentStatus(req, res, next)

      expect(assignmentServiceMock.updateAssignmentStatus).toHaveBeenCalledWith(
        '5',
        'working',
        12
      )
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Status assignment berhasil diupdate',
        data: assignment
      })
      expect(next).not.toHaveBeenCalled()
    })

    // Menguji bahwa error dari service update status diteruskan ke next().
    it('should forward update status errors to next', async () => {
      const req = {
        params: { assignmentId: '5' },
        body: { status: 'working' },
        user: { id: 12 }
      }
      const res = createMockRes()
      const next = jest.fn()
      const error = new Error('update failed')

      assignmentServiceMock.updateAssignmentStatus.mockRejectedValue(error)

      await updateAssignmentStatus(req, res, next)

      expect(next).toHaveBeenCalledWith(error)
    })
  })
})
