/** Closed list artists pick from. Stored on Artist.genre, joined with " · ". */
export const GENRES = [
  "Afrobeats",
  "Amapiano",
  "Afro House",
  "Afro-Fusion",
  "Afro-Soul",
  "Alté",
  "Highlife",
  "Fuji",
  "Jùjú",
  "Gospel",
  "Hip-Hop",
  "R&B",
  "Drill",
  "Street Pop",
  "Dancehall",
  "Reggae",
  "Traditional",
] as const;

export type Genre = (typeof GENRES)[number];

const byLower = new Map<string, Genre>(GENRES.map((genre) => [genre.toLowerCase(), genre]));

export function canonicalGenre(value: string): Genre | null {
  return byLower.get(value.trim().toLowerCase()) ?? null;
}

/** Keeps catalog order and drops anything that is not on the list. */
export function parseGenres(value: string | null | undefined): Genre[] {
  if (!value) return [];
  const picked = new Set<Genre>();
  for (const part of value.split("·")) {
    const genre = canonicalGenre(part);
    if (genre) picked.add(genre);
  }
  return GENRES.filter((genre) => picked.has(genre));
}

export function joinGenres(values: string[]): string | null {
  const picked = new Set<Genre>();
  for (const value of values) {
    const genre = canonicalGenre(value);
    if (genre) picked.add(genre);
  }
  const ordered = GENRES.filter((genre) => picked.has(genre));
  return ordered.length ? ordered.join(" · ") : null;
}
