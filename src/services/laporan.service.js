import prisma from '../../config/prisma.js'

/**
 * Helper: Format Response Laporan
 */
const formatLaporanResponse = (laporan) => {
  if (!laporan) return null
  return {
    id: laporan.id,
    gangguanId: laporan.gangguanId,
    teknisiId: laporan.teknisiId,
    catatan: laporan.catatan,
    foto: laporan.foto,
    waktuSelesai: laporan.waktuSelesai,
    gangguan: laporan.gangguan ? {
      judul: laporan.gangguan.judul,
      deskripsi: laporan.gangguan.deskripsi,
      alamat: laporan.gangguan.alamat
    } : null,
    teknisi: laporan.teknisi ? {
      user: {
        nama: laporan.teknisi.user.nama,
        email: laporan.teknisi.user.email
      },
      noHp: laporan.teknisi.noHp
    } : null
  }
}

/**
 * CREATE LAPORAN (Teknisi Leader Only)
 * BUSINESS RULE: Hanya leader yang boleh submit laporan
 */
async function createLaporan(teknisiUserId, data) {
  const { gangguanId, catatan, foto } = data

  // Validasi input
  if (!gangguanId || !catatan?.trim()) {
    throw { statusCode: 400, message: 'gangguanId dan catatan wajib diisi' }
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Cek teknisi exists
    const teknisi = await tx.dataTeknisi.findUnique({
      where: { userId: teknisiUserId }
    })
    if (!teknisi) {
      throw { statusCode: 404, message: 'Data teknisi tidak ditemukan' }
    }

    // 2. Cek gangguan exists dan masih aktif
    const gangguan = await tx.gangguan.findUnique({
      where: { id: Number(gangguanId) },
      include: { assignments: true }
    })
    if (!gangguan) {
      throw { statusCode: 404, message: 'Gangguan tidak ditemukan' }
    }
    if (gangguan.status === 'done') {
      throw { statusCode: 400, message: 'Gangguan sudah selesai' }
    }

    // 3. BUSINESS RULE: Cek apakah teknisi ini adalah leader dari assignment aktif
    // Hanya leader yang boleh submit laporan
    const activeAssignment = gangguan.assignments.find(a =>
      a.teknisiId === teknisi.id && a.isLeader && a.status !== 'done'
    )
    if (!activeAssignment) {
      throw { statusCode: 403, message: 'Anda bukan leader dari assignment aktif untuk gangguan ini. Hanya leader yang boleh submit laporan.' }
    }

    // 4. Buat laporan
    const laporan = await tx.laporan.create({
      data: {
        gangguanId: Number(gangguanId),
        teknisiId: teknisi.id,
        catatan: catatan.trim(),
        foto: foto?.trim() || null
      },
      include: {
        gangguan: true,
        teknisi: { include: { user: true } }
      }
    })

    // 5. Update semua assignment untuk gangguan ini ke 'done'
    await tx.assignment.updateMany({
      where: { gangguanId: Number(gangguanId) },
      data: { status: 'done' }
    })

    // 6. Update gangguan ke 'done'
    await tx.gangguan.update({
      where: { id: Number(gangguanId) },
      data: { status: 'done' }
    })

    // 7. Update semua teknisi yang assigned ke 'available'
    const teknisiIds = gangguan.assignments.map(a => a.teknisiId)
    await tx.dataTeknisi.updateMany({
      where: { id: { in: teknisiIds } },
      data: { status: 'available' }
    })

    return formatLaporanResponse(laporan)
  })
}

/**
 * GET ALL LAPORAN (Admin Only)
 */
async function getAllLaporan() {
  const laporan = await prisma.laporan.findMany({
    include: {
      gangguan: true,
      teknisi: { include: { user: true } }
    },
    orderBy: { waktuSelesai: 'desc' }
  })

  return laporan.map(formatLaporanResponse)
}

/**
 * GET LAPORAN BY ID
 */
async function getLaporanById(id) {
  const laporanId = Number(id)
  if (isNaN(laporanId)) {
    throw { statusCode: 400, message: 'ID laporan tidak valid' }
  }

  const laporan = await prisma.laporan.findUnique({
    where: { id: laporanId },
    include: {
      gangguan: true,
      teknisi: { include: { user: true } }
    }
  })

  if (!laporan) {
    throw { statusCode: 404, message: 'Laporan tidak ditemukan' }
  }

  return formatLaporanResponse(laporan)
}

/**
 * GET MY LAPORAN (Teknisi Only)
 */
async function getMyLaporan(teknisiUserId) {
  const teknisi = await prisma.dataTeknisi.findUnique({
    where: { userId: teknisiUserId },
    select: { id: true }
  })

  if (!teknisi) {
    throw { statusCode: 404, message: 'Data teknisi tidak ditemukan' }
  }

  const laporan = await prisma.laporan.findMany({
    where: { teknisiId: teknisi.id },
    include: {
      gangguan: true,
      teknisi: { include: { user: true } }
    },
    orderBy: { waktuSelesai: 'desc' }
  })

  return laporan.map(formatLaporanResponse)
}

export default {
  createLaporan,
  getAllLaporan,
  getLaporanById,
  getMyLaporan
}