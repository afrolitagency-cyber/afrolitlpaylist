import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyMerge } from "@/lib/newsletter-html";
import { freezeCampaignHtml, suggestBlogContent, suggestEventsContent } from "@/lib/newsletter-render";

export const dynamic = "force-dynamic";

function htmlResponse(html: string) {
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex",
    },
  });
}

/** Frozen campaign HTML. Same document as the send, with a generic greeting. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    if (process.env.NODE_ENV !== "production" && (slug === "demo-blog" || slug === "demo-events")) {
      const kind = slug === "demo-events" ? "EVENTS" as const : "BLOG_DIGEST" as const;
      const content = kind === "EVENTS" ? await suggestEventsContent() : await suggestBlogContent();
      const frozen = await freezeCampaignHtml(kind, content, {
        subject: "Demo",
        archiveSlug: slug,
      });
      if (!frozen) return new NextResponse("No published items to preview", { status: 404 });
      const list = kind === "EVENTS" ? "events" : "blog";
      return htmlResponse(applyMerge(frozen.html, { firstName: "there", subscriberId: "archive", list }));
    }

    const campaign = await prisma.campaign.findUnique({ where: { archiveSlug: slug } });
    if (!campaign?.html) return new NextResponse("Not found", { status: 404 });
    if (!["SCHEDULED", "SENDING", "SENT"].includes(campaign.status)) {
      return new NextResponse("Not found", { status: 404 });
    }
    const list = campaign.kind === "BLOG_DIGEST" ? "blog" : campaign.kind === "EVENTS" ? "events" : "all";
    return htmlResponse(applyMerge(campaign.html, { firstName: "there", subscriberId: "archive", list }));
  } catch {
    return new NextResponse("Unavailable", { status: 503 });
  }
}
