import Link from "next/link";
import Image from "next/image";

/** Music-specific blocks. Each takes the props a BlockNote custom node stores,
 *  so the editor and the renderer stay in step. */

export function AudioPlayerBlock({ src, title, artist }: { src: string; title?: string; artist?: string }) {
  if (!src) return null;
  return (
    <figure className="my-6 rounded-xl bg-(--card-bg) p-4">
      {title ? (
        <figcaption className="mb-3">
          <b className="block text-sm">{title}</b>
          {artist ? <span className="text-xs text-(--sub-text)">{artist}</span> : null}
        </figcaption>
      ) : null}
      <audio controls preload="none" src={src} className="w-full">
        <track kind="captions" />
      </audio>
    </figure>
  );
}

export function ReleaseBlock({
  title, artist, artistSlug, coverArt, type, year, streamUrl,
}: {
  title: string; artist?: string; artistSlug?: string; coverArt?: string;
  type?: string; year?: string; streamUrl?: string;
}) {
  return (
    <div className="my-6 flex flex-wrap items-center gap-4 rounded-xl bg-(--card-bg) p-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-(--surface)">
        {coverArt ? <Image src={coverArt} alt="" fill sizes="80px" className="object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        {type ? <span className="text-[10.5px] font-extrabold uppercase text-(--primary)">{type}</span> : null}
        <h4 className="text-base font-bold">{title}</h4>
        <p className="text-sm text-(--sub-text)">
          {artistSlug && artist ? (
            <Link href={`/artists/${artistSlug}`} className="hover:text-(--primary)">{artist}</Link>
          ) : (
            artist
          )}
          {year ? ` · ${year}` : ""}
        </p>
      </div>
      {streamUrl ? (
        <a href={streamUrl} target="_blank" rel="noopener noreferrer"
          className="rounded bg-(--primary) px-4 py-2 text-sm font-semibold text-white">
          Listen
        </a>
      ) : null}
    </div>
  );
}

export function TracklistBlock({ tracks }: { tracks: { title: string; duration?: string }[] }) {
  if (tracks.length === 0) return null;
  return (
    <ol className="my-6 overflow-hidden rounded-xl bg-(--card-bg)">
      {tracks.map((t, i) => (
        <li key={`${t.title}-${i}`} className="flex items-center gap-4 border-b border-(--border-strong) px-4 py-3 last:border-0">
          <span className="w-6 text-sm font-bold text-(--sub-text)">{i + 1}</span>
          <span className="min-w-0 flex-1 text-sm">{t.title}</span>
          {t.duration ? <span className="text-xs text-(--sub-text)">{t.duration}</span> : null}
        </li>
      ))}
    </ol>
  );
}

const SERVICE_STYLE: Record<string, string> = {
  spotify: "bg-[#1DB954] text-black",
  apple: "bg-[#FA243C] text-white",
  youtube: "bg-[#FF0000] text-white",
  audiomack: "bg-[#FFA200] text-black",
  soundcloud: "bg-[#FF5500] text-white",
};

export function StreamingLinksBlock({ links }: { links: { service: string; url: string }[] }) {
  if (links.length === 0) return null;
  return (
    <div className="my-6 flex flex-wrap gap-2.5">
      {links.map((l) => (
        <a key={l.service} href={l.url} target="_blank" rel="noopener noreferrer"
          className={`rounded-full px-4 py-2 text-[13px] font-bold capitalize ${SERVICE_STYLE[l.service] ?? "bg-(--card-bg) text-(--body-text)"}`}>
          {l.service}
        </a>
      ))}
    </div>
  );
}

export function ArtistMentionBlock({ name, slug, avatar }: { name: string; slug: string; avatar?: string }) {
  return (
    <Link href={`/artists/${slug}`} className="my-6 flex items-center gap-3.5 rounded-xl bg-(--card-bg) p-4 hover:text-(--primary)">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-(--surface)">
        {avatar ? <Image src={avatar} alt="" fill sizes="48px" className="object-cover" /> : null}
      </div>
      <div>
        <span className="text-[11px] font-bold uppercase text-(--primary)">Artist</span>
        <b className="block text-sm">{name}</b>
      </div>
    </Link>
  );
}
