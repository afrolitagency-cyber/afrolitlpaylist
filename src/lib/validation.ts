import { z } from "zod";

export const slug = z
  .string()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase words separated by hyphens");

export const postInput = z.object({
  title: z.string().min(3).max(200),
  slug,
  excerpt: z.string().max(400).optional().nullable(),
  body: z.any().optional(),
  coverImage: z.string().url().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  artistId: z.string().cuid().optional().nullable(),
  tags: z.array(z.string().max(40)).max(12).default([]),
  status: z.enum(["DRAFT", "PENDING", "SCHEDULED", "PUBLISHED", "ARCHIVED"]),
  publishedAt: z.coerce.date().optional().nullable(),
  featured: z.boolean().default(false),
  commentsOn: z.boolean().default(true),
});

export const artistProfileInput = z.object({
  name: z.string().min(1).max(120),
  genre: z.string().max(400).optional().nullable(),
  location: z.string().max(120).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  avatarImage: z.string().url().optional().nullable(),
  streamEmbedUrl: z.string().url().optional().nullable(),
  socials: z.record(z.string(), z.string().url()).optional(),
});

export const reviewDecisionInput = z
  .object({
    artistId: z.string().cuid(),
    decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
    note: z.string().max(2000).optional(),
  })
  .refine((v) => v.decision !== "CHANGES_REQUESTED" || !!v.note?.trim(), {
    message: "A note is required when requesting changes",
    path: ["note"],
  });

export const eventInput = z.object({
  title: z.string().min(3).max(200),
  slug,
  description: z.string().max(5000).optional().nullable(),
  startsAt: z.coerce.date(),
  doorsAt: z.coerce.date().optional().nullable(),
  timezone: z.string().default("Africa/Lagos"),
  venue: z.string().max(200).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  seriesId: z.string().cuid().optional().nullable(),
  lineupArtistIds: z.array(z.string().cuid()).max(40).default([]),
  registrationOpen: z.boolean().default(false),
  registrationUrl: z.string().url().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  soldOut: z.boolean().default(false),
  status: z.enum(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]),
  coverImage: z.string().url().optional().nullable(),
});

const httpsUrl = z.string().url().max(2000).refine((u) => u.startsWith("https://"), "Use an https:// link");

export const albumInput = z.object({
  title: z.string().min(1).max(200),
  artistName: z.string().min(1).max(160),
  artistId: z.string().cuid().optional().nullable(),
  releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
  genre: z.string().max(80).optional().nullable(),
  summary: z.string().max(240).optional().nullable(),
  about: z.string().max(8000).optional().nullable(),
  tracks: z.array(z.string().min(1).max(200)).max(60).default([]),
  coverImage: z.string().url().optional().nullable(),
  links: z.record(z.string(), httpsUrl).default({}),
  rank: z.number().int().min(1).max(999),
  movement: z.number().int().min(-99).max(99).default(0),
  published: z.boolean().default(false),
});

export const commentInput = z.object({
  postId: z.string().cuid(),
  name: z.string().min(1).max(80),
  email: z.string().email(),
  body: z.string().min(2).max(4000),
  website: z.string().max(0).optional(), // honeypot: real users leave it empty
});

export const subscribeInput = z.object({
  email: z.string().email(),
  tags: z.array(z.string().max(40)).max(8).default([]),
  website: z.string().max(0).optional(), // honeypot
});
