"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, Mic, X } from "lucide-react";
import { useSearch } from "@/hooks/useSearch";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  className?: string;
  autoFocus?: boolean;
}

export function SearchBar({ className, autoFocus }: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { query, setQuery, suggestions } = useSearch();
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // FIX #7: Clear search bar text when navigating away from /search page.
  // When user is on /search, the text should remain. When they navigate to
  // home or any other page, the search bar should be blank.
  useEffect(() => {
    if (!pathname.startsWith("/search")) {
      setQuery("");
    }
  }, [pathname, setQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleSearch(q?: string) {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setIsFocused(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setIsFocused(false);
  }

  function startVoiceSearch() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setQuery(transcript);
      handleSearch(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }

  const showDropdown = isFocused && (suggestions.length > 0 || query.length >= 2);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Input + search button row */}
      <div
        className={cn(
          "flex items-center gap-2 bg-surface-100 rounded-xl px-3 py-2 border transition-all duration-150",
          isFocused ? "border-brand-500 bg-white shadow-sm ring-2 ring-brand-100" : "border-transparent hover:border-surface-200"
        )}
      >
        <Search className="w-4 h-4 text-surface-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search groceries, snacks..."
          className="flex-1 bg-transparent text-sm text-surface-900 placeholder:text-surface-400
                     outline-none min-w-0"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-surface-400 hover:text-surface-600 active:scale-90 transition-all p-0.5"
            aria-label="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={startVoiceSearch}
          className={cn(
            "text-surface-400 hover:text-brand-600 active:scale-90 transition-all p-0.5",
            isListening && "text-red-500 animate-pulse"
          )}
          title="Voice search"
          aria-label="Voice search"
        >
          <Mic className="w-4 h-4" />
        </button>
        {/* Search button */}
        <button
          onClick={() => handleSearch()}
          className="flex-shrink-0 bg-brand-600 hover:bg-brand-700 active:bg-brand-800
                     active:scale-[0.96] text-white text-sm font-semibold
                     px-3 sm:px-4 py-1.5 rounded-lg transition-all duration-100 select-none"
          style={{ touchAction: "manipulation" }}
          aria-label="Search"
        >
          <span className="hidden sm:inline">Search</span>
          <Search className="w-4 h-4 sm:hidden" />
        </button>
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2 card shadow-hover z-50 overflow-hidden">
          {suggestions.length > 0 ? (
            <ul>
              {suggestions.map((s: any) => (
                <li key={s.id}>
                  <button
                    onMouseDown={() => handleSearch(s.name)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left
                               hover:bg-surface-50 text-sm"
                  >
                    <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                    <span className="text-surface-900">{s.name}</span>
                    {s.brand && (
                      <span className="text-surface-400 ml-auto">{s.brand}</span>
                    )}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onMouseDown={() => handleSearch()}
                  className="w-full px-4 py-3 text-left text-sm text-brand-600
                             hover:bg-brand-50 font-medium border-t border-surface-100"
                >
                  See all results for "{query}"
                </button>
              </li>
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-surface-500">
              Press Enter to search for "{query}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
