import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_CATEGORIES = [
  { name: 'Food & Dining', icon: 'utensils', color: '#f97316' },
  { name: 'Transport', icon: 'car', color: '#3b82f6' },
  { name: 'Housing', icon: 'home', color: '#10b981' },
  { name: 'Utilities', icon: 'bolt', color: '#eab308' },
  { name: 'Groceries', icon: 'shopping-cart', color: '#22c55e' },
  { name: 'Health', icon: 'heart-pulse', color: '#ef4444' },
  { name: 'Entertainment', icon: 'film', color: '#a855f7' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#ec4899' },
  { name: 'Travel', icon: 'plane', color: '#06b6d4' },
  { name: 'Other', icon: 'ellipsis', color: '#6b7280' },
];

async function main() {
  for (const cat of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, isSystem: true, userId: null },
    });
    if (!existing) {
      await prisma.category.create({ data: { ...cat, isSystem: true } });
    }
  }
  console.log(`Seeded ${SYSTEM_CATEGORIES.length} system categories.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
