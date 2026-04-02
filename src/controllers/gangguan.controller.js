import gangguanService from '../services/gangguan.service.js'

/**
 * CREATE GANGGUAN (Admin Only)
 */
async function createGangguan(req, res, next) {
  try {
    const gangguan = await gangguanService.createGangguan(req.body, req.user.id)

    res.status(201).json({
      success: true,
      message: 'Gangguan berhasil dibuat',
      data: gangguan
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET ALL GANGGUAN (Admin Only)
 */
async function getAllGangguan(req, res, next) {
  try {
    const gangguan = await gangguanService.getAllGangguan()

    res.json({
      success: true,
      data: gangguan
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET GANGGUAN BY ID (Admin Only)
 */
async function getGangguanById(req, res, next) {
  try {
    const gangguan = await gangguanService.getGangguanById(req.params.id)

    res.json({
      success: true,
      data: gangguan
    })
  } catch (err) {
    next(err)
  }
}

/**
 * UPDATE GANGGUAN (Admin Only)
 */
async function updateGangguan(req, res, next) {
  try {
    const gangguan = await gangguanService.updateGangguan(req.params.id, req.body)

    res.json({
      success: true,
      message: 'Gangguan berhasil diupdate',
      data: gangguan
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET MY TASKS (Teknisi Only)
 */
async function getMyTasks(req, res, next) {
  try {
    const tasks = await gangguanService.getMyTasks(req.user.id)

    res.json({
      success: true,
      data: tasks
    })
  } catch (err) {
    next(err)
  }
}

export {
  createGangguan,
  getAllGangguan,
  getGangguanById,
  updateGangguan,
  getMyTasks
}