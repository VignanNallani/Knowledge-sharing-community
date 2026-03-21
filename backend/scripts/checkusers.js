import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

const users = await prisma.user.findMany({
  select: { id: true, email: true, role: true, password: true }
});

console.log('Users in database:');
users.forEach(u => {
  console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.role}`);
  console.log(`Password hash: ${u.password?.substring(0,20)}...`);
});

// Test password for each user
for (const user of users) {
  const match = await bcrypt.compare('Password123!', user.password || '');
  console.log(`${user.email} Password123! match: ${match}`);
}

await prisma.$disconnect();
