import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  const slots = await p.$queryRaw`SELECT * FROM "Slot" LIMIT 3` 
  console.log('Slot table exists:')
  console.log(JSON.stringify(slots, null, 2))
} catch (e) {
  console.log('Slot table error:', e.message)
  try {
    const slots = await p.$queryRaw`SELECT * FROM "slots" LIMIT 3` 
    console.log('slots table exists:')
    console.log(JSON.stringify(slots, null, 2))
  } catch (e2) {
    console.log('slots table error:', e2.message)
  }
}

await p.$disconnect()
