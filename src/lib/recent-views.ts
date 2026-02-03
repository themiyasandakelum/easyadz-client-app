const STORAGE_KEY = "recent-views";
const MAX_ITEMS = 12;

export interface RecentViewItem {
  type: "listing" | "profile";
  id: string;
  title: string;
  image?: string | null;
  subtitle?: string | null;
  href: string;
  viewedAt: number;
}

function getStored(): RecentViewItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setStored(items: RecentViewItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/** Add an item to recent views. Dedupes by type+id and puts most recent first. */
export function addRecentView(item: Omit<RecentViewItem, "viewedAt">) {
  const now = Date.now();
  const stored = getStored();
  const filtered = stored.filter(
    (i) => !(i.type === item.type && i.id === item.id)
  );
  const newItem: RecentViewItem = { ...item, viewedAt: now };
  const combined = [newItem, ...filtered].slice(0, MAX_ITEMS);
  setStored(combined);
}

/** Get recent views, most recent first. */
export function getRecentViews(): RecentViewItem[] {
  return getStored();
}
