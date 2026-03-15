"use client";

/**
 * TextBlock — Rich text editor using contenteditable.
 *
 * Why contenteditable over a textarea? Preserves HTML structure
 * so trainers can use bold/italic/lists that render correctly to learners.
 * We avoid a heavy editor library (Tiptap/Quill) for MVP — contenteditable
 * with an execCommand toolbar covers 90% of use cases.
 */

import { useRef, useEffect, useState } from "react";
import { Bold, Italic, List, ListOrdered, Heading2, AlignLeft } from "lucide-react";
import type { TextBlock as TextBlockType } from "../types";

interface TextBlockProps {
  block: TextBlockType;
  isEditing: boolean;
  onChange: (block: TextBlockType) => void;
}

const ToolbarButton = ({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    onMouseDown={(e) => {
      e.preventDefault(); // Prevent blur
      onClick();
    }}
    title={title}
    aria-label={title}
    className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
  >
    {children}
  </button>
);

export function TextBlock({ block, isEditing, onChange }: TextBlockProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync external changes to DOM (e.g., AI insert)
  useEffect(() => {
    if (editableRef.current && !isFocused) {
      editableRef.current.innerHTML = block.content.html;
    }
  }, [block.content.html, isFocused]);

  const handleInput = () => {
    if (!editableRef.current) return;
    const html = editableRef.current.innerHTML;
    const plain = editableRef.current.innerText;
    onChange({ ...block, content: { html, plain } });
  };

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleInput();
    editableRef.current?.focus();
  };

  if (!isEditing) {
    return (
      <div
        className="prose prose-sm max-w-none text-gray-700 min-h-[2rem]"
        dangerouslySetInnerHTML={{ __html: block.content.html || "<p class='text-gray-400'>Blocco testo vuoto</p>" }}
      />
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 border-b border-gray-200">
        <ToolbarButton onClick={() => exec("bold")} title="Grassetto (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} title="Corsivo (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarButton onClick={() => exec("formatBlock", "h2")} title="Titolo">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("formatBlock", "p")} title="Paragrafo">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-gray-200 mx-1" />
        <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Elenco puntato">
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} title="Elenco numerato">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editable area */}
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label="Contenuto del blocco testo"
        aria-multiline="true"
        className="p-3 min-h-[120px] prose prose-sm max-w-none text-gray-800 focus:outline-none"
        dangerouslySetInnerHTML={{ __html: block.content.html }}
      />
    </div>
  );
}
