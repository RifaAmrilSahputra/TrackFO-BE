import prisma from '../../config/prisma.js'

/**
 * Helper: Format Response Gangguan
 */
const formatGangguanResponse = (gangguan) => {
  if (!gangguan) return null
  return {
    id: gangguan.id,
    judul: gangguan.judul,
    deskripsi: gangguan.deskripsi,
    latitude: gangguan.latitude,
    longitude: gangguan.longitude,
    alamat: gangguan.alamat,
    status: gangguan.status,
    priority: gangguan.priority,
    deadline: gangguan.deadline,
    createdAt: gangguan.createdAt,
    assignments: gangguan.assignments?.map(a => ({
      id: a.id,
      teknisiId: a.teknisiId,
      isLeader: a.isLeader,
      status: a.status,
      assignedAt: a.assignedAt,
      teknisi: {
        user: {
          nama: a.teknisi.user.nama,
          email: a.teknisi.user.email
        },
        noHp: a.teknisi.noHp,
        areaKerja: a.teknisi.areaKerja
      }
    })) || []
  }
}

/**
 * CREATE GANGGUAN (Admin Only)
 */
async function createGangguan(data, createdBy) {
  const { judul, deskripsi, latitude, longitude, alamat, priority, deadline } = data

  // Validasi wajib
  if (!judul?.trim() || !deskripsi?.trim()) {
    throw { statusCode: 400, message: 'Judul dan deskripsi wajib diisi' }
  }
  if (latitude === undefined || longitude === undefined) {
    throw { statusCode: 400, message: 'Latitude dan longitude wajib diisi' }
  }
  if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
    throw { statusCode: 400, message: 'Latitude dan longitude harus berupa angka' }
  }

  const gangguan = await prisma.gangguan.create({
    data: {
      judul: judul.trim(),
      deskripsi: deskripsi.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      alamat: alamat?.trim() || '',
      priority: priority || null,
      deadline: deadline ? new Date(deadline) : null,
      status: 'open' // default status
    }
  })

  return formatGangguanResponse(gangguan)
}

/**
 * GET ALL GANGGUAN (Admin Only)
 */
async function getAllGangguan() {
  const gangguan = await prisma.gangguan.findMany({
    include: {
      assignments: {
        include: {
          teknisi: {
            include: {
              user: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return gangguan.map(formatGangguanResponse)
}

/**
 * GET GANGGUAN BY ID
 */
async function getGangguanById(id) {
  const gangguanId = Number(id)
  if (isNaN(gangguanId)) {
    throw { statusCode: 400, message: 'ID gangguan tidak valid' }
  }

  const gangguan = await prisma.gangguan.findUnique({
    where: { id: gangguanId },
    include: {
      assignments: {
        include: {
          teknisi: {
            include: {
              user: true
            }
          }
        }
      }
    }
  })

  if (!gangguan) {
    throw { statusCode: 404, message: 'Gangguan tidak ditemukan' }
  }

  return formatGangguanResponse(gangguan)
}

/**
 * UPDATE GANGGUAN (Admin Only)
 * BUSINESS RULE: Tidak boleh update gangguan yang sudah done
 */
async function updateGangguan(id, data) {
  const gangguanId = Number(id)
  if (isNaN(gangguanId)) {
    throw { statusCode: 400, message: 'ID gangguan tidak valid' }
  }

  // Cek gangguan exists dulu
  const existingGangguan = await prisma.gangguan.findUnique({
    where: { id: gangguanId }
  })

  if (!existingGangguan) {
    throw { statusCode: 404, message: 'Gangguan tidak ditemukan' }
  }

  // BUSINESS RULE: Prevent updates on done gangguan
  if (existingGangguan.status === 'done') {
    throw { statusCode: 400, message: 'Tidak bisa update gangguan yang sudah selesai. Gangguan sudah ditutup.' }
  }

  const updateData = {}

  if (data.judul !== undefined) updateData.judul = data.judul.trim()
  if (data.deskripsi !== undefined) updateData.deskripsi = data.deskripsi.trim()
  if (data.alamat !== undefined) updateData.alamat = data.alamat.trim()
  if (data.priority !== undefined) updateData.priority = data.priority
  if (data.deadline !== undefined) updateData.deadline = data.deadline ? new Date(data.deadline) : null
  if (data.status !== undefined) {
    const validStatuses = ['open', 'assigned', 'on_progress', 'done']
    if (!validStatuses.includes(data.status)) {
      throw { statusCode: 400, message: 'Status tidak valid' }
    }
    updateData.status = data.status
  }

  // Validasi lat long jika diupdate
  if (data.latitude !== undefined) {
    if (isNaN(parseFloat(data.latitude))) {
      throw { statusCode: 400, message: 'Latitude harus berupa angka' }
    }
    updateData.latitude = parseFloat(data.latitude)
  }
  if (data.longitude !== undefined) {
    if (isNaN(parseFloat(data.longitude))) {
      throw { statusCode: 400, message: 'Longitude harus berupa angka' }
    }
    updateData.longitude = parseFloat(data.longitude)
  }

  const gangguan = await prisma.gangguan.update({
    where: { id: gangguanId },
    data: updateData,
    include: {
      assignments: {
        include: {
          teknisi: {
            include: {
              user: true
            }
          }
        }
      }
    }
  })

  return formatGangguanResponse(gangguan)
}

/**
 * GET MY TASKS (Teknisi Only)
 */
async function getMyTasks(teknisiId) {
  const teknisi = await prisma.dataTeknisi.findUnique({
    where: { userId: teknisiId },
    select: { id: true }
  })

  if (!teknisi) {
    throw { statusCode: 404, message: 'Data teknisi tidak ditemukan' }
  }

  const assignments = await prisma.assignment.findMany({
    where: { teknisiId: teknisi.id },
    include: {
      gangguan: true
    },
    orderBy: { assignedAt: 'desc' }
  })

  return assignments.map(a => ({
    assignmentId: a.id,
    isLeader: a.isLeader,
    assignmentStatus: a.status,
    assignedAt: a.assignedAt,
    gangguan: formatGangguanResponse(a.gangguan)
  }))
}

export default {
  createGangguan,
  getAllGangguan,
  getGangguanById,
  updateGangguan,
  getMyTasks
}