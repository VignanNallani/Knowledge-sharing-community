import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  const slots = await p.$queryRaw`SELECT DISTINCT "mentorId" FROM "slots" ORDER BY "mentorId"` 
  console.log('Mentor IDs with slots:')
  console.log(JSON.stringify(slots, null, 2))
} catch (e) {
  console.log('Error:', e.message)
}

await p.$disconnect()
