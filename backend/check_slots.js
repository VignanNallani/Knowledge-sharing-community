const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSlots() {
  try {
    console.log('Checking Sarah Chen slots (mentorId: 212)...');
    
    const slots = await prisma.slot.findMany({ 
      where: { mentorId: 212 },
      orderBy: { startAt: 'asc' }
    });
    
    console.log('Sarah Chen slots found:', slots.length);
    slots.forEach(s => {
      console.log('Slot:', {
        id: s.id,
        startAt: s.startAt,
        endAt: s.endAt,
        status: s.status
      });
    });

    console.log('\nChecking all bookings...');
    const bookings = await prisma.booking.findMany({
      include: { slot: true, mentee: true }
    });
    
    console.log('Total bookings found:', bookings.length);
    bookings.forEach(b => {
      console.log('Booking:', {
        id: b.id,
        menteeId: b.menteeId,
        slotId: b.slotId,
        status: b.status,
        slot: {
          mentorId: b.slot?.mentorId,
          startAt: b.slot?.startAt
        }
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSlots();
