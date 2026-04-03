import prisma from '../../config/prisma.js'

const MOVEMENT_THRESHOLD_KM = 0.01 // ~10 meter

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

async function recordTracking(userId, latitude, longitude) {
  // BUSINESS RULE: Hanya teknisi yang boleh tracking
  // Role validation dilakukan di middleware/route level
  // Fungsi ini menerima userId yang sudah tervalidasi sebagai teknisi
  
  if (latitude === undefined || longitude === undefined) {
    throw { statusCode: 400, message: 'latitude dan longitude wajib diisi' }
  }
  if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
    throw { statusCode: 400, message: 'latitude dan longitude harus angka' }
  }

  const lat = parseFloat(latitude)
  const lon = parseFloat(longitude)

  const teknisi = await prisma.dataTeknisi.findUnique({
    where: { userId },
    include: { user: true }
  })

  if (!teknisi) {
    throw { statusCode: 404, message: 'Teknisi tidak ditemukan' }
  }

  // update lastSeen dan terakhir posisi
  const shouldTrack = (() => {
    if (teknisi.latitude === null || teknisi.longitude === null) return true

    const dist = calculateDistanceKm(teknisi.latitude, teknisi.longitude, lat, lon)
    return dist >= MOVEMENT_THRESHOLD_KM
  })()

  const [trackingRecord] = await prisma.$transaction(async (tx) => {
    // update data teknisi first
    const updateTeknisi = tx.dataTeknisi.update({
      where: { id: teknisi.id },
      data: {
        latitude: lat,
        longitude: lon,
        lastSeen: new Date(),
        status: 'busy'
      }
    })

    let createTracking = Promise.resolve(null)
    if (shouldTrack) {
      createTracking = tx.tracking.create({
        data: {
          teknisiId: teknisi.id,
          latitude: lat,
          longitude: lon
        }
      })
    }

    const resultTeknisi = await updateTeknisi
    const resultTrack = await createTracking
    return [resultTrack, resultTeknisi]
  })

  return {
    success: true,
    tracked: Boolean(trackingRecord),
    trackingRecord,
    teknisiId: teknisi.id,
    lastSeen: new Date()
  }
}

async function getLatestTracking() {
  // Ambil list teknisi + data tracking terakhir
  const teknisiList = await prisma.dataTeknisi.findMany({
    include: {
      user: true,
      assignments: {
        where: {
          status: {
            in: ['assigned', 'on_the_way', 'working']
          }
        },
        include: {
          gangguan: true
        },
        orderBy: { assignedAt: 'desc' }
      },
      trackings: {
        orderBy: { recordedAt: 'desc' },
        take: 1
      }
    }
  })

  return teknisiList.map((t) => ({
    teknisiId: t.id,
    userId: t.userId,
    nama: t.user?.nama || null,
    email: t.user?.email || null,
    statusTeknisi: t.status,
    lastSeen: t.lastSeen,
    location: t.trackings[0]
      ? {
        latitude: t.trackings[0].latitude,
        longitude: t.trackings[0].longitude,
        recordedAt: t.trackings[0].recordedAt
      }
      : (t.latitude !== null && t.longitude !== null ? { latitude: t.latitude, longitude: t.longitude, recordedAt: t.lastSeen } : null),
    activeGangguan: t.assignments.length > 0 ? t.assignments[0].gangguan : null
  }))
}

async function getTrackingByTeknisi(teknisiId) {
  const trackings = await prisma.tracking.findMany({
    where: { teknisiId: Number(teknisiId) },
    orderBy: { recordedAt: 'desc' },
    take: 100
  })

  return trackings
}

export default {
  recordTracking,
  getLatestTracking,
  getTrackingByTeknisi
}
