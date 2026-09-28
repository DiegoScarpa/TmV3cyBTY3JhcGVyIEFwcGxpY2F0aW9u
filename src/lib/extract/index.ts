import { hashContent } from "@/src/lib/utils";
import { extractDirect, isSufficientContent, type ExtractedArticle } from "./direct";
import { extractWithSmry } from "./smry";

export async function extractArticle(url: string, rssMetadata: ExtractedArticle) {
  try {
    const direct = await extractDirect(url);
    if (isSufficientContent(direct.content)) return { ...rssMetadata, ...direct, extractionMethod: "DIRECT" as const, contentHash: hashContent(direct.content!) };
  } catch {
    // Continue to the public-reader fallback.
  }
  try {
    const smry = await extractWithSmry(url);
    return { ...rssMetadata, ...smry, extractionMethod: "SMRY" as const, contentHash: hashContent(smry.content!) };
  } catch (error) {
    return { ...rssMetadata, extractionMethod: "METADATA_ONLY" as const, extractionError: error instanceof Error ? error.message : "Extraction unavailable" };
  }
}
