import type { Metadata } from "next";
import { ContactForm } from "@/components/public/ContactForm";
import { getIdentity } from "@/lib/settings";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Advertise",
  description: "Direct-sold placements on AfroLitPlaylist — monthly or campaign runs, with a clear Advertisement label.",
};

const PLACEMENTS = [
  {
    name: "Sidebar rectangle",
    size: "300 × 250",
    note: "Sits beside the stories for the length of the page. The usual first buy.",
  },
  {
    name: "In-feed native",
    size: "Headline + teaser · optional 240 × 240 thumb",
    note: "Reads as a story card. Limited so the feed stays editorial.",
  },
  {
    name: "Top leaderboard",
    size: "970 × 90 desktop · 320 × 100 phone",
    note: "Seen early. Supply both files — a cropped 970 will not work on phones.",
  },
  {
    name: "Bottom billboard",
    size: "970 × 250 desktop · 320 × 100 phone",
    note: "Large, below the page. Reached by people who finish reading.",
  },
] as const;

export default async function AdvertisePage() {
  const identity = await getIdentity();

  return (
    <div className="wrap py-8">
      <div className="mx-auto max-w-[760px]">
        <h1 className="text-[clamp(28px,4vw,44px)] font-black">Advertise on {identity.name}</h1>
        <p className="mt-4 text-[19px] leading-relaxed">
          Placements are sold by the month, or for a short run around a release or a show. You buy a
          defined space for a defined time — not a promise of impressions.
        </p>

        <h2 className="mb-4 mt-10 text-2xl font-extrabold">The four positions</h2>
        <div className="space-y-3">
          {PLACEMENTS.map((p) => (
            <div key={p.name} className="rounded-xl bg-(--card-bg) p-5">
              <h3 className="text-[17px] font-bold">{p.name}</h3>
              <p className="mt-1 text-sm font-semibold text-(--primary)">{p.size}</p>
              <p className="mt-2 text-sm leading-relaxed text-(--sub-text)">{p.note}</p>
            </div>
          ))}
        </div>

        <h2 className="mb-3 mt-10 text-2xl font-extrabold">What a campaign includes</h2>
        <div className="space-y-4 leading-[1.8] text-(--sub-text)">
          <p>
            Monthly is the default and renews cleanly. A two- or three-week campaign run fits a release
            date or an event. Exclusive means yours is the only creative in that slot; shared means
            rotation with one other at a lower rate.
          </p>
          <p>
            The stronger buy is a package: a placement plus a labelled sponsored story and a mention in
            one newsletter send. Ask if you want that written up.
          </p>
        </div>

        <h2 className="mb-3 mt-10 text-2xl font-extrabold">Creative spec</h2>
        <ul className="list-disc space-y-2 pl-5 leading-[1.8] text-(--sub-text)">
          <li>Exact pixel size for the slot you booked. Spell it out in the file name if you can.</li>
          <li>A separate 320 × 100 for phones on the two leaderboards. Do not send a cropped 970.</li>
          <li>JPG, PNG or GIF, under 150 KB. No auto-playing audio or video.</li>
          <li>A full https:// click URL, including any tracking parameters you use.</li>
          <li>Start and end dates. Native units also need a headline and one teaser line.</li>
        </ul>
        <p className="mt-4 leading-[1.8] text-(--sub-text)">
          Every unit runs with a clear Advertisement or Sponsored label. We send impressions and clicks
          at the end of the campaign — only for your creative, and only when it was actually on screen.
        </p>

        <h2 className="mb-3 mt-10 text-2xl font-extrabold">Get in touch</h2>
        <p className="mb-6 leading-[1.8] text-(--sub-text)">
          Tell us which placement, the dates, and we will reply with rates. First campaigns are paid
          before they go live.
        </p>
        <ContactForm
          defaultSubject="Advertising enquiry"
          kind="advertising"
          bodyPlaceholder="Placement, dates, and a line about the campaign."
        />
      </div>
    </div>
  );
}
