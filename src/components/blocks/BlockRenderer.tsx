import Image from "next/image";
import Link from "next/link";
import { inlineText, isBlockArray, prop, type Block, type InlineContent } from "@/lib/blocks";
import {
  AudioPlayerBlock, ReleaseBlock, TracklistBlock, StreamingLinksBlock, ArtistMentionBlock,
} from "./MusicBlocks";

/** Inline marks (bold, italic, link). Unknown marks degrade to plain text
 *  rather than disappearing — old posts must never render blank. */
function Inline({ content }: { content: Block["content"] }) {
  if (typeof content === "string") return <>{content}</>;
  if (!Array.isArray(content)) return null;

  return (
    <>
      {content.map((node: InlineContent, i) => {
        if (node.type === "link" && node.href) {
          return (
            <a key={i} href={node.href} className="text-(--primary) underline underline-offset-2"
              rel="noopener noreferrer" target={node.href.startsWith("http") ? "_blank" : undefined}>
              {inlineText(node.content ?? [])}
            </a>
          );
        }
        const styles = (node as { styles?: Record<string, boolean> }).styles ?? {};
        let el: React.ReactNode = node.text ?? inlineText(node.content ?? []);
        if (styles.bold) el = <strong>{el}</strong>;
        if (styles.italic) el = <em>{el}</em>;
        if (styles.code) el = <code className="rounded bg-(--surface-alt) px-1.5 py-0.5 text-[0.9em]">{el}</code>;
        return <span key={i}>{el}</span>;
      })}
    </>
  );
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback; // malformed props must not take the page down
  }
}

function One({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const level = Number(block.props?.level ?? 2);
      const Tag = (level === 1 ? "h2" : level === 2 ? "h2" : "h3") as "h2" | "h3";
      return (
        <Tag className={level <= 2 ? "mb-3.5 mt-9 text-2xl font-extrabold" : "mb-3 mt-7 text-xl font-bold"}>
          <Inline content={block.content} />
        </Tag>
      );
    }
    case "bulletListItem":
      return <li className="ml-5 list-disc"><Inline content={block.content} /></li>;
    case "numberedListItem":
      return <li className="ml-5 list-decimal"><Inline content={block.content} /></li>;
    case "quote":
      return (
        <blockquote className="my-7 border-l-[3px] border-(--primary) py-1.5 pl-5 text-[19px] font-semibold leading-snug">
          <Inline content={block.content} />
        </blockquote>
      );
    case "image": {
      const url = prop(block, "url");
      if (!url) return null;
      return (
        <figure className="my-7">
          <Image src={url} alt={prop(block, "name")} width={980} height={560}
            className="h-auto w-full rounded-xl object-cover" />
          {prop(block, "caption") ? (
            <figcaption className="mt-2 text-center text-xs text-(--sub-text)">{prop(block, "caption")}</figcaption>
          ) : null}
        </figure>
      );
    }
    case "audioPlayer":
      return <AudioPlayerBlock src={prop(block, "src")} title={prop(block, "title")} artist={prop(block, "artist")} />;
    case "release":
      return (
        <ReleaseBlock
          title={prop(block, "title")} artist={prop(block, "artist")} artistSlug={prop(block, "artistSlug")}
          coverArt={prop(block, "coverArt")} type={prop(block, "releaseType")} year={prop(block, "year")}
          streamUrl={prop(block, "streamUrl")}
        />
      );
    case "tracklist":
      return <TracklistBlock tracks={parseJson<{ title: string; duration?: string }[]>(prop(block, "tracks"), [])} />;
    case "streamingLinks":
      return <StreamingLinksBlock links={parseJson<{ service: string; url: string }[]>(prop(block, "links"), [])} />;
    case "artistMention":
      return <ArtistMentionBlock name={prop(block, "name")} slug={prop(block, "slug")} avatar={prop(block, "avatar")} />;
    case "embed": {
      const url = prop(block, "url");
      if (!url) return null;
      return (
        <div className="my-7 overflow-hidden rounded-xl">
          <iframe src={url} title="Embedded media" loading="lazy" className="h-[352px] w-full border-0"
            allow="encrypted-media; clipboard-write; picture-in-picture" />
        </div>
      );
    }
    case "paragraph":
    default: {
      const text = inlineText(block.content);
      if (!text.trim()) return null; // skip the empty trailing paragraph BlockNote keeps
      return <p className="mb-5 text-[16.5px] leading-[1.85]"><Inline content={block.content} /></p>;
    }
  }
}

/** Renders stored block JSON. Unknown block types fall through to a paragraph,
 *  so content written by a future editor version still reads. */
export function BlockRenderer({ body }: { body: unknown }) {
  if (!isBlockArray(body) || body.length === 0) return null;

  const out: React.ReactNode[] = [];
  let list: { ordered: boolean; items: Block[] } | null = null;

  const flush = (key: string) => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    out.push(
      <Tag key={key} className="mb-5 space-y-1.5 text-[16.5px] leading-[1.75]">
        {list.items.map((b, i) => <One key={b.id ?? i} block={b} />)}
      </Tag>,
    );
    list = null;
  };

  body.forEach((block, i) => {
    const ordered = block.type === "numberedListItem";
    const bullet = block.type === "bulletListItem";

    if (ordered || bullet) {
      if (list && list.ordered !== ordered) flush(`list-${i}`);
      list ??= { ordered, items: [] };
      list.items.push(block);
      return;
    }

    flush(`list-${i}`);
    out.push(<One key={block.id ?? i} block={block} />);
  });

  flush("list-end");
  return <>{out}</>;
}
