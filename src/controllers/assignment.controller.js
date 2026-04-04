import assignmentService from '../services/assignment.service.js'

// ASSIGN TEKNISI TO GANGGUAN (Admin + Manual atau Auto)
async function assignTeknisiToGangguan(req, res, next) {
  try {
    const { id } = req.params
    const assignmentData = req.body

    const assignments = await assignmentService.assignTeknisiToGangguan(
      id,
      assignmentData,
      req.user.id
    )

    res.json({
      success: true,
      message: 'Teknisi berhasil di-assign ke gangguan',
      data: assignments
    })
  } catch (err) {
    next(err)
  }
}

// GET ASSIGNMENTS BY GANGGUAN ID (Admin)
async function getAssignmentsByGangguanId(req, res, next) {
  try {
    const { id } = req.params

    const assignments = await assignmentService.getAssignmentsByGangguanId(id)

    res.json({
      success: true,
      data: assignments
    })
  } catch (err) {
    next(err)
  }
}

// UPDATE ASSIGNMENT STATUS (Teknisi)
async function updateAssignmentStatus(req, res, next) {
  try {
    const { assignmentId } = req.params
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status wajib diisi' })
    }

    const assignment = await assignmentService.updateAssignmentStatus(
      assignmentId,
      status,
      req.user.id
    )

    res.json({
      success: true,
      message: 'Status assignment berhasil diupdate',
      data: assignment
    })
  } catch (err) {
    next(err)
  }
}

export {
  assignTeknisiToGangguan,
  getAssignmentsByGangguanId,
  updateAssignmentStatus
}