import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  const mentors = await p.$queryRaw`SELECT id, name, email FROM "User" WHERE role = 'MENTOR' ORDER BY id LIMIT 15` 
  console.log('First 15 mentors:')
  console.log(JSON.stringify(mentors, null, 2))
} catch (e) {
  console.log('Error:', e.message)
}

await p.$disconnect()
