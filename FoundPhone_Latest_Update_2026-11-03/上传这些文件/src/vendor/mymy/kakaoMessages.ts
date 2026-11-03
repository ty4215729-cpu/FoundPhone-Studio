import { itemSchema, type Item } from "../../schema";

/** Insert saved player messages after the authored message visible when sent. */
export function kakaoMessages(
  items: Item[],
  saved: string[],
  thread: string,
  owner: string,
) {
  const authored = items.filter((i) => i.title === thread);
  const local = saved.flatMap((raw, index) => {
    try {
      const entry: unknown = JSON.parse(raw);
      if (
        !Array.isArray(entry) ||
        ![3, 4].includes(entry.length) ||
        !entry.every((v) => typeof v === "string") ||
        entry[0] !== thread
      )
        return [];
      return [
        itemSchema.parse({
          id: "local-kkt-" + index,
          title: entry[0],
          body: entry[1],
          time: entry[2],
          sender: owner,
          outgoing: true,
          meta: {
            local: "true",
            afterId: entry[3] || "",
            legacy: String(entry.length === 3),
          },
        }),
      ];
    } catch {
      return [];
    }
  });
  const result = [
    ...local.filter((m) => !m.meta.afterId && m.meta.legacy !== "true"),
    ...authored.flatMap((item) => [
      item,
      ...local.filter((m) => m.meta.afterId === item.id),
    ]),
    ...local.filter(
      (m) =>
        m.meta.legacy === "true" ||
        (!!m.meta.afterId && !authored.some((i) => i.id === m.meta.afterId)),
    ),
  ];
  return result.map((item, index) => {
    const previous =
      item.meta.replyToTyped === "true"
        ? result
            .slice(0, index)
            .reverse()
            .find((m) => m.meta.local === "true")
        : undefined;
    return previous ? { ...item, time: previous.time } : item;
  });
}
