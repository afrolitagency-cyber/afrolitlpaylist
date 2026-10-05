"use client";

import { useEffect, useState } from "react";
import { listImageAssets } from "@/lib/actions/media";

/** Picks an image that is already in the library, instead of uploading it again. */
export function MediaLibraryPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [items, setItems] = useState<{ id: string; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listImageAssets()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the media library.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Media library">
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-(--border-strong) bg-(--card-bg) p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Media library</h2>
            <p className="text-sm text-(--sub-text)">Choose an image already uploaded.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded border border-(--border-strong) px-3 py-1.5 text-sm font-bold">
            Close
          </button>
        </div>

        {error ? <p className="text-sm text-(--primary)">{error}</p> : null}
        {loading ? <p className="text-sm text-(--sub-text)">Loading images…</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p className="text-sm text-(--sub-text)">Nothing in the library yet. Use Upload to add an image.</p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.url)}
              className="overflow-hidden rounded-lg border border-(--border-strong) bg-(--surface) hover:border-(--primary)"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
