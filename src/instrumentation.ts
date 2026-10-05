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
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.$queryRaw`SELECT 1`;
      console.log("[keep-alive] database ok");
    } catch (err) {
      console.warn("[keep-alive] failed:", err instanceof Error ? err.message : err);
    }
  };

  await ping();
  setInterval(() => {
    void ping();
  }, intervalMs);
  console.log(`[keep-alive] pinging the database every ${Math.round(intervalMs / 1000)}s`);
}
