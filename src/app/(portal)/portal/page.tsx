import Link from "next/link";
import { currentArtist } from "@/lib/actions/portal";
import { StatusPill } from "@/components/admin/Shell";

export const dynamic = "force-dynamic";

const EXPLAIN: Record<string, string> = {
  DRAFT: "Your profile isn't live yet. Finish it and submit for review.",
  PENDING: "Submitted. An editor will review it shortly.",
  CHANGES_REQUESTED: "An editor asked for changes before this can go live.",
  LIVE: "Your profile is live on the site.",
  REJECTED: "This submission was rejected. Contact the team if you think that's wrong.",
};

export default async function PortalHome() {
  const artist = await currentArtist();

  if (!artist) {
    return (
      <div className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-6">
        <h1 className="text-xl font-bold">No artist profile linked</h1>
        <p className="mt-2 text-sm text-(--sub-text)">
          This account isn&apos;t attached to an artist yet. Ask the AfroLitPlaylist team to send a fresh invite.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black">{artist.name}</h1>
        <StatusPill status={artist.status} />
      </div>

      <p className="mb-6 text-sm text-(--sub-text)">{EXPLAIN[artist.status]}</p>

      {artist.reviewNote ? (
        <div className="mb-6 rounded-r border-l-[3px] border-amber-500 bg-(--surface-alt) p-4">
          <b className="text-sm">What the editor asked for</b>
          <p className="mt-1 text-sm text-(--sub-text)">{artist.reviewNote}</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/portal/profile" className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5 hover:border-(--primary)">
          <b className="block">Edit profile</b>
          <span className="mt-1 block text-sm text-(--sub-text)">
            Photo, bio, music and links. Changes go to an editor before they appear.
          </span>
        </Link>
        <Link href="/portal/discography" className="rounded-xl border border-(--border-strong) bg-(--card-bg) p-5 hover:border-(--primary)">
          <b className="block">Edit discography</b>
          <span className="mt-1 block text-sm text-(--sub-text)">
            Releases and tracks. These publish immediately — no review.
          </span>
        </Link>
      </div>
    </>
  );
}
