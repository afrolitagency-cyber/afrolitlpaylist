"use client";

import { useEffect, useMemo, useState } from "react";
import { BlockNoteSchema, defaultBlockSpecs, type PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

/**
 * Post body editor. Stores BLOCK JSON, never HTML — the same content then feeds
 * the site, RSS and the newsletter without a second rendering path.
 *
 * Music-specific nodes (Audio Player, Release, Tracklist, Streaming Links,
 * Artist mention) plug into the schema below, so adding one touches this file
 * and the renderer only — never the form or the Server Action.
 */
const schema = BlockNoteSchema.create({ blockSpecs: { ...defaultBlockSpecs } });

export function BlockEditorClient({
  name,
  initialContent,
  onFail,
}: {
  name: string;
  initialContent?: PartialBlock[] | null;
  onFail?: () => void;
}) {
  const initial = useMemo<PartialBlock[] | undefined>(
    () => (initialContent && initialContent.length > 0 ? initialContent : undefined),
    [initialContent],
  );

  const editor = useCreateBlockNote({ schema, initialContent: initial });

  // Mirrored into state on every change. A hidden input reading editor.document
  // directly would never re-render, so the form would post the empty first draft.
  const [serialised, setSerialised] = useState(() => JSON.stringify(initial ?? []));
  const [styled, setStyled] = useState(true);

  // Detects the one failure mode that is otherwise invisible: the editor mounts
  // but its stylesheet never arrived, leaving an unusable unstyled box.
  useEffect(() => {
    const el = document.querySelector(".bn-container");
    if (!el) return;
    const ok = getComputedStyle(el).getPropertyValue("--bn-colors-editor-text").trim().length > 0;
    if (!ok) {
      setStyled(false);
      onFail?.();
    }
  }, [onFail]);

  if (!styled) return null;

  return (
    <div className="rounded border border-(--border) bg-(--input-bg)">
      <input type="hidden" name={name} value={serialised} readOnly />
      <BlockNoteView
        editor={editor}
        theme="dark"
        className="min-h-[340px] py-3"
        onChange={() => setSerialised(JSON.stringify(editor.document))}
      />
    </div>
  );
}
