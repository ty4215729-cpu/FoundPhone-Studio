import type { Item } from "../../schema";

/** Later publication wins, with engine reveal order breaking equal timestamps. */
export function newestPosts(items: Item[], revealed: string[] = []): Item[] {
  const revealOrder = new Map(revealed.map((id, index) => [id, index]));
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aTime = Date.parse(a.item.time.replace(" ", "T"));
      const bTime = Date.parse(b.item.time.replace(" ", "T"));
      if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime)
        return bTime - aTime;
      const reveal =
        (revealOrder.get(b.item.id) ?? -1) - (revealOrder.get(a.item.id) ?? -1);
      return reveal || b.index - a.index;
    })
    .map(({ item }) => item);
}
export function unreadMessages(items: Item[], readIds: string[] = []): number {
  const read = new Set(readIds);
  return items.filter(
    (item) =>
      !item.outgoing &&
      !item.read &&
      item.meta.local !== "true" &&
      !read.has(item.id),
  ).length;
}
