import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

const hash = await bcrypt.hash('Test1234', 10);
await prisma.user.updateMany({
  data: { password: hash }
});
console.log('Done! All passwords set to Test1234');
await prisma.$disconnect();
