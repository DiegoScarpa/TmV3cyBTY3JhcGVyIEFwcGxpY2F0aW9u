export const DEFAULT_CATEGORIES = [
  "World", "United States", "Politics", "Law", "Defense", "Business", "Finance", "Economy", "Financial Markets", "Real Estate",
  "AI", "Technology", "Startups", "Science", "Energy", "Climate", "Healthcare", "Transportation", "Automotive",
  "Education", "Sports", "Gaming", "Entertainment", "Travel", "Food", "Lifestyle", "Cybersecurity", "Space",
];

export const intelligenceAreas = [
  "Business", "Finance", "Financial Markets", "Economy", "Real Estate", "Energy", "Technology", "AI", "World", "United States", "Science", "Healthcare", "Other",
];

export const PRIMARY_NAVIGATION = [
  { label: "Home", href: "/" }, { label: "Business", href: "/search?topic=business" }, { label: "Finance", href: "/search?topic=finance-markets" }, { label: "Markets", href: "/search?topic=stock-market" }, { label: "Economy", href: "/search?topic=economy" }, { label: "Real Estate", href: "/search?topic=real-estate" }, { label: "Energy", href: "/search?topic=energy" }, { label: "Technology", href: "/search?topic=technology" }, { label: "AI", href: "/search?topic=ai" }, { label: "World", href: "/search?topic=world" }, { label: "U.S.", href: "/search?topic=united-states" }, { label: "Science", href: "/search?topic=science" }, { label: "Health", href: "/search?topic=healthcare" }, { label: "Other", href: "/search?topic=other" },
];

export function slugifyCategory(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
