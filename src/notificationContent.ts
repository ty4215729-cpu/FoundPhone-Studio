import type { Work } from "./schema";

/** Resolve old unprefixed notices against the current author's App-tagged text. */
export function notificationContent(
  text: string,
  apps: Work["apps"],
  nodes: Work["nodes"] = [],
) {
  const parse = (value: string) => {
    const separator = value.search(/[:：]/);
    const sender = separator > 0 ? value.slice(0, separator) : "信息";
    return {
      title: sender,
      body: separator > 0 ? value.slice(separator + 1) : value,
      appId:
        separator > 0 ? apps.find((a) => a.name === sender)?.id : undefined,
    };
  };
  let result = parse(text);
  if (!result.appId) {
    const canonical = nodes
      .flatMap((node) => node.actions)
      .filter((action) => action.type === "notification")
      .map((action) => parse(String(action.value)))
      .find((notice) => notice.appId && notice.body === text);
    if (canonical) result = canonical;
  }
  return { ...result, appId: result.appId ?? "messages" };
}
