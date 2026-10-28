"use client";

import { useActionState, useState } from "react";
import { inviteUser, updateUser } from "@/lib/actions/users";
import type { ActionState } from "@/lib/actions/_result";

export type UserRow = {
  id: string; email: string; name: string; role: string; status: string; lastActive: string; isSelf: boolean; artistAccess: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  ADMIN: "Admin",
  EDITOR: "Editor",
  ARTIST: "Artist",
  DOOR: "Door",
};

const field = "rounded border border-(--border) bg-(--input-bg) p-2.5 text-sm";

export function UsersTable({
  users,
  actorRole,
  assignable,
  canInviteArtists,
  soleSuperadmin,
}: {
  users: UserRow[];
  actorRole: string;
  assignable: string[];
  canInviteArtists: boolean;
  soleSuperadmin: boolean;
}) {
  const [inviteState, invite, inviting] = useActionState<ActionState, FormData>(inviteUser, null);
  const [updateState, update] = useActionState<ActionState, FormData>(updateUser, null);
  const msg = inviteState ?? updateState;
  const inviteRoles = assignable.filter((role) => role !== "SUPERADMIN" && (role !== "ARTIST" || canInviteArtists));
  const defaultInvite = actorRole === "SUPERADMIN" && inviteRoles.includes("ADMIN")
    ? "ADMIN"
    : inviteRoles.includes("EDITOR") ? "EDITOR" : inviteRoles[0];
  const [inviteRole, setInviteRole] = useState(defaultInvite);

  return (
    <div className="space-y-5">
      {msg ? (
        <p role={msg.ok ? "status" : "alert"}
          className={`rounded border p-3 text-sm ${msg.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {msg.ok ? msg.message : msg.error}
        </p>
      ) : null}

      <form action={invite} className="flex flex-wrap items-end gap-3 rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
        <div className="min-w-56 flex-1">
          <label htmlFor="email" className="mb-1.5 block text-xs font-bold">Invite by email</label>
          <input id="email" name="email" type="email" required placeholder="name@example.com" className={`${field} w-full`} />
        </div>
        <div>
          <label htmlFor="role" className="mb-1.5 block text-xs font-bold">Role</label>
          <select id="role" name="role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={field}>
            {inviteRoles.map((role) => (
              <option key={role} value={role}>{ROLE_LABEL[role] ?? role}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={inviting}
          className="rounded bg-(--primary) px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {inviting ? "Sending…" : "Send invite"}
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-(--border-strong) bg-(--card-bg)">
        {users.map((u) => {
          const roleLocked = soleSuperadmin && u.role === "SUPERADMIN";
          const suspendLocked = roleLocked && u.status === "ACTIVE";
          return (
          <div key={u.id} className="flex flex-wrap items-center gap-4 border-b border-(--border-strong) px-5 py-3.5 last:border-0">
            <div className="min-w-0 flex-1">
              <b className="block truncate text-sm">{u.name || u.email}</b>
              <span className="text-xs text-(--sub-text)">{u.email}</span>
            </div>
            <span className="text-xs text-(--sub-text)">{u.lastActive}</span>

            {u.isSelf || !assignable.includes(u.role) || roleLocked ? (
              <span className="rounded-full bg-(--surface-alt) px-2.5 py-1 text-[11.5px] font-bold text-(--sub-text)">
                {ROLE_LABEL[u.role] ?? u.role}{u.isSelf ? " · you" : ""}
                {u.role === "ADMIN" && u.artistAccess ? " · artists" : ""}
              </span>
            ) : (
              <form action={update} className="flex items-center gap-2">
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="action" value="role" />
                <select name="role" defaultValue={u.role} className={field} aria-label={`Role for ${u.email}`}>
                  {assignable.filter((role) => role !== "ARTIST" || canInviteArtists || u.role === "ARTIST").map((role) => (
                    <option key={role} value={role}>{ROLE_LABEL[role] ?? role}</option>
                  ))}
                </select>
                <button type="submit" className="rounded border border-(--border-strong) px-3 py-2 text-xs font-bold">Save</button>
              </form>
            )}

            {actorRole === "SUPERADMIN" && u.role === "ADMIN" && !u.isSelf ? (
              <form action={update}>
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="action" value="artistAccess" />
                <input type="hidden" name="artistAccess" value={u.artistAccess ? "false" : "true"} />
                <button type="submit" className="rounded border border-(--border-strong) px-3 py-2 text-xs font-bold">
                  {u.artistAccess ? "Revoke artist access" : "Allow artist access"}
                </button>
              </form>
            ) : null}

            {!u.isSelf && !suspendLocked && (actorRole === "SUPERADMIN" || assignable.includes(u.role)) ? (
              <form action={update}>
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="action" value={u.status === "SUSPENDED" ? "activate" : "suspend"} />
                <button type="submit" className="rounded border border-(--primary)/40 px-3 py-2 text-xs font-bold text-(--primary)">
                  {u.status === "SUSPENDED" ? "Restore" : "Suspend"}
                </button>
              </form>
            ) : null}

            {!u.isSelf && !roleLocked && (actorRole === "SUPERADMIN" || assignable.includes(u.role)) ? (
              <form
                action={update}
                onSubmit={(event) => {
                  const ok = window.confirm(
                    `Delete the login for ${u.email}? Their posts and artist page stay on the site. They cannot sign in again.`,
                  );
                  if (!ok) event.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="action" value="delete" />
                <button type="submit" className="rounded border border-(--primary)/40 px-3 py-2 text-xs font-bold text-(--primary)">
                  Delete
                </button>
              </form>
            ) : null}

            {roleLocked && actorRole === "SUPERADMIN" ? (
              <p className="basis-full text-xs text-(--sub-text)">
                {u.status === "ACTIVE"
                  ? "Last superadmin. Promote someone else before this account can change."
                  : "Promote another superadmin before this role can change."}
              </p>
            ) : null}
          </div>
          );
        })}
      </div>
    </div>
  );
}
