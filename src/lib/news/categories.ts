export const DEFAULT_CATEGORIES = [
  "World", "United States", "Politics", "Business", "Economy", "Financial Markets",
  "AI", "Technology", "Startups", "Science", "Energy", "Climate", "Healthcare",
  "Education", "Sports", "Gaming", "Entertainment", "Travel", "Cybersecurity", "Space",
];

export function slugifyCategory(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
