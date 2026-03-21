import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

try {
  // Check actual slot data for Sarah Chen
  const slots = await p.slot.findMany({ 
    where: { mentorId: 212 },
    take: 5,
    select: { id: true, startAt: true, endAt: true, status: true },
    orderBy: { startAt: 'asc' }
  })
  
  console.log('=== ACTUAL SLOT DATA ===')
  console.log(JSON.stringify(slots, null, 2))
  
  // Also check with mentorSlot model name
  try {
    const slots2 = await p.mentorSlot.findMany({ 
      where: { mentorId: 212 },
      take: 3,
      select: { id: true, startAt: true, endAt: true, status: true }
    })
    console.log('=== mentorSlot model ===')
    console.log(JSON.stringify(slots2, null, 2))
  } catch (e) {
    console.log('mentorSlot model error:', e.message)
  }
  
} catch (e) {
  console.log('Error:', e.message)
}

await p.$disconnect()
