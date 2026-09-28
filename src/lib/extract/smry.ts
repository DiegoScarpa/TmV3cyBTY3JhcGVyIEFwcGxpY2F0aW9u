import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { normalizeWhitespace } from "@/src/lib/utils";
import type { ExtractedArticle } from "./direct";
import { isSufficientContent } from "./direct";

export function buildSmryReaderUrl(articleUrl: string) {
  return `https://smry.ai/${articleUrl.replace(/^https?:\/\//i, "")}`;
}

export async function extractWithSmry(articleUrl: string): Promise<ExtractedArticle> {
  const response = await fetch(buildSmryReaderUrl(articleUrl), {
    headers: { "user-agent": "NewsIntelligence/1.0 (public reader fallback)", accept: "text/html" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`SMRY fetch failed with ${response.status}`);
  const html = (await response.text()).slice(0, 3_000_000);
  const dom = new JSDOM(html, { url: buildSmryReaderUrl(articleUrl) });
  const parsed = new Readability(dom.window.document).parse();
  const content = parsed?.textContent ? normalizeWhitespace(parsed.textContent) : undefined;
  if (!isSufficientContent(content)) throw new Error("SMRY returned insufficient public content");
  return { title: parsed?.title, description: parsed?.excerpt, content, canonicalUrl: articleUrl };
}
