"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRoleFresh, can } from "@/lib/rbac";
import { parseContactText, upsertSubscribers } from "@/lib/newsletter-subscribe";
import { runAction, type ActionState } from "./_result";

function refresh() {
  revalidatePath("/admin/newsletter");
  revalidatePath("/admin/newsletter/list");
  revalidatePath("/admin/inbox");
}

function tagsFrom(raw: string) {
  return raw.split(/[,;]/).map((t) => t.trim()).filter(Boolean);
}

export async function addSubscriber(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.sendCampaigns);
    const email = z.string().email().parse(String(formData.get("email") ?? "").toLowerCase().trim());
    const firstName = String(formData.get("firstName") ?? "").trim().slice(0, 80) || null;
    const tags = tagsFrom(String(formData.get("tags") ?? ""));
    const confirmed = formData.get("confirmed") === "on";
    const summary = await upsertSubscribers(
      [{ email, firstName, tags }],
      { extraTags: ["manual"], confirmed, resubscribe: formData.get("resubscribe") === "on" },
    );
    refresh();
    if (summary.skipped) return { ok: false, error: "That address was skipped (unsubscribed, bounced, or invalid)." };
    return { ok: true, message: summary.created ? "Subscriber added." : "Subscriber updated." };
  });
}

export async function saveSubscriber(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.sendCampaigns);
    const id = String(formData.get("id") ?? "");
    const firstName = String(formData.get("firstName") ?? "").trim().slice(0, 80) || null;
    const tags = tagsFrom(String(formData.get("tags") ?? ""));
    const wantsBlog = formData.get("wantsBlog") === "on";
    const wantsEvents = formData.get("wantsEvents") === "on";
    const sub = await prisma.newsletterSubscriber.findUnique({ where: { id } });
    if (!sub) return { ok: false, error: "Subscriber not found." };
    if (sub.status === "BOUNCED" || sub.status === "COMPLAINED") {
      return { ok: false, error: "Bounced or complained addresses stay off the list." };
    }
    const status = wantsBlog || wantsEvents ? "CONFIRMED" : "UNSUBSCRIBED";
    await prisma.newsletterSubscriber.update({
      where: { id },
      data: {
        firstName,
        tags,
        wantsBlog,
        wantsEvents,
        status,
        confirmedAt: status === "CONFIRMED" ? (sub.confirmedAt ?? new Date()) : sub.confirmedAt,
      },
    });
    refresh();
    return { ok: true, message: "Saved." };
  });
}

export async function importCsv(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.sendCampaigns);
    const raw = String(formData.get("csv") ?? "");
    const extra = tagsFrom(String(formData.get("tags") ?? ""));
    const rows = parseContactText(raw);
    if (!rows.length) return { ok: false, error: "No email addresses found in that paste." };
    const summary = await upsertSubscribers(rows, {
      extraTags: ["csv", ...extra],
      confirmed: formData.get("confirmed") === "on",
      resubscribe: formData.get("resubscribe") === "on",
    });
    refresh();
    return {
      ok: true,
      message: `Import done. Added ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}. Google Contacts CSV works — paste the file contents.`,
    };
  });
}

export async function importInbox(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.sendCampaigns);
    const messages = await prisma.contactMessage.findMany({
      select: { email: true, name: true },
      take: 500,
      orderBy: { createdAt: "desc" },
    });
    const rows = messages.map((m) => ({
      email: m.email,
      firstName: m.name.split(/\s+/)[0] ?? null,
    }));
    const summary = await upsertSubscribers(rows, {
      extraTags: ["inbox"],
      confirmed: formData.get("confirmed") === "on",
      resubscribe: false,
    });
    refresh();
    return {
      ok: true,
      message: `Inbox import: added ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}.`,
    };
  });
}

export async function importResendAudience(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    await requireRoleFresh(...can.sendCampaigns);
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, error: "RESEND_API_KEY is not set." };
    const audienceId = String(formData.get("audienceId") ?? "").trim();
    if (!audienceId) return { ok: false, error: "Paste a Resend audience id." };

    const contacts: { email: string; firstName: string | null }[] = [];
    let after: string | undefined;
    for (let i = 0; i < 20; i++) {
      const url = new URL(`https://api.resend.com/audiences/${encodeURIComponent(audienceId)}/contacts`);
      if (after) url.searchParams.set("after", after);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `Resend said ${res.status}: ${body.slice(0, 180)}` };
      }
      const json = await res.json() as {
        data?: Array<{ email?: string; first_name?: string; id?: string }>;
        has_more?: boolean;
      };
      const page = json.data ?? [];
      for (const c of page) {
        if (c.email) contacts.push({ email: c.email, firstName: c.first_name ?? null });
      }
      if (!json.has_more || !page.length) break;
      after = page[page.length - 1]?.id;
    }

    const summary = await upsertSubscribers(contacts, {
      extraTags: ["resend"],
      confirmed: formData.get("confirmed") === "on",
      resubscribe: false,
    });
    refresh();
    return {
      ok: true,
      message: `Resend import: added ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}.`,
    };
  });
}
