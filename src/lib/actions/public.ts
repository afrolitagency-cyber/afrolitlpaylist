"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { commentInput, subscribeInput } from "@/lib/validation";
import { sendNewsletterConfirm } from "@/lib/services/email";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";
import { runAction, type ActionState } from "./_result";

const hash = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

export async function submitComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const data = commentInput.parse({
      postId: formData.get("postId"),
      name: formData.get("name"),
      email: formData.get("email"),
      body: formData.get("body"),
      website: formData.get("website") ?? "", // honeypot
    });

    // A filled honeypot is a bot. Report success so it doesn't learn anything.
    if (data.website) return { ok: true, message: "Thanks — your comment is awaiting approval." };

    const limit = await rateLimit(`comment:${hash(data.email)}`, LIMITS.comment.max, LIMITS.comment.windowSec);
    if (!limit.ok) {
      return { ok: false, error: "That's a lot of comments at once. Try again shortly." };
    }

    const post = await prisma.post.findUnique({
      where: { id: data.postId },
      select: { id: true, commentsOn: true, status: true },
    });
    if (!post || post.status !== "PUBLISHED") return { ok: false, error: "That post isn't available." };
    if (!post.commentsOn) return { ok: false, error: "Comments are closed on this post." };

    await prisma.comment.create({
      data: {
        postId: post.id,
        name: data.name,
        email: data.email,
        body: data.body,
        status: "PENDING", // moderated: nothing appears until an editor approves
        ipHash: hash(data.email),
      },
    });

    void track({ name: "comment_submit", entityId: post.id, path: `/blog` });
    return { ok: true, message: "Thanks — your comment is awaiting approval." };
  });
}

export async function subscribe(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const data = subscribeInput.parse({
      email: formData.get("email"),
      tags: [],
      website: formData.get("website") ?? "",
    });
    if (data.website) return { ok: true, message: "Almost there — check your inbox to confirm." };

    const email = data.email.toLowerCase().trim();
    const limit = await rateLimit(`sub:${hash(email)}`, LIMITS.subscribe.max, LIMITS.subscribe.windowSec);
    if (!limit.ok) {
      return { ok: false, error: "We've already sent that a few times. Check your inbox." };
    }

    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing?.status === "CONFIRMED") {
      // don't reveal list membership — same message either way
      return { ok: true, message: "Almost there — check your inbox to confirm." };
    }

    const raw = crypto.randomBytes(32).toString("base64url");
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, status: "PENDING", tokenHash: hash(raw) },
      update: { status: "PENDING", tokenHash: hash(raw) },
    });

    await sendNewsletterConfirm(email, raw);
    void track({ name: "newsletter_subscribe" });
    return { ok: true, message: "Almost there — check your inbox to confirm." };
  });
}

export async function sendContactMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const honeypot = String(formData.get("website") ?? "");

    if (honeypot) return { ok: true, message: "Thanks — we'll be in touch." };
    if (!name || !email || body.length < 10) {
      return { ok: false, error: "Please add your name, email and a short message." };
    }
    const limit = await rateLimit(`contact:${hash(email)}`, LIMITS.contact.max, LIMITS.contact.windowSec);
    if (!limit.ok) {
      return { ok: false, error: "We've got your earlier message. We'll reply soon." };
    }

    await prisma.contactMessage.create({
      data: { name, email, subject: subject || null, body, kind: "general", status: "NEW" },
    });
    revalidatePath("/admin/inbox");
    void track({ name: "contact_submit", path: "/contact" });
    return { ok: true, message: "Thanks — we'll be in touch." };
  });
}
