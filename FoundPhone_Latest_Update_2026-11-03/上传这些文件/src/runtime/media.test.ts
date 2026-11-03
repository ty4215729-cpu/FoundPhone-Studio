import { describe, it, expect } from "vitest";
import { compactRuntimeMedia, hydrateRuntimeMedia } from "./media";
import { compileStory } from "../story-engine/compiler";
const image = "data:image/png;base64,iVBORw0KGgo=";
const { work } = compileStory({
  scriptVersion: 1,
  id: "media-test",
  title: "媒体",
  phone: { owner: "你", wallpaper: image },
  contacts: [{ id: "friend", name: "好友", avatar: image }],
  content: { photos: [{ id: "photo", title: "图片", media: image }] },
});
describe("packaged media pool", () => {
  it("deduplicates exact bytes and restores the original Work without mutations", () => {
    const before = JSON.stringify(work);
    const compact = compactRuntimeMedia(work);
    expect(Object.keys(compact.media)).toHaveLength(1);
    expect(hydrateRuntimeMedia(compact.work, compact.media)).toEqual(work);
    expect(JSON.stringify(work)).toBe(before);
  });
  it("rejects missing and executable media aliases", () => {
    const c = compactRuntimeMedia(work);
    expect(() => hydrateRuntimeMedia(c.work, {})).toThrow("媒体缺失");
    expect(() =>
      hydrateRuntimeMedia(c.work, { "asset:media-0": "javascript:alert(1)" }),
    ).toThrow("格式无效");
  });
  it("leaves unpooled blank and test works compatible", () => {
    expect(hydrateRuntimeMedia(work, {})).toEqual(work);
  });
});
