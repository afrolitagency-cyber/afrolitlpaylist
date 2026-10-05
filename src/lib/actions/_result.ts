import { AuthError } from "@/lib/rbac";
import { ZodError } from "zod";

export type ActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
  | null;

/**
 * Wraps an action so a thrown AuthError or ZodError becomes a form message
 * instead of a 500. Failing closed is the point: an unexpected throw is still
 * a refusal, never an accidental success.
 */
export async function runAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        error: err.code === "UNAUTHENTICATED" ? "Please sign in again." : "You don't have access to do that.",
      };
    }
    if (err instanceof ZodError) {
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors: err.flatten().fieldErrors as Record<string, string[]> };
    }
    console.error("[action]", err);
    return { ok: false, error: "Something went wrong. Nothing was saved." };
  }
}
