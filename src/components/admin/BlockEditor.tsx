"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { PartialBlock } from "@blocknote/core";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The editor is loaded client-only and lazily.
 *
 * BlockNote touches `document` during initialisation, so it cannot be rendered
 * on the server. `ssr: false` is what prevents a hydration mismatch; the lazy
 * boundary also keeps ~200 KB of editor out of every other admin page's bundle.
 */
const Editor = dynamic(() => import("./BlockEditorClient").then((m) => m.BlockEditorClient), {
  ssr: false,
  loading: () => (
    <div className="rounded border border-(--border) bg-(--input-bg) p-4">
      <Skeleton className="mb-3 h-5 w-40" />
      <Skeleton className="mb-2 h-4 w-full" />
      <Skeleton className="mb-2 h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),
});

export function BlockEditor({ name, initialContent }: { name: string; initialContent?: PartialBlock[] | null }) {
  const [failed, setFailed] = useState(false);

  // Last line of defence: if the editor fails to mount for any reason, the
  // field degrades to a textarea holding the raw JSON rather than leaving an
  // editor-shaped hole that silently saves nothing.
  if (failed) {
    return (
      <div>
        <p className="mb-2 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          The rich editor didn&apos;t load. You can still edit the content below, or reload the page to retry.
        </p>
        <textarea
          name={name}
          defaultValue={JSON.stringify(initialContent ?? [], null, 2)}
          rows={16}
          className="w-full rounded border border-(--border) bg-(--input-bg) p-3 font-mono text-xs"
        />
      </div>
    );
  }

  return <Editor name={name} initialContent={initialContent} onFail={() => setFailed(true)} />;
}
