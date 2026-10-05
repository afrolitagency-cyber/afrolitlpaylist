import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ---- settings: active theme + identity (what the public layout reads)
  await prisma.siteSetting.upsert({
    where: { key: "site.theme" },
    create: { key: "site.theme", value: { key: "editorial" } },
    update: {},
  });
  await prisma.siteSetting.upsert({
    where: { key: "site.identity" },
    create: {
      key: "site.identity",
      value: {
        name: "AfroLit Playlist",
        tagline: "Afro music blog site",
        socials: { instagram: "https://instagram.com/afrolitplaylist" },
      },
    },
    update: {},
  });

  await prisma.siteSetting.upsert({
    where: { key: "site.listen" },
    create: {
      key: "site.listen",
      value: {
        spotify: "https://open.spotify.com/playlist/afrolit-new-music-friday",
        youtube: "https://youtube.com/@afrolitplaylist",
      },
    },
    update: {},
  });

  // ---- first admin
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@afrolitplaylist.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "change-me-now";
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "AfroLit Admin",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: await bcrypt.hash(password, 12),
    },
    update: {},
  });

  // ---- categories
  const categories = ["News", "Music", "Interviews", "Events", "Features"];
  for (const name of categories) {
    const slug = name.toLowerCase();
    await prisma.category.upsert({ where: { slug }, create: { slug, name }, update: {} });
  }

  // ---- AfroQueens Camp series: proves the nav dropdown populates from data
  const camp = await prisma.eventSeries.upsert({
    where: { slug: "afroqueens-camp" },
    create: {
      slug: "afroqueens-camp",
      name: "AfroQueens Camp",
      description: "Recording camp, showcases and the free Music Fest.",
      showInNav: true,
      position: 0,
    },
    update: {},
  });

  await prisma.event.upsert({
    where: { slug: "afroqueens-camp-free-music-fest" },
    create: {
      slug: "afroqueens-camp-free-music-fest",
      title: "AfroQueens Camp — Free Music Fest",
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      venue: "Muri Okunola Park, Lagos",
      country: "Nigeria",
      timezone: "Africa/Lagos",
      status: "PUBLISHED",
      registrationOpen: true,
      seriesId: camp.id,
    },
    update: {},
  });

  console.log(`Seeded. Admin: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
