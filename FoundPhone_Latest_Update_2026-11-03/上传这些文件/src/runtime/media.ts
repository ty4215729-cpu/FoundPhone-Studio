import { safeMedia, type Work } from "../schema";
export type MediaPool = Record<string, string>;
function mapStrings(value: unknown, map: (text: string) => string): unknown {
  if (typeof value === "string") return map(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, map));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, mapStrings(v, map)]),
    );
  return value;
}
/** Deduplicate only packaged media; the authored story and Work schema stay intact. */
export function compactRuntimeMedia(work: Work): {
  work: Work;
  media: MediaPool;
} {
  const media: MediaPool = {};
  const ids = new Map<string, string>();
  const compact = mapStrings(work, (text) => {
    if (!safeMedia(text)) return text;
    let id = ids.get(text);
    if (!id) {
      id = "asset:media-" + ids.size;
      ids.set(text, id);
      media[id] = text;
    }
    return id;
  }) as Work;
  return { work: compact, media };
}
export function hydrateRuntimeMedia(work: Work, media: MediaPool): Work {
  return mapStrings(work, (text) => {
    if (!/^asset:media-\d+$/.test(text)) return text;
    const data = media[text];
    if (!data || !safeMedia(data))
      throw new Error("作品媒体缺失或格式无效：" + text);
    return data;
  }) as Work;
}
