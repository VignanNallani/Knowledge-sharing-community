import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  const slots = await p.$queryRaw`SELECT * FROM "slots" WHERE "mentorId" = 212 LIMIT 5` 
  console.log('Sarah Chen (ID 212) slots:')
  console.log(JSON.stringify(slots, null, 2))
} catch (e) {
  console.log('Error:', e.message)
}

await p.$disconnect()
