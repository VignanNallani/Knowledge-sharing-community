import getPrisma from './src/config/prisma.js';

async function testBooking() {
  try {
    const prisma = getPrisma();
    
    // Get first available slot
    const slot = await prisma.slot.findFirst({
      where: { status: 'OPEN' }
    });
    
    if (!slot) {
      console.log('No available slots found');
      return;
    }
    
    console.log('Testing booking with slot:', slot.id);
    
    // Create a test booking
    const booking = await prisma.booking.create({
      data: {
        slotId: slot.id,
        menteeId: 1, // Assuming user ID 1 exists
        topic: 'Test booking',
        status: 'PENDING'
      }
    });
    
    console.log('Test booking created:', booking.id);
    
    // Update slot status
    await prisma.slot.update({
      where: { id: slot.id },
      data: { status: 'BOOKED' }
    });
    
    console.log('Slot status updated to BOOKED');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Test booking error:', error.message);
  }
}

testBooking();
