/**
 * Pings Neon every 15 minutes while this Node process stays up
 * (`next dev` and `next start`). Set DB_KEEP_ALIVE=false to turn it off.
 *
 * Neon free suspends after 5 minutes with no queries, so the compute sleeps
 * between these pings and wakes on the next one. Vercel Hobby can only run a
 * cron once a day, so this interval is what runs on the free plan.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DB_KEEP_ALIVE === "false") return;

  const intervalMs = Number(process.env.DB_KEEP_ALIVE_INTERVAL_MS || 15 * 60 * 1000);

  const ping = async () => {
    const { prisma } = await import("@/lib/prisma");
    let last: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        console.log("[keep-alive] database ok");
        return;
      } catch (err) {
        last = err;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 8000));
      }
    }
    console.warn("[keep-alive] failed:", last instanceof Error ? last.message : last);
  };

  await ping();
  setInterval(() => {
    void ping();
  }, intervalMs);
  console.log(`[keep-alive] pinging the database every ${Math.round(intervalMs / 1000)}s`);
}
