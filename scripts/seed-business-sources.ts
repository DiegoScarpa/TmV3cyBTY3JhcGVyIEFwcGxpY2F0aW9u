import { db } from "@/src/lib/db";
import { DEFAULT_CATEGORIES, slugifyCategory } from "@/src/lib/news/categories";
import { INITIAL_SOURCE_SEEDS } from "@/src/lib/news/source-seeds";

async function main() {
  const categories = new Map<string, string>();
  for (const [sortOrder, name] of DEFAULT_CATEGORIES.entries()) {
    const category = await db.category.upsert({ where: { slug: slugifyCategory(name) }, update: { name, sortOrder }, create: { name, slug: slugifyCategory(name), sortOrder, description: `${name} news and analysis.` } });
    categories.set(name, category.id);
  }
  for (const source of INITIAL_SOURCE_SEEDS) {
    const categoryId = categories.get(source.category);
    if (!categoryId) continue;
    await db.source.upsert({ where: { rssUrl: source.rssUrl }, update: { name: source.name, websiteUrl: source.websiteUrl, categoryId, country: source.country, reliability: source.reliability, metadata: { verified: true, kind: "rss" } }, create: { name: source.name, rssUrl: source.rssUrl, websiteUrl: source.websiteUrl, categoryId, country: source.country, language: "en", reliability: source.reliability, enabled: true, metadata: { verified: true, kind: "rss" } } });
  }
  console.log(`Configured ${INITIAL_SOURCE_SEEDS.length} verified RSS sources.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
