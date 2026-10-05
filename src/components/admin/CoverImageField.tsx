"use client";

import { useRef, useState } from "react";
import { uploadEditorImage } from "@/lib/uploadImage";
import { MediaLibraryPicker } from "./MediaLibraryPicker";

/** Cover image for a post. The form still submits the stored URL; the editor never types it. */
export function CoverImageField({ defaultValue = "" }: { defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      setUrl(await uploadEditorImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4">
      <span className="mb-1.5 block text-xs font-bold">Cover image</span>
      <input type="hidden" name="coverImage" value={url} readOnly />

      {url ? (
        <div className="mb-2 overflow-hidden rounded border border-(--border-strong) bg-(--surface)">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="aspect-video w-full object-cover" />
          <button type="button" onClick={() => setUrl("")} className="w-full px-3 py-2 text-left text-xs font-bold text-(--primary)">
            Remove
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded border border-dashed border-(--border) px-3 py-2.5 text-sm font-semibold hover:border-(--primary) disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Upload"}
        </button>
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="rounded border border-(--border-strong) px-3 py-2.5 text-sm font-semibold hover:border-(--primary)"
        >
          Media library
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
          e.target.value = "";
        }}
      />

      {error ? <p className="mt-1.5 text-xs text-(--primary)">{error}</p> : null}

      <MediaLibraryPicker
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(next) => {
          setUrl(next);
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}
