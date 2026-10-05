/**
 * The post body is BlockNote block JSON. These types describe only what the
 * renderer needs — treating the stored JSON as untrusted shape, since old posts
 * may predate any block added later.
 */
export type InlineContent = { type?: string; text?: string; href?: string; content?: InlineContent[] };

export type Block = {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: InlineContent[] | string;
  children?: Block[];
};

export function isBlockArray(value: unknown): value is Block[] {
  return Array.isArray(value);
}

/** Flattens BlockNote inline content to plain text (links keep their label). */
export function inlineText(content: Block["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((c) => (typeof c.text === "string" ? c.text : inlineText(c.content ?? [])))
    .join("");
}

export function prop(block: Block, key: string): string {
  const value = block.props?.[key];
  return typeof value === "string" ? value : "";
}

/** First ~160 characters of real prose — used for excerpts and meta fallbacks. */
export function plainSummary(body: unknown, max = 160): string {
  if (!isBlockArray(body)) return "";
  const text = body
    .filter((b) => b.type === "paragraph")
    .map((b) => inlineText(b.content))
    .join(" ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
