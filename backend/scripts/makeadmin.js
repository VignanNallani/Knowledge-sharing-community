import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

await prisma.user.update({
  where: { email: 'vignan123@gmail.com' },
  data: { role: 'ADMIN' }
});

console.log('Done! vignan is now ADMIN');
await prisma.$disconnect();
