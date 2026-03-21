import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  const users = await p.$queryRaw`SELECT id, name, email FROM "users" WHERE role = 'MENTOR' ORDER BY id LIMIT 15` 
  console.log('First 15 mentors:')
  console.log(JSON.stringify(users, null, 2))
} catch (e) {
  console.log('users table error:', e.message)
  try {
    const users = await p.$queryRaw`SELECT id, name, email FROM "Users" LIMIT 5` 
    console.log('Users table sample:')
    console.log(JSON.stringify(users, null, 2))
  } catch (e2) {
    console.log('Users table error:', e2.message)
  }
}

await p.$disconnect()
