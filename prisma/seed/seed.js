import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed process...')

  try {
    // ==============================
    // 1. PASSWORD
    // ==============================
    const rawPassword = process.env.ADMIN_PASSWORD || 'password999'
    if (!process.env.ADMIN_PASSWORD) {
      console.warn('⚠️ WARNING: ADMIN_PASSWORD not found in .env, using default!')
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 12)

    // ==============================
    // 2. ROLES
    // ==============================
    const roleNames = ['ADMIN', 'TEKNISI']

    const createdRoles = {}

    for (const name of roleNames) {
      const role = await prisma.role.upsert({
        where: { nama_role: name },
        update: {},
        create: { nama_role: name },
      })
      createdRoles[name] = role
      console.log(`✅ Role ${name} ready.`)
    }

    // ==============================
    // 3. ADMIN USER
    // ==============================
    const adminEmail = 'admin@trackfo.com'

    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
      },
      create: {
        nama: 'Admin TrackFO',
        email: adminEmail,
        password: hashedPassword,
        isActive: true,
      },
    })

    console.log(`👤 ${adminEmail} ready👍.`)

    // Assign role ADMIN
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: createdRoles['ADMIN'].id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: createdRoles['ADMIN'].id,
      },
    })

    // ==============================
    // 4. SAMPLE TEKNISI
    // ==============================
    const teknisiEmail = 'teknisi1@trackfo.com'

    const teknisiUser = await prisma.user.upsert({
      where: { email: teknisiEmail },
      update: {},
      create: {
        nama: 'Teknisi 1',
        email: teknisiEmail,
        password: hashedPassword,
        isActive: true,
      },
    })

    console.log(`👷 Teknisi user ready.`)

    // Assign role TEKNISI
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: teknisiUser.id,
          roleId: createdRoles['TEKNISI'].id,
        },
      },
      update: {},
      create: {
        userId: teknisiUser.id,
        roleId: createdRoles['TEKNISI'].id,
      },
    })

    // ==============================
    // 5. DATA TEKNISI
    // ==============================
    await prisma.dataTeknisi.upsert({
        where: { userId: teknisiUser.id },
        update: {},
        create: {
            userId: teknisiUser.id,
            noHp: '081234567890',
            areaKerja: 'Medan',
            alamat: 'Jl. Sei Padang No.136, Padang Bulan Selayang I, Kec. Medan Selayang, Kota Medan, Sumatera Utara',
            latitude: 3.570481912207179,
            longitude: 98.64903937122816,
            status: 'available',
            lastSeen: new Date(),
        },
    })

    console.log('📍 Data teknisi created.')

    console.log('✨ Seed completed successfully!')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })