"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { BlockNoteSchema, defaultBlockSpecs, filenameFromURL, type PartialBlock } from "@blocknote/core";
import {
  EmbedTab,
  FilePanelController,
  UploadTab,
  useBlockNoteEditor,
  useComponentsContext,
  useCreateBlockNote,
  type FilePanelProps,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { uploadEditorImage } from "@/lib/uploadImage";
import { MediaLibraryPicker } from "./MediaLibraryPicker";

/**
 * Post body editor. Stores BLOCK JSON, never HTML — the same content then feeds
 * the site, RSS and the newsletter without a second rendering path.
 *
 * Music-specific nodes (Audio Player, Release, Tracklist, Streaming Links,
 * Artist mention) plug into the schema below, so adding one touches this file
 * and the renderer only — never the form or the Server Action.
 */
const schema = BlockNoteSchema.create({ blockSpecs: { ...defaultBlockSpecs } });

const LibraryPickerContext = createContext<{ openLibrary: (blockId: string) => void } | null>(null);

function LibraryTab({ blockId }: FilePanelProps) {
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor();
  const library = useContext(LibraryPickerContext);

  return (
    <Components.FilePanel.TabPanel className="bn-tab-panel">
      <p className="mb-3 text-sm text-(--sub-text)">Reuse an image already in the media library.</p>
      <Components.FilePanel.Button
        className="bn-button"
        type="button"
        onClick={() => {
          library?.openLibrary(blockId);
          const panel = editor.extensions.get("filePanel") as { closeMenu?: () => void } | undefined;
          panel?.closeMenu?.();
        }}
      >
        Choose from library
      </Components.FilePanel.Button>
    </Components.FilePanel.TabPanel>
  );
}

function MediaAwareFilePanel(props: FilePanelProps) {
  const Components = useComponentsContext()!;
  const [loading, setLoading] = useState(false);
  const [openTab, setOpenTab] = useState("Upload");

  const tabs = useMemo(
    () => [
      { name: "Upload", tabPanel: <UploadTab blockId={props.blockId} setLoading={setLoading} /> },
      { name: "Library", tabPanel: <LibraryTab blockId={props.blockId} /> },
      { name: "Embed", tabPanel: <EmbedTab blockId={props.blockId} /> },
    ],
    [props.blockId],
  );

  return (
    <Components.FilePanel.Root
      className="bn-panel"
      defaultOpenTab="Upload"
      openTab={openTab}
      setOpenTab={setOpenTab}
      tabs={tabs}
      loading={loading}
    />
  );
}

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

  const editor = useCreateBlockNote({
    schema,
    initialContent: initial,
    uploadFile: uploadEditorImage,
  });

  // Mirrored into state on every change. A hidden input reading editor.document
  // directly would never re-render, so the form would post the empty first draft.
  const [serialised, setSerialised] = useState(() => JSON.stringify(initial ?? []));
  const [styled, setStyled] = useState(true);
  const [libraryBlockId, setLibraryBlockId] = useState<string | null>(null);

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

  const openLibrary = useCallback((blockId: string) => setLibraryBlockId(blockId), []);
  const libraryCtx = useMemo(() => ({ openLibrary }), [openLibrary]);

  if (!styled) return null;

  return (
    <LibraryPickerContext.Provider value={libraryCtx}>
      <div className="rounded border border-(--border) bg-(--input-bg)">
        <input type="hidden" name={name} value={serialised} readOnly />
        <BlockNoteView
          editor={editor}
          theme="dark"
          className="min-h-[340px] py-3"
          filePanel={false}
          onChange={() => setSerialised(JSON.stringify(editor.document))}
        >
          <FilePanelController filePanel={MediaAwareFilePanel} />
        </BlockNoteView>
      </div>
      <MediaLibraryPicker
        open={libraryBlockId !== null}
        onClose={() => setLibraryBlockId(null)}
        onSelect={(url) => {
          if (!libraryBlockId) return;
          editor.updateBlock(libraryBlockId, {
            props: { name: filenameFromURL(url), url },
          });
          setLibraryBlockId(null);
        }}
      />
    </LibraryPickerContext.Provider>
  );
}
