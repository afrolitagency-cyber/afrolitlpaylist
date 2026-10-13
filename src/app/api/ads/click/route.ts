import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.redirect(new URL("/", req.url));

  const creative = await prisma.adCreative.findUnique({
    where: { id },
    select: { clickUrl: true },
  });

  if (!creative?.clickUrl || !/^https:\/\//i.test(creative.clickUrl)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const day = new Date(new Date().toISOString().slice(0, 10));
  await prisma
    .$transaction([
      prisma.adCreative.update({ where: { id }, data: { clicks: { increment: 1 } } }),
      prisma.adStatDaily.upsert({
        where: { creativeId_day: { creativeId: id, day } },
        create: { creativeId: id, day, clicks: 1 },
        update: { clicks: { increment: 1 } },
      }),
    ])
    .catch(() => {
      /* never block the click on a counting failure */
    });

  return NextResponse.redirect(creative.clickUrl, 302);
}
