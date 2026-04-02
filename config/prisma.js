import { PrismaClient } from '@prisma/client'

// Inisialisasi Prisma Client
const prisma = new PrismaClient({
  // Opsional: aktifkan log untuk mempermudah debugging saat development
  log: ['query', 'info', 'warn', 'error'],
})

// Menangani penutupan koneksi saat aplikasi mati (graceful shutdown)
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

export default prisma