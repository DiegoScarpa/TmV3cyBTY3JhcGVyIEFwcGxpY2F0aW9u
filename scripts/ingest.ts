import "dotenv/config";
import { ingestNews } from "@/src/lib/news/ingest";

ingestNews().then((result) => { console.log(JSON.stringify(result, null, 2)); }).catch((error) => { console.error(error); process.exitCode = 1; });
