"use client";

import { useState, useRef } from "react";
import { ImageIcon, Upload, Link, X, Loader2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import type { ImageBlock as ImageBlockType } from "../types";

interface ImageBlockProps {
  block: ImageBlockType;
  isEditing: boolean;
  onChange: (block: ImageBlockType) => void;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function ImageBlock({ block, isEditing, onChange }: ImageBlockProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState(block.content.url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (file.size > MAX_SIZE_BYTES) {
      setError("Immagine troppo grande. Massimo 5MB.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const ext = file.name.split(".").pop();
      const path = `course-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("course-assets")
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("course-assets")
        .getPublicUrl(path);

      onChange({
        ...block,
        content: {
          ...block.content,
          url: publicUrl,
          storage_path: path,
          alt: block.content.alt || file.name.replace(/\.[^.]+$/, ""),
        },
      });
    } catch (err) {
      setError("Errore durante il caricamento. Riprova.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlApply = () => {
    onChange({ ...block, content: { ...block.content, url: urlInput } });
  };

  const handleClear = async () => {
    if (block.content.storage_path) {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.storage.from("course-assets").remove([block.content.storage_path]);
    }
    onChange({ ...block, content: { url: "", alt: "", width: "full" } });
    setUrlInput("");
  };

  if (!isEditing) {
    if (!block.content.url) {
      return (
        <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
          <ImageIcon className="w-10 h-10 opacity-40" />
        </div>
      );
    }
    return (
      <figure className="space-y-2">
        <img
          src={block.content.url}
          alt={block.content.alt}
          className={`rounded-xl object-cover ${block.content.width === "half" ? "w-1/2" : block.content.width === "third" ? "w-1/3" : "w-full"}`}
        />
        {block.content.caption && (
          <figcaption className="text-xs text-gray-500 text-center">
            {block.content.caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return (
    <div className="space-y-3">
      {block.content.url ? (
        <div className="relative group">
          <img
            src={block.content.url}
            alt={block.content.alt}
            className="w-full rounded-xl object-cover max-h-64"
          />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
            aria-label="Rimuovi immagine"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6">
          {/* Tab switcher */}
          <div className="flex gap-2 mb-4">
            {(["upload", "url"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  tab === t
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {t === "upload" ? "Carica file" : "URL immagine"}
              </button>
            ))}
          </div>

          {tab === "upload" ? (
            <div
              className="text-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 mx-auto text-purple-500 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              )}
              <p className="text-sm text-gray-500">
                {uploading ? "Caricamento..." : "Trascina o clicca per caricare"}
              </p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF — max 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                aria-label="Carica immagine"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrlApply()}
                  placeholder="https://..."
                  aria-label="URL immagine"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <button
                onClick={handleUrlApply}
                disabled={!urlInput}
                className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                Applica
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <X className="w-3 h-3" /> {error}
        </p>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={block.content.alt}
          onChange={(e) => onChange({ ...block, content: { ...block.content, alt: e.target.value } })}
          placeholder="Testo alternativo (accessibilità)"
          aria-label="Testo alternativo immagine"
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
        <input
          type="text"
          value={block.content.caption ?? ""}
          onChange={(e) => onChange({ ...block, content: { ...block.content, caption: e.target.value } })}
          placeholder="Didascalia (opzionale)"
          aria-label="Didascalia immagine"
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Larghezza</label>
        <div className="flex gap-2">
          {(["full", "half", "third"] as const).map((w) => (
            <button
              key={w}
              onClick={() => onChange({ ...block, content: { ...block.content, width: w } })}
              className={`flex-1 py-1 text-xs rounded-lg border transition-colors ${
                block.content.width === w
                  ? "border-purple-400 bg-purple-50 text-purple-700"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {w === "full" ? "Intera" : w === "half" ? "Metà" : "Un terzo"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
