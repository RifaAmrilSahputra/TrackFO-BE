import prisma from '../../config/prisma.js'

// STATUS FLOW VALIDATION (spec v2)
// Enforce status flow:
// assigned → accepted → on_the_way → working → pending_verification → done
// pending_verification → rejected
// rejected → working (rework)
// Teknisi/Admin hanya boleh update status sesuai flow.
const STATUS_FLOW = {
  // Backward compatible with current tests/spec:
  // assigned -> on_the_way (legacy)
  // Also support new flow:
  // assigned -> accepted -> on_the_way
  assigned: ['accepted', 'on_the_way'],
  accepted: ['on_the_way'],
  on_the_way: ['working'],
  working: ['pending_verification', 'rejected'],
  pending_verification: ['done', 'rejected'],
  rejected: ['working'],
  done: [] // final state
}


function validateStatusTransition(currentStatus, newStatus) {
  const allowedNextStatuses = STATUS_FLOW[currentStatus] || []
  if (!allowedNextStatuses.includes(newStatus)) {
    throw {
      statusCode: 400,
      message: `Tidak boleh mengubah status dari ${currentStatus} ke ${newStatus}. Status berikutnya yang valid: ${allowedNextStatuses.join(', ')}`
    }
  }
}


// HITUNG JARAK DENGAN HAVERSINE FORMULA
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Radius bumi dalam km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c // Jarak dalam km
}

// Helper: Format Response Assignment
const formatAssignmentResponse = (assignment) => {
  if (!assignment) return null
  return {
    id: assignment.id,
    gangguanId: assignment.gangguanId,
    teknisiId: assignment.teknisiId,
    isLeader: assignment.isLeader,
    status: assignment.status,
    assignedAt: assignment.assignedAt,
    assignedBy: assignment.assignedBy,
    method: assignment.method,
    teknisi: {
      user: {
        nama: assignment.teknisi.user.nama,
        email: assignment.teknisi.user.email
      },
      noHp: assignment.teknisi.noHp,
      areaKerja: assignment.teknisi.areaKerja,
      status: assignment.teknisi.status
    }
  }
}

// FIND BEST TEKNISI BERDASARKAN JARAK TERDEKAT
async function findBestTeknisi(gangguanLat, gangguanLon, excludeIds = []) {
  // Ambil semua teknisi yang available
  const availableTeknisi = await prisma.dataTeknisi.findMany({
    where: {
      status: 'available',
      user: { isActive: true },
      userId: { notIn: excludeIds }
    },
    include: {
      user: true
    }
  })

  if (availableTeknisi.length === 0) {
    throw { statusCode: 404, message: 'Tidak ada teknisi yang tersedia' }
  }

  // Hitung jarak dan urutkan dari terdekat
  const teknisiWithDistance = availableTeknisi
    .filter(t => t.latitude !== null && t.longitude !== null)
    .map(teknisi => ({
      ...teknisi,
      distance: calculateDistance(
        gangguanLat, gangguanLon,
        teknisi.latitude, teknisi.longitude
      )
    }))
    .sort((a, b) => a.distance - b.distance)

  if (teknisiWithDistance.length === 0) {
    throw { statusCode: 404, message: 'Tidak ada teknisi dengan koordinat yang valid' }
  }

  return teknisiWithDistance[0] // Yang terdekat
}

// ASSIGN TEKNISI KE GANGGUAN (Manual atau Auto)
async function assignTeknisiToGangguan(gangguanId, assignmentData, assignedBy) {
  const { teknisiIds, method = 'manual' } = assignmentData
  const validMethods = ['manual', 'auto']
  if (!validMethods.includes(method)) {
    throw {
      statusCode: 400,
      message: 'Method assignment tidak valid.'
    }
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Cek gangguan exists dan status open/assigned
    const gangguan = await tx.gangguan.findUnique({
        where: {
            id: Number(gangguanId)
        },
        include: {
            assignments: {
                include: {
                    teknisi: true
                }
            }
        }
    })
    
    if (!gangguan) {
      throw { statusCode: 404, message: 'Gangguan tidak ditemukan' }
    }

    if (gangguan.status === 'done') {
      throw { statusCode: 400, message: 'Gangguan sudah selesai' }
    }

    const existingAssignments = await tx.assignment.findMany({
      where: {
        gangguanId: Number(gangguanId)
      },
      include: {
        teknisi: {
          include: {
            user: true
          }
        }
      }
    })

    const assignedTeknisiIds = new Set(
      existingAssignments.map(assignment => assignment.teknisiId)
    )

    // 2. Tentukan teknisi yang akan di-assign
    let selectedTeknisi = []

    if (method === 'auto') {
      // Auto assign: cari teknisi terbaik
      const bestTeknisi = await findBestTeknisi(
        gangguan.latitude,
        gangguan.longitude,
        gangguan.assignments.map(a => a.teknisi.userId)
      )
      selectedTeknisi = [bestTeknisi]
    } else {
      // Manual assign: admin pilih teknisi
      if (!teknisiIds || !Array.isArray(teknisiIds) || teknisiIds.length === 0) {
        throw { statusCode: 400, message: 'teknisiIds wajib diisi untuk assign manual' }
      }

      const uniqueIds = [...new Set(teknisiIds)]
      if (uniqueIds.length !== teknisiIds.length) {
        throw {
          statusCode: 400,
          message: 'Terdapat teknisi yang dipilih lebih dari satu kali.'
        }
      }

      const assignedTeknisiNames = existingAssignments
        .filter(assignment => uniqueIds.includes(assignment.teknisi.userId))
        .map(assignment => assignment.teknisi.user.nama)

      if (assignedTeknisiNames.length > 0) {
        throw {
          statusCode: 400,
          message: `Teknisi sudah ditugaskan pada gangguan ini: ${assignedTeknisiNames.join(', ')}`
        }
      }

      // BUSINESS RULE: Tidak bisa assign teknisi yang busy
      // Validasi teknisi exists dan available
      const teknisiRecords = await tx.dataTeknisi.findMany({
        where: {
          userId: {
            in: teknisiIds
          },
          status: 'available',
          user: {
            isActive: true
          }
        },
        include: {
          user: true
        }
      })

      if (teknisiRecords.length !== teknisiIds.length) {
        throw {
          statusCode: 400,
          message: 'Beberapa teknisi tidak valid atau tidak tersedia.'
        }
      }

      const teknisiFromDifferentArea = teknisiRecords.find(
        teknisi => teknisi.areaKerja !== gangguan.area
      )
      if (teknisiFromDifferentArea) {
        throw {
          statusCode: 400,
          message: `Teknisi ${teknisiFromDifferentArea.user.nama} bukan berasal dari area ${gangguan.area}.`
        }
      }

      selectedTeknisi = teknisiRecords
    }

    // 3. Tentukan Leader
    let leaderIndex = 0

    if (selectedTeknisi.length > 1) {
      const leaderId = Number(assignmentData.leaderId)

      // Leader wajib dipilih jika teknisi lebih dari satu
      if (!assignmentData.leaderId) {
        throw {
          statusCode: 400,
          message: 'Pilih salah satu teknisi sebagai leader.'
        }
      }

      // Leader harus termasuk teknisi yang dipilih
      if (!teknisiIds.includes(leaderId)) {
        throw {
          statusCode: 400,
          message: 'Leader harus termasuk dalam teknisi yang dipilih.'
        }
      }

      const leaderIdx = selectedTeknisi.findIndex(
        t => t.userId === leaderId
      )

      if (leaderIdx === -1) {
        throw {
          statusCode: 400,
          message: 'Leader tidak valid.'
        }
      }

      leaderIndex = leaderIdx
    }

    // 4. Buat assignments
    const assignments = []
    for (let i = 0; i < selectedTeknisi.length; i++) {
      const teknisi = selectedTeknisi[i]
      const isLeader = i === leaderIndex

      // Cegah duplicate assignment
      if (assignedTeknisiIds.has(teknisi.id)) {
        throw {
          statusCode: 400,
          message: `Teknisi ${teknisi.user.nama} sudah ditugaskan pada gangguan ini.`
        }
      }

      const assignment = await tx.assignment.create({
        data: {
          gangguanId: Number(gangguanId),
          teknisiId: teknisi.id,
          isLeader,
          status: 'assigned',
          assignedBy: assignedBy || null,
          method
        },
        include: {
          teknisi: {
            include: {
              user: true
            }
          }
        }
      })

      // Initial status log
      await tx.assignmentStatusLog.create({
        data: {
          assignmentId: assignment.id,
          oldStatus: 'assigned',
          newStatus: 'assigned',
          changedByUserId: assignedBy || null
        }
      })

      assignments.push(assignment)
      assignedTeknisiIds.add(teknisi.id)

      // Update status teknisi
      await tx.dataTeknisi.update({
        where: {
          id: teknisi.id
        },
        data: {
          status: 'busy'
        }
      })
    }

    // 5. Update status gangguan ke assigned
    await tx.gangguan.update({
      where: { id: Number(gangguanId) },
      data: { status: 'assigned' }
    })

    return assignments.map(formatAssignmentResponse)
  })
}

// GET ASSIGNMENTS BY GANGGUAN ID
async function getAssignmentsByGangguanId(gangguanId) {
  const assignments = await prisma.assignment.findMany({
    where: { gangguanId: Number(gangguanId) },
    include: {
      teknisi: {
        include: { user: true }
      }
    },
    orderBy: { assignedAt: 'asc' }
  })

  return assignments.map(formatAssignmentResponse)
}

// UPDATE STATUS ASSIGNMENT
async function updateAssignmentStatus(assignmentId, status, teknisiUserId, changedByUserId) {
  const validStatuses = [
    'assigned',
    'accepted',
    'on_the_way',
    'working',
    'pending_verification',
    'rejected',
    'done'
  ]

  const assignmentIdNum = Number(assignmentId)
  if (Number.isNaN(assignmentIdNum)) {
    throw { statusCode: 400, message: 'assignmentId tidak valid' }
  }
  if (!validStatuses.includes(status)) {
    throw { statusCode: 400, message: 'Status assignment tidak valid' }
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: Number(assignmentId) },
    include: { teknisi: true, gangguan: true }
  })

  if (!assignment) {
    throw { statusCode: 404, message: 'Assignment tidak ditemukan' }
  }

  // Cek apakah teknisi yang update adalah yang di-assign
  if (assignment.teknisi.userId !== teknisiUserId) {
    throw { statusCode: 403, message: 'Anda tidak memiliki akses ke assignment ini' }
  }

  // BUSINESS RULE: Enforce status flow transition
  const currentStatus = assignment.status
  validateStatusTransition(currentStatus, status)

  return await prisma.$transaction(async (tx) => {
    // Evidence gating:
    // - Spec/test expectation: allow `on_the_way` -> `working` without WorkEvidence.
    // - If evidence requirements are needed, they should be enforced by a different
    //   workflow step/end-point (e.g. when submitting/confirming reports).

    // Update assignment status
    const updatedAssignment = await tx.assignment.update({
      where: { id: Number(assignmentId) },
      data: { status },
      include: {
        teknisi: { include: { user: true } }
      }
    })

    // Status transition logging
    await tx.assignmentStatusLog.create({
      data: {
        assignmentId: Number(assignmentId),
        oldStatus: currentStatus,
        newStatus: status,
        changedByUserId: changedByUserId || assignment.teknisi.userId
      }
    })

    // Jika semua assignment done, update gangguan status
    if (status === 'done') {
      const allAssignments = await tx.assignment.findMany({
        where: { gangguanId: assignment.gangguanId }
      })

      const allDone = allAssignments.every(a => a.status === 'done')
      if (allDone) {
        await tx.gangguan.update({
          where: { id: assignment.gangguanId },
          data: { status: 'done' }
        })

        // Set teknisi kembali ke available
        await tx.dataTeknisi.update({
          where: { id: assignment.teknisiId },
          data: { status: 'available' }
        })
      }
    }

    return formatAssignmentResponse(updatedAssignment)
  })
}

export default {
  assignTeknisiToGangguan,
  getAssignmentsByGangguanId,
  updateAssignmentStatus
}
