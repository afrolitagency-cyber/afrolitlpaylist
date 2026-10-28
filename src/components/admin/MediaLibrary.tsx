"use client";

import Image from "next/image";
import { useActionState } from "react";
import { deleteMediaAsset } from "@/lib/actions/media";
import type { ActionState } from "@/lib/actions/_result";

export type LibraryAsset = {
  id: string;
  url: string;
  kind: string;
  createdAt: string;
  bytes: number | null;
};

export function MediaLibrary({ assets }: { assets: LibraryAsset[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(deleteMediaAsset, null);

  if (assets.length === 0) {
    return (
      <p className="mt-5 rounded-xl border border-(--border-strong) bg-(--card-bg) p-6 text-sm text-(--sub-text)">
        Nothing uploaded yet.
      </p>
    );
  }

  return (
    <div className="mt-5">
      {state ? (
        <p role={state.ok ? "status" : "alert"}
          className={`mb-4 rounded border p-3 text-sm ${state.ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-(--primary)/40 bg-(--primary)/10 text-(--primary)"}`}>
          {state.ok ? state.message : state.error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {assets.map((asset) => {
          const name = asset.url.split("/").pop() || "this file";
          return (
            <div key={asset.id} className="overflow-hidden rounded-lg border border-(--border-strong) bg-(--card-bg)">
              {asset.kind === "image" ? (
                <div className="relative aspect-square bg-(--surface)">
                  <Image src={asset.url} alt="" fill sizes="200px" className="object-cover" />
                </div>
              ) : (
                <div className="grid aspect-square place-items-center bg-(--surface) text-xs text-(--sub-text)">Audio</div>
              )}
              <div className="space-y-2 p-2.5">
                <span className="block truncate text-[11.5px] text-(--sub-text)">
                  {asset.createdAt}
                  {asset.bytes ? ` · ${formatBytes(asset.bytes)}` : ""}
                </span>
                <form
                  action={action}
                  onSubmit={(event) => {
                    const ok = window.confirm(
                      `Delete ${name}? It is removed from Cloudinary only if no page still uses it.`,
                    );
                    if (!ok) event.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={asset.id} />
                  <button type="submit" disabled={pending}
                    className="rounded border border-(--primary)/40 px-2.5 py-1.5 text-[11px] font-bold text-(--primary) disabled:opacity-60">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
