import { currentArtist } from "@/lib/actions/portal";
import { ProfileForm, type ProfileValues } from "@/components/portal/ProfileForm";

export const dynamic = "force-dynamic";

type Pending = Partial<Record<keyof ProfileValues, string>>;

export default async function PortalProfile() {
  const artist = await currentArtist();
  if (!artist) return <p className="text-sm text-(--sub-text)">No artist profile linked to this account.</p>;

  // show the pending edits back to the artist, not the stale live values
  const pending = (artist.pendingProfile ?? {}) as Pending;
  const pick = (key: keyof ProfileValues, live: string | null) => pending[key] ?? live ?? "";

  const values: ProfileValues = {
    artistId: artist.id,
    name: pick("name", artist.name),
    genre: pick("genre", artist.genre),
    location: pick("location", artist.location),
    bio: pick("bio", artist.bio),
    coverImage: pick("coverImage", artist.coverImage),
    avatarImage: pick("avatarImage", artist.avatarImage),
    streamEmbedUrl: pick("streamEmbedUrl", artist.streamEmbedUrl),
  };

  return (
    <>
      <h1 className="mb-1 text-2xl font-black">Your profile</h1>
      <p className="mb-6 text-sm text-(--sub-text)">
        Edits are reviewed before they go live. Your discography is separate and publishes immediately.
      </p>
      <ProfileForm values={values} pendingReview={artist.status === "PENDING"} />
    </>
  );
}
