import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function testQuery() {
  try {
    console.log('=== Testing direct Prisma query ===')
    
    // Test the exact same query as booking service
    const dateFilter = '2026-03-15'
    const mentorId = 212
    
    const whereClause = {
      mentorId,
      status: 'OPEN'
    }

    if (dateFilter) {
      const targetDate = new Date(dateFilter)
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))
      
      console.log('Where clause:', { mentorId, date: dateFilter, startOfDay, endOfDay })
      
      whereClause.startAt = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    console.log('Final where clause:', JSON.stringify(whereClause, null, 2))
    
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

    console.log('Query result:', slots.length, 'slots')
    console.log('Slots:', JSON.stringify(slots, null, 2))
    
  } catch (e) {
    console.log('Query error:', e.message)
    console.log('Stack:', e.stack)
  }
  
  await p.$disconnect()
}

testQuery()
