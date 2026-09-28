import { PrismaClient } from "@prisma/client";
import { DEFAULT_CATEGORIES } from "../src/lib/news/categories";
import { TOPIC_GROUPS } from "../src/lib/news/topic-taxonomy";
import { INITIAL_SOURCE_SEEDS } from "../src/lib/news/source-seeds";

const prisma = new PrismaClient();

const categories = DEFAULT_CATEGORIES;

const sourceSeeds = INITIAL_SOURCE_SEEDS;

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
      update: { name: source.name, websiteUrl: source.websiteUrl, categoryId, country: source.country, language: source.language ?? "en", reliability: source.reliability, subtopics: source.subtopics ?? [], sourceType: source.sourceType ?? "RSS", preferredExtraction: source.preferredExtraction ?? "DIRECT_OR_SMRY", metadata: { verified: true, kind: "rss" } },
      create: { name: source.name, rssUrl: source.rssUrl, websiteUrl: source.websiteUrl, categoryId, country: source.country, language: source.language ?? "en", reliability: source.reliability, enabled: true, subtopics: source.subtopics ?? [], sourceType: source.sourceType ?? "RSS", preferredExtraction: source.preferredExtraction ?? "DIRECT_OR_SMRY", metadata: { verified: true, kind: "rss" } },
    });
  }

  for (const [groupIndex, group] of TOPIC_GROUPS.entries()) {
    const parent = await prisma.topic.upsert({ where: { slug: group.slug }, update: { name: group.name, group: group.name, sortOrder: groupIndex * 100 }, create: { name: group.name, slug: group.slug, group: group.name, sortOrder: groupIndex * 100 } });
    for (const [topicIndex, name] of group.topics.entries()) {
      await prisma.topic.upsert({ where: { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") }, update: { name, group: group.name, parentId: parent.id, sortOrder: groupIndex * 100 + topicIndex }, create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), group: group.name, parentId: parent.id, sortOrder: groupIndex * 100 + topicIndex } });
    }
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
      topics: ["Business", "Companies", "Mergers & Acquisitions", "Private Equity", "Venture Capital", "Startups", "Economy", "Federal Reserve", "Interest Rates", "Financial Markets", "Real Estate", "Energy", "AI", "Technology"],
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
