"use client";

/**
 * ContentBlock — Polymorphic block wrapper.
 *
 * Renders the correct block editor based on block.type.
 * Provides shared chrome: drag handle, type label, move up/down, delete.
 * The "Add Block" picker lives below each block (not in a sidebar) to keep
 * the focus on content — same pattern as Notion and EasyGenerator.
 */

import { useState } from "react";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Type,
  Image,
  Video,
  HelpCircle,
  CreditCard,
  ListOrdered,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
import type { ContentBlock as ContentBlockType, ContentBlockType as BlockTypeEnum } from "../types";
import { TextBlock } from "../blocks/TextBlock";
import { ImageBlock } from "../blocks/ImageBlock";
import { VideoBlock } from "../blocks/VideoBlock";
import { QuizBlock } from "../blocks/QuizBlock";

// ─── Block type metadata ─────────────────────────────────────

const BLOCK_TYPES: Array<{
  type: BlockTypeEnum;
  labelIt: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = [
  { type: "text",      labelIt: "Testo",      icon: Type,        color: "text-blue-600",   bg: "bg-blue-50 hover:bg-blue-100 border-blue-200" },
  { type: "image",     labelIt: "Immagine",   icon: Image,       color: "text-green-600",  bg: "bg-green-50 hover:bg-green-100 border-green-200" },
  { type: "video",     labelIt: "Video",      icon: Video,       color: "text-red-600",    bg: "bg-red-50 hover:bg-red-100 border-red-200" },
  { type: "quiz",      labelIt: "Quiz",       icon: HelpCircle,  color: "text-amber-600",  bg: "bg-amber-50 hover:bg-amber-100 border-amber-200" },
  { type: "flip_card", labelIt: "Flip card",  icon: CreditCard,  color: "text-purple-600", bg: "bg-purple-50 hover:bg-purple-100 border-purple-200" },
  { type: "steps",     labelIt: "Passaggi",   icon: ListOrdered, color: "text-indigo-600", bg: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200" },
  { type: "file",      labelIt: "File",       icon: Paperclip,   color: "text-gray-600",   bg: "bg-gray-50 hover:bg-gray-100 border-gray-200" },
];

const BLOCK_LABEL: Record<BlockTypeEnum, string> = {
  text: "Testo",
  image: "Immagine",
  video: "Video",
  quiz: "Quiz",
  flip_card: "Flip card",
  steps: "Passaggi",
  file: "File",
};

const BLOCK_ICON: Record<BlockTypeEnum, React.ElementType> = {
  text: Type,
  image: Image,
  video: Video,
  quiz: HelpCircle,
  flip_card: CreditCard,
  steps: ListOrdered,
  file: Paperclip,
};

// ─── Block Picker ────────────────────────────────────────────

interface BlockPickerProps {
  onAdd: (type: BlockTypeEnum) => void;
  onClose: () => void;
}

function BlockPicker({ onAdd, onClose }: BlockPickerProps) {
  return (
    <div className="relative z-10 p-3 bg-white border border-gray-200 rounded-2xl shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-700">Aggiungi blocco</p>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {BLOCK_TYPES.map(({ type, labelIt, icon: Icon, color, bg }) => (
          <button
            key={type}
            onClick={() => { onAdd(type); onClose(); }}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all ${bg}`}
            aria-label={`Aggiungi blocco ${labelIt}`}
          >
            <Icon className={`w-5 h-5 ${color}`} />
            <span className={`text-[10px] font-medium ${color}`}>{labelIt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Add Block Button ────────────────────────────────────────

interface AddBlockButtonProps {
  onAdd: (type: BlockTypeEnum) => void;
}

function AddBlockButton({ onAdd }: AddBlockButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-2 px-3 text-xs text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl border border-dashed border-gray-200 hover:border-purple-300 transition-all"
        aria-label="Aggiungi blocco"
        aria-expanded={open}
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Aggiungi blocco</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-10 w-72">
            <BlockPicker onAdd={onAdd} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Single Block Wrapper ─────────────────────────────────────

interface ContentBlockProps {
  block: ContentBlockType;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  lessonTitle?: string;
  lessonContent?: string;
  onChange: (block: ContentBlockType) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddAfter: (type: BlockTypeEnum) => void;
}

export function ContentBlock({
  block,
  isFirst,
  isLast,
  isEditing,
  lessonTitle,
  lessonContent,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddAfter,
}: ContentBlockProps) {
  const [hovered, setHovered] = useState(false);
  const Icon = BLOCK_ICON[block.type] ?? Type;
  const label = BLOCK_LABEL[block.type] ?? "Blocco";

  return (
    <div
      className="group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`relative rounded-xl border transition-all ${
        isEditing && hovered ? "border-purple-300 shadow-sm" : "border-transparent"
      }`}>
        {/* Control bar (visible on hover in edit mode) */}
        {isEditing && (
          <div className={`flex items-center justify-between px-2 py-1 rounded-t-xl bg-gray-50 border-b border-gray-100 transition-opacity ${
            hovered ? "opacity-100" : "opacity-0"
          }`}>
            <div className="flex items-center gap-1.5">
              <GripVertical className="w-3.5 h-3.5 text-gray-300" aria-hidden />
              <Icon className="w-3.5 h-3.5 text-gray-400" aria-hidden />
              <span className="text-[10px] font-medium text-gray-400">{label}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                aria-label="Sposta in su"
              >
                <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 transition-colors"
                aria-label="Sposta in giù"
              >
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button
                onClick={onDelete}
                className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded transition-colors"
                aria-label="Elimina blocco"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Block content */}
        <div className="p-3">
          {block.type === "text" && (
            <TextBlock
              block={block}
              isEditing={isEditing}
              onChange={onChange as (b: typeof block) => void}
            />
          )}
          {block.type === "image" && (
            <ImageBlock
              block={block}
              isEditing={isEditing}
              onChange={onChange as (b: typeof block) => void}
            />
          )}
          {block.type === "video" && (
            <VideoBlock
              block={block}
              isEditing={isEditing}
              onChange={onChange as (b: typeof block) => void}
            />
          )}
          {block.type === "quiz" && (
            <QuizBlock
              block={block}
              isEditing={isEditing}
              onChange={onChange as (b: typeof block) => void}
              lessonTitle={lessonTitle}
              lessonContent={lessonContent}
            />
          )}
          {(block.type === "flip_card" || block.type === "steps" || block.type === "file") && (
            <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-center text-sm text-gray-500">
              <span className="font-medium">{label}</span> — disponibile in V2
            </div>
          )}
        </div>
      </div>

      {/* Add block after this one */}
      {isEditing && (
        <div className="py-1">
          <AddBlockButton onAdd={onAddAfter} />
        </div>
      )}
    </div>
  );
}

// Re-export for convenience
export { AddBlockButton };
