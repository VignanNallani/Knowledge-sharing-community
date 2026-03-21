import getPrisma from './src/config/prisma.js';

async function testSlots() {
  try {
    const prisma = getPrisma();
    
    const mentorId = 212;
    const date = '2026-03-16';
    
    console.log('Testing slots query for mentorId:', mentorId, 'date:', date);
    
    const start = new Date(date + 'T00:00:00.000Z');
    const end = new Date(date + 'T23:59:59.999Z');
    
    console.log('Start date:', start.toISOString());
    console.log('End date:', end.toISOString());
    
    // Test 1: All slots for mentor 212
    const allSlots = await prisma.slot.findMany({
      where: { mentorId: mentorId },
      select: { id: true, startAt: true, status: true }
    });
    console.log('All slots for mentor 212:', allSlots.length);
    
    // Test 2: Open slots for mentor 212
    const openSlots = await prisma.slot.findMany({
      where: { mentorId: mentorId, status: 'OPEN' },
      select: { id: true, startAt: true, status: true }
    });
    console.log('Open slots for mentor 212:', openSlots.length);
    
    // Test 3: Slots for specific date
    const dateSlots = await prisma.slot.findMany({
      where: {
        mentorId: mentorId,
        status: 'OPEN',
        startAt: { gte: start, lte: end }
      },
      select: { id: true, startAt: true, status: true }
    });
    console.log('Date slots for mentor 212 on', date, ':', dateSlots.length);
    
    if (dateSlots.length > 0) {
      console.log('First slot:', dateSlots[0]);
    } else {
      console.log('No slots found for date. Checking slot dates...');
      const sampleSlots = await prisma.slot.findMany({
        where: { mentorId: mentorId },
        select: { id: true, startAt: true, status: true },
        orderBy: { startAt: 'asc' },
        take: 5
      });
      console.log('Sample slot dates:', sampleSlots.map(s => ({ id: s.id, startAt: s.startAt, status: s.status })));
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Test slots error:', error.message);
  }
}

testSlots();
