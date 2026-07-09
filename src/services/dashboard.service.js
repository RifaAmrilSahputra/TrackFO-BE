import prisma from "../../config/prisma.js";

const ONLINE_THRESHOLD_MINUTES = 5;

async function getDashboard() {
  const [
    totalGangguan,
    gangguanAktif,

    totalTeknisi,
    teknisiAvailable,
    teknisiBusy,
    teknisiOff,

    assignmentAktif,

    totalLaporan,

    latestGangguan,

    latestAssignment,

    busyTechnician,

    assignmentSummary,

    prioritySummary,

    trackingStatus,
  ] = await Promise.all([

    // ===========================
    // STATS
    // ===========================

    prisma.gangguan.count(),

    prisma.gangguan.count({
      where: {
        status: {
          not: "done",
        },
      },
    }),

    prisma.dataTeknisi.count(),

    prisma.dataTeknisi.count({
      where: {
        status: "available",
      },
    }),

    prisma.dataTeknisi.count({
      where: {
        status: "busy",
      },
    }),

    prisma.dataTeknisi.count({
      where: {
        status: "off",
      },
    }),

    prisma.assignment.count({
      where: {
        status: {
          not: "done",
        },
      },
    }),

    prisma.laporan.count(),

    // ===========================
    // LATEST GANGGUAN
    // ===========================

    prisma.gangguan.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        judul: true,
        area: true,
        priority: true,
        status: true,
        createdAt: true,
      },
    }),

    // ===========================
    // LATEST ASSIGNMENT
    // ===========================

    prisma.assignment.findMany({
      take: 5,
      orderBy: {
        assignedAt: "desc",
      },
      include: {
        gangguan: {
          select: {
            judul: true,
          },
        },
        teknisi: {
          include: {
            user: {
              select: {
                nama: true,
              },
            },
          },
        },
      },
    }),

    // ===========================
    // BUSY TECHNICIAN
    // ===========================

    prisma.dataTeknisi.findMany({
      where: {
        status: "busy",
      },
      take: 5,
      include: {
        user: true,
      },
      orderBy: {
        lastSeen: "desc",
      },
    }),

    // ===========================
    // ASSIGNMENT SUMMARY
    // ===========================

    prisma.assignment.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    }),

    // ===========================
    // PRIORITY SUMMARY
    // ===========================

    prisma.gangguan.groupBy({
      by: ["priority"],
      _count: {
        priority: true,
      },
      where: {
        status: {
          not: "done",
        },
      },
    }),

    // ===========================
    // TRACKING SUMMARY
    // ===========================

    prisma.dataTeknisi.findMany({
      select: {
        id: true,
        lastSeen: true,
      },
    }),
  ]);

  // ====================================
  // Assignment Summary
  // ====================================

  const assignmentStats = {
    assigned: 0,
    accepted: 0,
    on_the_way: 0,
    working: 0,
    pending_verification: 0,
    done: 0,
  };

  assignmentSummary.forEach((item) => {
    assignmentStats[item.status] = item._count.status;
  });

  // ====================================
  // Priority Summary
  // ====================================

  const priorityStats = {
    high: 0,
    medium: 0,
    low: 0,
  };

  prioritySummary.forEach((item) => {
    priorityStats[item.priority] = item._count.priority;
  });

  // ====================================
  // Tracking Summary
  // ====================================

  const now = new Date();

  const onlineThreshold =
    ONLINE_THRESHOLD_MINUTES * 60 * 1000;

  const onlineTechnician = trackingStatus.filter((item) => {
    if (!item.lastSeen) return false;

    return (
      now.getTime() -
        new Date(item.lastSeen).getTime() <=
      onlineThreshold
    );
  });

  const latestTracking = trackingStatus
    .filter((item) => item.lastSeen)
    .sort(
      (a, b) =>
        new Date(b.lastSeen) -
        new Date(a.lastSeen)
    )[0];

  return {
    stats: {
      totalGangguan,
      gangguanAktif,

      totalTeknisi,

      teknisiAvailable,

      teknisiBusy,

      teknisiOff,

      assignmentAktif,

      totalLaporan,
    },

    assignmentSummary: assignmentStats,

    prioritySummary: priorityStats,

    trackingSummary: {
      online: onlineTechnician.length,

      offline:
        trackingStatus.length -
        onlineTechnician.length,

      lastUpdate:
        latestTracking?.lastSeen ?? null,
    },

    latestGangguan,

    latestAssignment: latestAssignment.map(
      (item) => ({
        id: item.id,

        gangguan: item.gangguan?.judul,

        teknisi: item.teknisi?.user?.nama,

        status: item.status,

        assignedAt: item.assignedAt,
      })
    ),

    busyTechnician: busyTechnician.map((item) => ({
      id: item.id,

      nama: item.user?.nama,

      area: item.areaKerja,

      status: item.status,

      lastSeen: item.lastSeen,
    })),
  };
}

export default {
  getDashboard,
};