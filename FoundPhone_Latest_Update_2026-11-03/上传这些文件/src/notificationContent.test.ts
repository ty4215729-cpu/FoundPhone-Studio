import { describe, it, expect } from "vitest";
import story from "../stories/template/story.json";
import { compileStory } from "./story-engine/compiler";
import { notificationContent } from "./notificationContent";
const { work } = compileStory(story);
describe("story notification App identity", () => {
  it("assigns every story notice to KKT or INS", () => {
    for (const node of work.nodes)
      for (const action of node.actions) {
        if (action.type !== "notification") continue;
        const result = notificationContent(
          String(action.value),
          work.apps,
          work.nodes,
        );
        expect(result.appId).toBe(
          String(action.value).startsWith("Instagram：")
            ? "instagram"
            : "kakao",
        );
        expect(result.title).not.toBe("信息");
      }
  });
  for (const [text, app] of [
    ["金善旴：刚出炉的面包过时不候", "kakao"],
    ["李柱延：早安", "kakao"],
    ["李柱延发布了新的 INS", "instagram"],
    ["金善旴：今天留给你的那份卖出去了", "kakao"],
    ["李贤在发送了图片", "kakao"],
    ["金泳勋：今天过得怎么样？", "kakao"],
  ])
    it(`restores App identity for a saved notice: ${text}`, () => {
      expect(notificationContent(text, work.apps, work.nodes)).toEqual({
        appId: app,
        title: app === "kakao" ? "KakaoTalk" : "Instagram",
        body: text,
      });
    });
  it("keeps ordinary untagged messages compatible", () => {
    expect(notificationContent("新通知", work.apps, work.nodes)).toEqual({
      appId: "messages",
      title: "信息",
      body: "新通知",
    });
  });
});
