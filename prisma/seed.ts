import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  "World", "United States", "Politics", "Business", "Economy", "Financial Markets",
  "AI", "Technology", "Startups", "Science", "Energy", "Climate", "Healthcare",
  "Education", "Sports", "Gaming", "Entertainment", "Travel", "Cybersecurity", "Space",
];

const sourceSeeds = [
  { name: "BBC World", rssUrl: "https://feeds.bbci.co.uk/news/world/rss.xml", websiteUrl: "https://www.bbc.com/news/world", category: "World", country: "GB", reliability: 0.9 },
  { name: "NPR News", rssUrl: "https://feeds.npr.org/1001/rss.xml", websiteUrl: "https://www.npr.org/sections/news/", category: "United States", country: "US", reliability: 0.9 },
  { name: "BBC Business", rssUrl: "https://feeds.bbci.co.uk/news/business/rss.xml", websiteUrl: "https://www.bbc.com/news/business", category: "Business", country: "GB", reliability: 0.9 },
  { name: "The Wall Street Journal Markets", rssUrl: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", websiteUrl: "https://www.wsj.com/news/markets", category: "Financial Markets", country: "US", reliability: 0.88 },
  { name: "The Verge", rssUrl: "https://www.theverge.com/rss/index.xml", websiteUrl: "https://www.theverge.com/", category: "Technology", country: "US", reliability: 0.82 },
  { name: "TechCrunch", rssUrl: "https://techcrunch.com/feed/", websiteUrl: "https://techcrunch.com/", category: "Startups", country: "US", reliability: 0.8 },
  { name: "Ars Technica", rssUrl: "https://feeds.arstechnica.com/arstechnica/index", websiteUrl: "https://arstechnica.com/", category: "Technology", country: "US", reliability: 0.86 },
  { name: "NASA Breaking News", rssUrl: "https://www.nasa.gov/rss/dyn/breaking_news.rss", websiteUrl: "https://www.nasa.gov/news/", category: "Space", country: "US", reliability: 0.92 },
];

async function main() {
  const categoryMap = new Map<string, string>();
  for (const [sortOrder, name] of categories.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      update: { name, sortOrder },
      create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), sortOrder, description: `${name} news and analysis.` },
    });
    categoryMap.set(name, category.id);
  }

  for (const source of sourceSeeds) {
    const categoryId = categoryMap.get(source.category);
    if (!categoryId) continue;
    await prisma.source.upsert({
      where: { rssUrl: source.rssUrl },
      update: { ...source, category: undefined, categoryId, metadata: { verified: true, kind: "rss" } },
      create: { ...source, category: undefined, categoryId, metadata: { verified: true, kind: "rss" } },
    });
  }

  const user = await prisma.user.upsert({
    where: { email: "demo@news-intelligence.local" },
    update: { name: "Demo Reader" },
    create: { email: "demo@news-intelligence.local", name: "Demo Reader" },
  });
  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      topics: ["AI", "Business", "Economy", "Technology", "Startups", "Financial Markets"],
      countries: ["US", "GB"], companies: [], people: [], keywords: ["interest rates", "semiconductors"], hiddenTopics: ["Entertainment"], sourceIds: [],
    },
  });

  const technology = categoryMap.get("Technology")!;
  const demoSource = await prisma.source.findFirstOrThrow({ where: { name: "The Verge" } });
  const article = await prisma.article.upsert({
    where: { canonicalUrl: "https://demo.news-intelligence.local/ai-infrastructure" },
    update: {},
    create: {
      title: "AI infrastructure becomes a defining technology story",
      canonicalUrl: "https://demo.news-intelligence.local/ai-infrastructure",
      originalUrl: "https://demo.news-intelligence.local/ai-infrastructure",
      sourceId: demoSource.id, categoryId: technology, publishedAt: new Date(),
      description: "A seeded story demonstrates the dashboard before live ingestion.",
      content: "A seeded story demonstrates the dashboard before live ingestion. It includes structured facts, source transparency, and a clear separation between reporting and analysis.",
      extractionMethod: "METADATA_ONLY", contentHash: "demo-ai-infrastructure", language: "en", tags: ["AI", "technology"],
      processingStatus: "SUMMARIZED", metadata: { demo: true },
    },
  });
  const story = await prisma.story.upsert({
    where: { id: "demo-story-ai-infrastructure" },
    update: {},
    create: {
      id: "demo-story-ai-infrastructure", headline: article.title,
      summary: "This seeded story shows how News Intelligence presents a source-grounded briefing while the live RSS pipeline is being configured.",
      whyItMatters: "The example demonstrates the product workflow for readers following technology and AI developments.",
      keyFacts: ["This is seeded demo content.", "Live stories are collected from configured RSS feeds.", "Original source links remain visible on every story."],
      whatHappensNext: "Run the ingestion command after configuring PostgreSQL to replace demo content with live coverage.",
      confidence: "Confirmed", primaryCategoryId: technology, importanceScore: 0.8, relevanceScore: 0.9,
      entities: ["AI"], topics: ["AI", "Technology"], comparison: [], firstReportedAt: new Date(), latestPublishedAt: article.publishedAt,
    },
  });
  await prisma.article.update({ where: { id: article.id }, data: { storyId: story.id } });
  await prisma.storySource.upsert({ where: { storyId_articleId: { storyId: story.id, articleId: article.id } }, update: {}, create: { storyId: story.id, articleId: article.id, sourceId: demoSource.id } });
  console.log(`Seeded ${categories.length} categories, ${sourceSeeds.length} sources, and demo content.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
