import getPrisma from './src/config/prisma.js';

async function checkModels() {
  try {
    const prisma = getPrisma();
    
    console.log('=== SLOT MODEL ===');
    const slot = await prisma.slot.findFirst();
    if (slot) {
      console.log('SLOT FIELDS:', JSON.stringify(slot, null, 2));
    } else {
      console.log('No slots found');
    }
    
    console.log('\n=== BOOKING MODEL ===');
    const booking = await prisma.booking.findFirst();
    if (booking) {
      console.log('BOOKING FIELDS:', JSON.stringify(booking, null, 2));
    } else {
      console.log('No bookings found');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkModels();
