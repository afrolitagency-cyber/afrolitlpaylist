"use client";

import { useRef, useState } from "react";

type Props = {
  name: string;
  label: string;
  defaultValue?: string;
  kind?: "image" | "audio";
  hint?: string;
};

/** Uploads straight to Cloudinary using a server-signed payload, then posts the
 *  resulting URL in a hidden field. The file never touches our server. */
export function UploadField({ name, label, defaultValue = "", kind = "image", hint }: Props) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, mimeType: file.type, bytes: file.size }),
      });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error ?? "Upload was refused.");

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", sign.apiKey);
      body.append("timestamp", String(sign.timestamp));
      body.append("folder", sign.folder);
      body.append("signature", sign.signature);

      const up = await fetch(sign.endpoint, { method: "POST", body });
      const data = await up.json();
      if (!up.ok) throw new Error(data?.error?.message ?? "Cloudinary rejected the file.");

      setUrl(data.secure_url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold">{label}</label>
      <input type="hidden" name={name} value={url} readOnly />

      {url ? (
        <div className="mb-2 flex items-center gap-3 rounded border border-(--border-strong) bg-(--surface-alt) p-2.5">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-12 rounded object-cover" />
          ) : (
            <audio controls src={url} className="h-9 flex-1" />
          )}
          <button type="button" onClick={() => setUrl("")} className="ml-auto text-xs font-bold text-(--primary)">
            Remove
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full rounded border border-dashed border-(--border) p-5 text-sm text-(--sub-text) hover:border-(--primary) hover:text-(--body-text) disabled:opacity-60"
      >
        {busy ? "Uploading…" : url ? "Replace file" : `Upload ${kind === "audio" ? "audio" : "an image"}`}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={kind === "audio" ? "audio/*" : "image/*"}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />

      {hint ? <p className="mt-1.5 text-xs text-(--sub-text)">{hint}</p> : null}
      {error ? <p className="mt-1.5 text-xs text-(--primary)">{error}</p> : null}
    </div>
  );
}
