import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async () => {
  // Cleanup before all tests
  await prisma.$connect()
  
  // Ensure clean state
  await prisma.$transaction(async (tx) => {
    await tx.dataTeknisi.deleteMany()
    await tx.userRole.deleteMany()
    await tx.user.deleteMany()
    await tx.role.deleteMany()
  })

  await prisma.$disconnect()
}