import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const badSlugs = await p.article.findMany({ where: { slug: { startsWith: '-' } }, select: { slug: true, title: true }, take: 10 });
  console.log('Articles with leading dash slug:', badSlugs.length);
  badSlugs.forEach(a => console.log('  ', a.slug.slice(0, 80), '|', a.title.slice(0, 50)));

  const total = await p.article.count();
  console.log('Total articles:', total);

  const target = await p.article.findFirst({ where: { slug: { contains: 'この本読みました' } } });
  console.log('Target article found:', target ? 'YES' : 'NO');
  if (target) console.log('  slug:', target.slug.slice(0, 80));
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
