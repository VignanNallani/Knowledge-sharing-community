import { PrismaClient } from '@prisma/client'

// Simulate the API query
const p = new PrismaClient()

try {
  const mentorId = 212
  const dateFilter = '2026-03-15' // tomorrow
  
  const whereClause = {
    mentorId,
    status: 'OPEN'
  }

  // Filter by specific date if provided
  if (dateFilter) {
    const targetDate = new Date(dateFilter)
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))
    
    whereClause.startAt = {
      gte: startOfDay,
      lte: endOfDay
    }
  }

  console.log('Where clause:', JSON.stringify(whereClause, null, 2))
  
  const slots = await p.slot.findMany({
    where: whereClause,
    include: {
      mentor: {
        select: {
          id: true,
          name: true,
          email: true,
          bio: true,
          skills: true
        }
      }
    },
    orderBy: {
      startAt: 'asc'
    }
  })

  console.log('Found slots:', slots.length)
  console.log(JSON.stringify(slots, null, 2))
} catch (e) {
  console.log('Error:', e.message)
}

await p.$disconnect()
