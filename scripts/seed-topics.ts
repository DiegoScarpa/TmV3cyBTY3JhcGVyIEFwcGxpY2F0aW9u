import { db } from "@/src/lib/db";
import { EMPTY_ANALYSIS } from "@/src/lib/analysis";
import { DEFAULT_CATEGORIES, slugifyCategory } from "@/src/lib/news/categories";
import { extractLocalTopics } from "@/src/lib/news/classify";
import { TOPIC_GROUPS } from "@/src/lib/news/topic-taxonomy";

async function main() {
  for (const [sortOrder, name] of DEFAULT_CATEGORIES.entries()) {
    await db.category.upsert({ where: { slug: slugifyCategory(name) }, update: { name, sortOrder }, create: { name, slug: slugifyCategory(name), sortOrder, description: `${name} news and analysis.` } });
  }
  for (const [groupIndex, group] of TOPIC_GROUPS.entries()) {
    const parent = await db.topic.upsert({ where: { slug: group.slug }, update: { name: group.name, group: group.name, sortOrder: groupIndex * 100 }, create: { name: group.name, slug: group.slug, group: group.name, sortOrder: groupIndex * 100 } });
    for (const [topicIndex, name] of group.topics.entries()) await db.topic.upsert({ where: { slug: slugifyCategory(name) }, update: { name, group: group.name, parentId: parent.id, sortOrder: groupIndex * 100 + topicIndex }, create: { name, slug: slugifyCategory(name), group: group.name, parentId: parent.id, sortOrder: groupIndex * 100 + topicIndex } });
  }
  const topics = await db.topic.findMany();
  const topicBySlug = new Map(topics.map((topic) => [topic.slug, topic]));
  const aliases: Record<string, string> = { finance: "finance-markets", "financial-markets": "finance-markets", technology: "technology-ai", ai: "technology-ai" };
  const stories = await db.story.findMany({ include: { primaryCategory: true, analysis: true, articles: { select: { title: true, description: true } } } });
  for (const story of stories) {
    const labels = [story.primaryCategory.name, ...extractLocalTopics(story.headline, story.articles[0]?.description ?? "")];
    const matched = [...new Set(labels.map((label) => topicBySlug.get(slugifyCategory(label)) ?? topicBySlug.get(aliases[slugifyCategory(label)] ?? "")))].filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));
    if (matched.length) await db.storyTopic.createMany({ data: matched.map((topic) => ({ storyId: story.id, topicId: topic.id, confidence: 1 })), skipDuplicates: true });
    if (!story.analysis) await db.storyAnalysis.create({ data: { storyId: story.id, whatHappened: story.summary ?? EMPTY_ANALYSIS.whatHappened, directImpact: EMPTY_ANALYSIS.directImpact, indirectImpact: EMPTY_ANALYSIS.indirectImpact, peopleImpact: EMPTY_ANALYSIS.peopleImpact, geographicImpact: EMPTY_ANALYSIS.geographicImpact, assetImpact: EMPTY_ANALYSIS.assetImpact, impactMap: EMPTY_ANALYSIS.impactMap, followTheMoney: EMPTY_ANALYSIS.followTheMoney, supplyChain: EMPTY_ANALYSIS.supplyChain, companyRelationships: EMPTY_ANALYSIS.companyRelationships, entityDetails: EMPTY_ANALYSIS.entityDetails } });
  }
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories, ${topics.length} topics, and backfilled ${stories.length} stories.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
