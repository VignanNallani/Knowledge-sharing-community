import getPrisma from './src/config/prisma.js';

async function checkSlots() {
  try {
    const prisma = getPrisma();
    const count = await prisma.slot.count();
    console.log('Total slots:', count);
    
    // Also check mentorSlot table
    const mentorSlotCount = await prisma.mentorSlot.count();
    console.log('Total mentorSlots:', mentorSlotCount);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSlots();
