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
import { rememberUpload } from "@/lib/actions/media";
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

const IMAGE_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

function imageMime(file: File) {
  if (file.type.startsWith("image/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME[ext] ?? "";
}

/** Signs a direct Cloudinary upload, then keeps the file in the media library. */
async function uploadEditorImage(file: File) {
  const mimeType = imageMime(file);
  if (!mimeType) throw new Error("This file type is not supported.");

  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "image", mimeType, bytes: file.size }),
  });
  const sign = (await signRes.json()) as {
    error?: string;
    apiKey?: string;
    timestamp?: number;
    folder?: string;
    signature?: string;
    endpoint?: string;
  };
  if (!signRes.ok || !sign.apiKey || !sign.endpoint || !sign.signature || !sign.folder || !sign.timestamp) {
    throw new Error(sign.error ?? "Upload was refused.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", sign.apiKey);
  body.append("timestamp", String(sign.timestamp));
  body.append("folder", sign.folder);
  body.append("signature", sign.signature);

  const up = await fetch(sign.endpoint, { method: "POST", body });
  const data = (await up.json()) as {
    secure_url?: string;
    public_id?: string;
    bytes?: number;
    width?: number;
    height?: number;
    error?: { message?: string };
  };
  if (!up.ok || !data.secure_url) throw new Error(data.error?.message ?? "Cloudinary rejected the file.");

  await rememberUpload({
    url: data.secure_url,
    publicId: data.public_id,
    mimeType,
    bytes: data.bytes,
    width: data.width,
    height: data.height,
  });

  return data.secure_url;
}

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
