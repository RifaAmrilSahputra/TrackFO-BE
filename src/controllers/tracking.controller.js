import trackingService from '../services/tracking.service.js'

async function postTracking(req, res, next) {
  try {
    const result = await trackingService.recordTracking(req.user.id, req.body.latitude, req.body.longitude)

    // Emit realtime tracking update via Socket.IO if enabled and a new tracking record was created
    try {
      const io = req.app.get && req.app.get('io')
      if (io && result.tracked) {
        const payload = {
          teknisiId: result.teknisiId,
          latitude: result.trackingRecord?.latitude ?? parseFloat(req.body.latitude),
          longitude: result.trackingRecord?.longitude ?? parseFloat(req.body.longitude),
          recordedAt: result.trackingRecord?.recordedAt ?? result.lastSeen ?? new Date()
        }
        io.emit('tracking:update', payload)
      }
    } catch (e) {
      // non-fatal: don't break response if emit fails
      console.error('Failed to emit tracking:update', e)
    }

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

// getGangguanTracking: Mengambil data tracking teknisi yang terkait dengan gangguan tertentu
async function getGangguanTracking(req, res, next) {
  try {
    const { gangguanId } = req.params

    const result = await trackingService.getGangguanTracking(gangguanId)

    res.json({
      success: true,
      data: result
    })
  } catch (err) {
    next(err)
  }
}

// getActiveGangguanList: Mengambil daftar gangguan yang sedang aktif (assigned, on_the_way, working)
async function getActiveGangguanList(req, res, next) {
  try {
    const result = await trackingService.getActiveGangguanList()

    res.json({
      success: true,
      data: result
    })
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
  getGangguanTracking,
  getActiveGangguanList,
  getTeknisiTracking
}
