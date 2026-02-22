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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Create or load chat session
    const { data: existing } = await supabase
      .from("ai_chat_sessions")
      .select("id, messages_json")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && Array.isArray(existing.messages_json)) {
      setSessionId(existing.id);
      // Restore recent messages (last 10)
      const restored: Message[] = (existing.messages_json as any[])
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
      // Create new session
      const { data: newSession } = await supabase
        .from("ai_chat_sessions")
        .insert({ user_id: user.id, course_id: selectedCourse, messages_json: [] })
        .select("id")
        .single();
      if (newSession) setSessionId(newSession.id);
    }
  };

  const loadCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("id, title, category")
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

      // Add placeholder for assistant
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

        // Handle streaming response
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            // Parse SSE chunks
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
                  // Might be raw text if not streaming JSON
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
          // Fallback: read as JSON
          const data = await res.json();
          fullContent = data.response ?? data.content ?? "Nessuna risposta.";
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullContent } : m
            )
          );
        }

        // Finalize
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullContent, isStreaming: false }
              : m
          )
        );

        // Save to session
        if (sessionId) {
          const updatedMessages = [
            ...messages.slice(-8),
            { id: userMsg.id, role: "user", content, timestamp: userMsg.timestamp },
            { id: assistantId, role: "assistant", content: fullContent, timestamp: new Date() },
          ];
          await supabase
            .from("ai_chat_sessions")
            .update({ messages_json: updatedMessages, updated_at: new Date().toISOString() })
            .eq("id", sessionId);
        }
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "⚠️ Errore nella risposta. Assicurati che Ollama sia in esecuzione (`ollama serve`) e riprova.",
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
        .update({ messages_json: [] })
        .eq("id", sessionId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900">AI Tutor</h1>
            <p className="text-xs text-gray-400">Powered by Ollama + RAG</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Course selector */}
          <div className="relative">
            <select
              value={selectedCourse ?? ""}
              onChange={(e) => setSelectedCourse(e.target.value || null)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 pr-7 text-gray-600 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Tutti i corsi</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Clear */}
          <button
            onClick={clearChat}
            title="Nuova conversazione"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <Sparkles className="w-12 h-12 text-primary/30 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700 mb-1">
              Ciao! Sono il tuo AI Tutor
            </h2>
            <p className="text-gray-400 text-sm mb-6 max-w-sm">
              Posso aiutarti con domande sui corsi di Digital Marketing, AI e Sales. Usa il contesto RAG per risposte precise.
            </p>

            {/* Starter prompts */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-left text-sm px-3 py-2.5 rounded-xl border border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-gray-600 hover:text-primary transition-all"
                >
                  {p}
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

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <button
          onClick={() => { setIsAtBottom(true); scrollToBottom(); }}
          className="absolute bottom-28 right-8 bg-white border border-gray-200 rounded-full p-2 shadow-sm hover:shadow-md transition-all text-gray-500 hover:text-primary"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Input area */}
      <div className="card !p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Fai una domanda al tutor... (Invio per inviare, Shift+Invio per nuova riga)"
            rows={1}
            className="flex-1 resize-none border-0 focus:outline-none text-sm text-gray-700 placeholder-gray-300 max-h-32 overflow-y-auto"
            style={{ minHeight: "36px" }}
            onInput={(e) => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 128) + "px";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-300 mt-1.5">
          ⚡ Powered by Ollama (Llama 3.1 8B) · RAG su pgvector
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? "bg-primary/10 text-primary"
            : "bg-gradient-to-br from-primary to-accent text-white"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-white rounded-tr-sm"
            : "bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm"
        }`}
      >
        {message.content ? (
          <div className="whitespace-pre-wrap">
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-1 h-4 bg-current ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-gray-400 text-xs">Sto pensando...</span>
          </div>
        )}
      </div>
    </div>
  );
}
