import laporanService from '../services/laporan.service.js'

/**
 * CREATE LAPORAN (Teknisi Leader Only)
 */
async function createLaporan(req, res, next) {
  try {
    const laporan = await laporanService.createLaporan(req.user.id, req.body)

    res.status(201).json({
      success: true,
      message: 'Laporan berhasil dibuat dan gangguan ditutup',
      data: laporan
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET ALL LAPORAN (Admin Only)
 */
async function getAllLaporan(req, res, next) {
  try {
    const laporan = await laporanService.getAllLaporan()

    res.json({
      success: true,
      data: laporan
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET LAPORAN BY ID (Admin Only)
 */
async function getLaporanById(req, res, next) {
  try {
    const laporan = await laporanService.getLaporanById(req.params.id)

    res.json({
      success: true,
      data: laporan
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET MY LAPORAN (Teknisi Only)
 */
async function getMyLaporan(req, res, next) {
  try {
    const laporan = await laporanService.getMyLaporan(req.user.id)

    res.json({
      success: true,
      data: laporan
    })
  } catch (err) {
    next(err)
  }
}

export {
  createLaporan,
  getAllLaporan,
  getLaporanById,
  getMyLaporan
}