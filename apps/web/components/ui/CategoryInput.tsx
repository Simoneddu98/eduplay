"use client";

/**
 * CategoryInput — input testo libero + autocomplete dinamico da Supabase.
 *
 * - Il trainer scrive qualsiasi categoria voglia (nessuna lista fissa)
 * - I suggerimenti arrivano dal DB (categorie già usate in precedenza)
 * - Enter o click su suggerimento → conferma
 * - Nessun `value` viene rifiutato: totale libertà
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Tag, ChevronDown, X } from "lucide-react";
import { getCategorySuggestionsAction } from "@/lib/actions/courses";

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  /** Dark theme variant (es. in wizard scuro) */
  dark?: boolean;
}

export function CategoryInput({
  value,
  onChange,
  placeholder = "Es. Marketing Digitale, Leadership, Excel...",
  label,
  className = "",
  dark = false,
}: CategoryInputProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep internal query in sync when value changes externally
  useEffect(() => { setQuery(value); }, [value]);

  // Fetch suggestions once on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCategorySuggestionsAction().then((res) => {
      if (!cancelled) {
        setAllSuggestions(res.ok ? res.data : []);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Filter suggestions based on query
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions(allSuggestions.slice(0, 8));
    } else {
      const q = query.toLowerCase();
      const filtered = allSuggestions.filter((s) =>
        s.toLowerCase().includes(q) && s.toLowerCase() !== q
      );
      setSuggestions(filtered.slice(0, 8));
    }
  }, [query, allSuggestions]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  }, [onChange]);

  const handleSelect = useCallback((s: string) => {
    setQuery(s);
    onChange(s);
    setOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) {
        onChange(query.trim());
        setOpen(false);
      }
    }
    if (e.key === "Escape") setOpen(false);
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
    }
  }, [query, onChange, suggestions]);

  const handleClear = useCallback(() => {
    setQuery("");
    onChange("");
    inputRef.current?.focus();
  }, [onChange]);

  const inputBase = dark
    ? "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-purple-500 focus:border-purple-500"
    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-purple-400 focus:border-purple-400";

  const dropdownBase = dark
    ? "bg-slate-800 border-slate-700"
    : "bg-white border-gray-200";

  const itemBase = dark
    ? "text-slate-300 hover:bg-slate-700"
    : "text-gray-700 hover:bg-purple-50 hover:text-purple-700";

  const showDropdown = open && (suggestions.length > 0 || (query.trim() && query.trim().length > 0));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className={`block text-xs font-semibold mb-1 ${dark ? "text-slate-300" : "text-gray-700"}`}>
          {label}
        </label>
      )}

      <div className="relative">
        <Tag className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${dark ? "text-slate-500" : "text-gray-400"}`} />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label ?? "Categoria del corso"}
          aria-autocomplete="list"
          aria-expanded={showDropdown ? "true" : "false"}
          autoComplete="off"
          className={`w-full pl-9 pr-8 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-colors ${inputBase}`}
        />

        {/* Clear / chevron button */}
        <button
          type="button"
          onClick={query ? handleClear : () => { setOpen(!open); inputRef.current?.focus(); }}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors ${
            dark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"
          }`}
          aria-label={query ? "Cancella categoria" : "Mostra suggerimenti"}
          tabIndex={-1}
        >
          {query ? <X className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className={`absolute z-50 w-full mt-1 rounded-xl border shadow-lg overflow-hidden ${dropdownBase}`}
          role="listbox"
        >
          {/* Create new option if typed something not in list */}
          {query.trim() && !allSuggestions.map((s) => s.toLowerCase()).includes(query.trim().toLowerCase()) && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(query.trim()); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                dark
                  ? "text-purple-400 hover:bg-purple-900/30 border-b border-slate-700"
                  : "text-purple-600 hover:bg-purple-50 border-b border-gray-100"
              }`}
              role="option"
              aria-selected={false}
            >
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${dark ? "bg-purple-900/50 text-purple-300" : "bg-purple-100 text-purple-600"}`}>
                Nuova
              </span>
              {query.trim()}
            </button>
          )}

          {/* Existing suggestions */}
          {loading ? (
            <div className={`px-3 py-2.5 text-xs ${dark ? "text-slate-500" : "text-gray-400"}`}>
              Caricamento...
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${itemBase}`}
                role="option"
                aria-selected={s === value}
              >
                <Tag className="w-3 h-3 flex-shrink-0 opacity-50" />
                {s}
                {s === value && (
                  <span className="ml-auto text-xs opacity-50">selezionata</span>
                )}
              </button>
            ))
          ) : (
            <div className={`px-3 py-2.5 text-xs ${dark ? "text-slate-500" : "text-gray-400"}`}>
              Nessun suggerimento. Premi Enter per creare &quot;{query}&quot;.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
