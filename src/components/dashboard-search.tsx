"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DashboardSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  return <form className="search-box" onSubmit={(event) => { event.preventDefault(); if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`); }}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stories, sources, people..." aria-label="Search news" /><button className="button primary" type="submit">Search</button></form>;
}
