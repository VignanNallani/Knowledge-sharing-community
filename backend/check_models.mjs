import getPrisma from './src/config/prisma.js';
const prisma = getPrisma();
console.log('Models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('\$')));
await prisma.$disconnect();
