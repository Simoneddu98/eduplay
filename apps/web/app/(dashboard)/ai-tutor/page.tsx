"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Send,
  Bot,
  User,
  Loader2,
  BookOpen,
  Sparkles,
  RefreshCcw,
  ChevronDown,
  Paperclip,
  Info,
  MessageSquare,
  X,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const STARTER_PROMPTS = [
  "Cos'è il SEO e come funziona?",
  "Spiegami il funnel di marketing",
  "Qual è la differenza tra AI generativa e ML?",
  "Come si struttura una strategia di vendita?",
  "Spiega il concetto di prompt engineering",
  "Cos'è il content marketing?",
];

export default function AITutorPage() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(courseId);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    initSession();
    loadCourses();
  }, []);

  useEffect(() => {
    if (isAtBottom) scrollToBottom();
  }, [messages, isAtBottom]);

  const initSession = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existing } = await supabase
      .from("ai_chat_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && Array.isArray(existing.messages)) {
      setSessionId(existing.id);
      const restored: Message[] = (existing.messages as any[])
        .slice(-10)
        .map((m: any) => ({
          id: m.id ?? crypto.randomUUID(),
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp ?? Date.now()),
        }));
      if (restored.length > 0) {
        setMessages(restored);
      }
    } else {
      const { data: newSession } = await supabase
        .from("ai_chat_sessions")
        .insert({
          user_id: user.id,
          course_id: selectedCourse,
          messages: [],
        })
        .select("*")
        .single();
      if (newSession) setSessionId(newSession.id);
    }
  };

  const loadCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .order("category");
    setCourses(data ?? []);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setIsAtBottom(atBottom);
  };

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isLoading) return;

      setInput("");
      setIsLoading(true);
      setIsAtBottom(true);

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      try {
        const res = await fetch("/api/ai-tutor/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            courseId: selectedCourse,
            message: content,
            history: messages.slice(-8).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            const lines = chunk.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    fullContent += parsed.content;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantId
                          ? { ...m, content: fullContent, isStreaming: true }
                          : m
                      )
                    );
                  }
                } catch {
                  fullContent += data;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: fullContent, isStreaming: true }
                        : m
                    )
                  );
                }
              }
            }
          }
        } else {
          const data = await res.json();
          fullContent = data.response ?? data.content ?? "Nessuna risposta.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullContent } : m
            )
          );
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullContent, isStreaming: false }
              : m
          )
        );

        if (sessionId) {
          const updatedMessages = [
            ...messages.slice(-8),
            {
              id: userMsg.id,
              role: "user",
              content,
              timestamp: userMsg.timestamp,
            },
            {
              id: assistantId,
              role: "assistant",
              content: fullContent,
              timestamp: new Date(),
            },
          ];
          await supabase
            .from("ai_chat_sessions")
            .update({
              messages: updatedMessages,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sessionId);
        }
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Errore nella risposta. Assicurati che Ollama sia in esecuzione (`ollama serve`) e riprova.",
                  isStreaming: false,
                }
              : m
          )
        );
      }

      setIsLoading(false);
      inputRef.current?.focus();
    },
    [input, isLoading, messages, sessionId, selectedCourse]
  );

  const clearChat = async () => {
    setMessages([]);
    if (sessionId) {
      await supabase
        .from("ai_chat_sessions")
        .update({ messages: [] })
        .eq("id", sessionId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectedCourseName = courses.find(
    (c: any) => c.id === selectedCourse
  )?.title;

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-0 lg:gap-6">
      {/* ── Chat Panel (left / main) ─────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="glass-card px-5 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-600 flex items-center justify-center animate-pulse-glow">
                <Bot className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
                aria-hidden="true"
              />
            </div>
            <div>
              <h1 className="font-bold font-poppins text-slate-900 text-base">
                Tutor AI EduPlay
              </h1>
              <p className="text-xs text-green-600 font-medium">Online</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Course selector */}
            <div className="relative hidden sm:block">
              <select
                value={selectedCourse ?? ""}
                onChange={(e) => setSelectedCourse(e.target.value || null)}
                className="text-sm border border-blue-100 rounded-xl px-3 py-1.5 pr-8 text-slate-600 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200 cursor-pointer"
                aria-label="Seleziona corso"
              >
                <option value="">Tutti i corsi</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
            </div>

            {/* Info panel toggle (mobile) */}
            <button
              onClick={() => setInfoPanelOpen(!infoPanelOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-blue-50 text-slate-500 hover:text-blue-700 transition-colors duration-200 cursor-pointer"
              aria-label="Mostra informazioni"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Clear chat */}
            <button
              onClick={clearChat}
              title="Nuova conversazione"
              className="p-2 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-700 transition-colors duration-200 cursor-pointer"
              aria-label="Nuova conversazione"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scroll-smooth"
        >
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mb-6">
                <Bot
                  className="w-10 h-10 text-blue-600"
                  aria-hidden="true"
                />
              </div>
              <h2 className="text-xl font-bold font-poppins text-slate-800 mb-2">
                Ciao! Come posso aiutarti oggi?
              </h2>
              <p className="text-slate-400 text-sm mb-8 max-w-sm leading-relaxed">
                Posso aiutarti con domande sui corsi di Digital Marketing, AI e
                Sales. Seleziona un corso per risposte ancora piu precise.
              </p>

              {/* Suggested questions chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="text-left text-sm px-4 py-3 rounded-xl border border-blue-100 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-all duration-200 cursor-pointer flex items-center gap-2"
                  >
                    <MessageSquare
                      className="w-3.5 h-3.5 text-blue-400 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{p}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom */}
        {!isAtBottom && (
          <div className="flex justify-center -mt-14 mb-2 relative z-10">
            <button
              onClick={() => {
                setIsAtBottom(true);
                scrollToBottom();
              }}
              className="glass-card px-3 py-1.5 flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-700 transition-all duration-200 cursor-pointer shadow-md"
              aria-label="Scorri in basso"
            >
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              Nuovi messaggi
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="glass-card p-3">
          <div className="flex items-end gap-2">
            <button
              className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-200 cursor-pointer"
              aria-label="Allega file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Fai una domanda al tutor..."
              rows={1}
              className="flex-1 resize-none border-0 bg-transparent focus:outline-none text-sm text-slate-700 placeholder-slate-300 max-h-32 overflow-y-auto leading-relaxed"
              style={{ minHeight: "36px" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 128) + "px";
              }}
              aria-label="Scrivi un messaggio"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="shrink-0 btn-primary !px-3 !py-2 !rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Invia messaggio"
            >
              {isLoading ? (
                <Loader2
                  className="w-4 h-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            Powered by Ollama (Llama 3.1 8B) con RAG su pgvector
          </p>
        </div>
      </div>

      {/* ── Info / Context Panel (right) ─────────────────── */}
      {/* Desktop: always visible. Mobile: overlay */}
      <aside
        className={`
          ${infoPanelOpen ? "fixed inset-0 z-50 bg-black/20 lg:relative lg:inset-auto lg:z-auto lg:bg-transparent" : "hidden lg:block"}
          lg:w-[320px] xl:w-[360px] shrink-0
        `}
        onClick={(e) => {
          if (e.target === e.currentTarget) setInfoPanelOpen(false);
        }}
      >
        <div
          className={`
            ${infoPanelOpen ? "absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl p-4 overflow-y-auto" : ""}
            lg:relative lg:w-full lg:bg-transparent lg:shadow-none lg:p-0
            flex flex-col gap-4
          `}
        >
          {/* Mobile close button */}
          {infoPanelOpen && (
            <button
              onClick={() => setInfoPanelOpen(false)}
              className="lg:hidden self-end p-2 rounded-xl hover:bg-blue-50 text-slate-500 transition-colors duration-200 cursor-pointer"
              aria-label="Chiudi pannello"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Active context card */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen
                className="w-4 h-4 text-blue-600"
                aria-hidden="true"
              />
              <h3 className="text-sm font-bold font-poppins text-slate-800">
                Contesto Attivo
              </h3>
            </div>
            {selectedCourse && selectedCourseName ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  <BookOpen className="w-3 h-3" aria-hidden="true" />
                  {selectedCourseName}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Nessun corso selezionato. Le risposte copriranno tutti gli
                argomenti disponibili.
              </p>
            )}

            {/* Mobile course selector */}
            <div className="sm:hidden mt-3">
              <div className="relative">
                <select
                  value={selectedCourse ?? ""}
                  onChange={(e) => setSelectedCourse(e.target.value || null)}
                  className="w-full text-sm border border-blue-100 rounded-xl px-3 py-2 pr-8 text-slate-600 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all duration-200 cursor-pointer"
                  aria-label="Seleziona corso"
                >
                  <option value="">Tutti i corsi</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          {/* How to use */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-600" aria-hidden="true" />
              <h3 className="text-sm font-bold font-poppins text-slate-800">
                Come usare il Tutor
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-500 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-blue-600 font-bold text-xs">
                  1
                </span>
                Seleziona un corso per contestualizzare le risposte
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-blue-600 font-bold text-xs">
                  2
                </span>
                Fai domande specifiche sugli argomenti del corso
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 text-blue-600 font-bold text-xs">
                  3
                </span>
                Usa Shift+Invio per andare a capo nel messaggio
              </li>
            </ul>
          </div>

          {/* Available courses list */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles
                className="w-4 h-4 text-blue-600"
                aria-hidden="true"
              />
              <h3 className="text-sm font-bold font-poppins text-slate-800">
                Corsi Disponibili
              </h3>
            </div>
            <div className="space-y-1.5">
              {courses.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourse(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer ${
                    selectedCourse === c.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  {c.title}
                </button>
              ))}
              {courses.length === 0 && (
                <p className="text-xs text-slate-300">
                  Caricamento corsi...
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ── Message Bubble Component ──────────────────────────────── */
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gradient-to-br from-blue-700 to-indigo-600 text-white"
        }`}
        aria-hidden="true"
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-tr-md"
            : "glass-card !rounded-tl-md text-slate-700"
        }`}
      >
        {message.content ? (
          <div className="whitespace-pre-wrap">
            {message.content}
            {message.isStreaming && (
              <span
                className="inline-block w-1.5 h-4 bg-current ml-1 rounded-sm animate-pulse"
                aria-label="Sta scrivendo"
              />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
            <span className="text-slate-400 text-xs">Sto pensando...</span>
          </div>
        )}
      </div>
    </div>
  );
}
