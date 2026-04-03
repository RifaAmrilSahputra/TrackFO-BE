import trackingService from '../services/tracking.service.js'

async function postTracking(req, res, next) {
  try {
    const result = await trackingService.recordTracking(req.user.id, req.body.latitude, req.body.longitude)

    res.json({
      success: true,
      message: result.tracked ? 'Tracking tersimpan' : 'Tidak ada perubahan lokasi signifikan',
      data: {
        teknisiId: result.teknisiId,
        lastSeen: result.lastSeen,
        tracked: result.tracked,
      }
    })
  } catch (err) {
    next(err)
  }
}

async function getAllTracking(req, res, next) {
  try {
    const positions = await trackingService.getLatestTracking()
    res.json({ success: true, data: positions })
  } catch (err) {
    next(err)
  }
}

async function getTeknisiTracking(req, res, next) {
  try {
    const { teknisiId } = req.params
    const points = await trackingService.getTrackingByTeknisi(teknisiId)
    res.json({ success: true, data: points })
  } catch (err) {
    next(err)
  }
}

export {
  postTracking,
  getAllTracking,
  getTeknisiTracking
}
