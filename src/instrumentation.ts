/**
 * Pings Neon on an interval so the free compute does not suspend.
 * Neon suspends after about five minutes with no connections. This runs for as
 * long as the Node server stays up (`next dev` and `next start`).
 * Set DB_KEEP_ALIVE=false to turn it off.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DB_KEEP_ALIVE === "false") return;

  const intervalMs = Number(process.env.DB_KEEP_ALIVE_INTERVAL_MS || 4 * 60 * 1000);

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
