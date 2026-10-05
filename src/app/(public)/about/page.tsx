import Link from "next/link";
import { getIdentity } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600;
export const metadata = {
  title: "About",
  description: "What AfroLitPlaylist covers and how to reach us.",
};

export default async function AboutPage() {
  const [identity, counts] = await Promise.all([
    getIdentity(),
    Promise.all([
      prisma.artist.count({ where: { status: "LIVE" } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.episode.count({ where: { status: "PUBLISHED" } }),
    ]),
  ]);
  const [artists, posts, episodes] = counts;

  return (
    <div className="wrap py-8">
      <div className="mx-auto max-w-[760px]">
        <h1 className="text-[clamp(28px,4vw,44px)] font-black">About {identity.name}</h1>
        <p className="mt-4 text-[19px] leading-relaxed">{identity.tagline}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Artists featured", value: artists },
            { label: "Stories published", value: posts },
            { label: "Episodes", value: episodes },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-(--card-bg) p-5">
              <div className="text-3xl font-black">{s.value}</div>
              <div className="mt-1 text-sm text-(--sub-text)">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-9 space-y-5 leading-[1.8] text-(--sub-text)">
          <p>
            We cover Afro music as it happens — new releases, the artists behind them, the shows worth
            travelling for, and the conversations that explain where the sound is going.
          </p>
          <p>
            Artists maintain their own profiles and discography here, so what you read comes from the
            people making the music as often as from us.
          </p>
        </div>

        <h2 className="mb-3 mt-9 text-2xl font-extrabold">Work with us</h2>
        <p className="leading-[1.8] text-(--sub-text)">
          Submissions, press enquiries, event listings and advertising all go through one inbox.
        </p>
        <Link href="/contact" className="mt-5 inline-block rounded bg-(--primary) px-5 py-3 text-sm font-semibold text-white">
          Get in touch
        </Link>
      </div>
    </div>
  );
}
