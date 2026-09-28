"use client";

import { useState } from "react";

export function BookmarkButton({ storyId }: { storyId: string }) {
  const [saved, setSaved] = useState(false);
  return <button className="icon-button" title="Save story" onClick={async () => { const response = await fetch("/api/bookmarks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ storyId }) }); if (response.ok) setSaved((value) => !value); }}>{saved ? "★" : "☆"}</button>;
}
