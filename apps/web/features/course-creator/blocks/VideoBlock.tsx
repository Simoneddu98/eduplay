"use client";

import { useState } from "react";
import { Youtube, ExternalLink, Play } from "lucide-react";
import type { VideoBlock as VideoBlockType } from "../types";

interface VideoBlockProps {
  block: VideoBlockType;
  isEditing: boolean;
  onChange: (block: VideoBlockType) => void;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function getEmbedUrl(url: string, provider: string): string {
  if (provider === "youtube" || url.includes("youtube") || url.includes("youtu.be")) {
    const id = extractYouTubeId(url);
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : url;
  }
  if (provider === "vimeo" || url.includes("vimeo")) {
    const id = url.split("/").pop();
    return `https://player.vimeo.com/video/${id}`;
  }
  return url;
}

export function VideoBlock({ block, isEditing, onChange }: VideoBlockProps) {
  const [inputUrl, setInputUrl] = useState(block.content.url);

  const handleUrlChange = (url: string) => {
    setInputUrl(url);
    const provider = url.includes("youtu") ? "youtube" : url.includes("vimeo") ? "vimeo" : "direct";
    const embed_url = getEmbedUrl(url, provider);
    onChange({ ...block, content: { ...block.content, url, provider, embed_url } });
  };

  const embedUrl = block.content.embed_url || (block.content.url ? getEmbedUrl(block.content.url, block.content.provider) : "");

  if (!isEditing) {
    if (!embedUrl) {
      return (
        <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Play className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nessun video inserito</p>
          </div>
        </div>
      );
    }
    return (
      <div className="aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={block.content.title ?? "Video"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Incolla URL YouTube, Vimeo o link diretto..."
            aria-label="URL video"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        {inputUrl && (
          <a
            href={inputUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500"
            title="Apri in nuova scheda"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      <input
        type="text"
        value={block.content.title ?? ""}
        onChange={(e) => onChange({ ...block, content: { ...block.content, title: e.target.value } })}
        placeholder="Titolo video (opzionale)"
        aria-label="Titolo video"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
      />

      {/* Preview */}
      {embedUrl && (
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Anteprima video"
          />
        </div>
      )}
    </div>
  );
}
