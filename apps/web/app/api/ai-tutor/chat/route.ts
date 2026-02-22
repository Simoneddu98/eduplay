/**
 * AI Tutor — Chat API Route
 *
 * Pipeline:
 *  1. Embedding della domanda → Ollama (nomic-embed-text) direttamente
 *  2. Similarity search → Supabase pgvector (match_documents RPC)
 *  3. Chat con contesto RAG → OpenWebUI (OpenAI-compatible) via LangChain
 *  4. Streaming SSE → client
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";

// ── Config ────────────────────────────────────────────────────────────────
const OPENWEBUI_BASE_URL =
  process.env.OPENWEBUI_BASE_URL ?? "http://localhost:8080";
const OPENWEBUI_API_KEY =
  process.env.OPENWEBUI_API_KEY ?? "not-required";
const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_EMBED_MODEL =
  process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
const CHAT_MODEL =
  process.env.OLLAMA_MODEL ?? "llama3.1";

const SYSTEM_PROMPT = `Sei un AI Tutor esperto per EduPlay, una piattaforma di apprendimento gamificata.
Aiuti studenti italiani con corsi di Digital Marketing, Intelligenza Artificiale e Vendite.

REGOLE FONDAMENTALI:
- Rispondi SEMPRE in italiano
- Sii conciso ma completo (max 350 parole)
- Usa esempi pratici e concreti legati al marketing/AI/sales
- Incoraggia sempre lo studente
- Se hai contesto dai materiali del corso, usalo come fonte primaria
- Se non conosci qualcosa, dillo chiaramente senza inventare

STILE:
- Tono amichevole e professionale
- Usa liste (con •) quando hai più di 2 elementi
- Evidenzia concetti chiave in **grassetto**
- Termina con un'osservazione motivante o una domanda di approfondimento

{rag_context}`;

interface ChatBody {
  sessionId?: string;
  courseId?: string | null;
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
}

// ── Embedding via Ollama diretto ─────────────────────────────────────────
async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding ?? null;
  } catch (err) {
    console.warn("[RAG] Embedding failed:", err);
    return null;
  }
}

// ── pgvector similarity search ────────────────────────────────────────────
async function retrieveRAGContext(
  embedding: number[],
  courseId: string | null | undefined
): Promise<string> {
  try {
    const admin = createAdminClient();
    const { data: docs, error } = await admin.rpc("match_documents", {
      query_embedding: embedding,
      match_threshold: 0.55,
      match_count: 4,
      filter_course_id: courseId ?? null,
    });

    if (error || !docs?.length) return "";

    const context = docs
      .map(
        (d: any, i: number) =>
          `[Fonte ${i + 1}${d.title ? ` — ${d.title}` : ""}]\n${
            d.content?.slice(0, 600) ?? ""
          }`
      )
      .join("\n\n");

    return `\n\nCONTESTO DAL MATERIALE DEL CORSO:\n${context}\n\nUsa queste informazioni come riferimento primario per rispondere.`;
  } catch (err) {
    console.warn("[RAG] Vector search failed:", err);
    return "";
  }
}

// ── LangChain ChatOpenAI → OpenWebUI ─────────────────────────────────────
function buildLLM(streaming: boolean) {
  return new ChatOpenAI({
    openAIApiKey: OPENWEBUI_API_KEY,
    modelName: CHAT_MODEL,
    streaming,
    temperature: 0.7,
    maxTokens: 700,
    configuration: {
      baseURL: `${OPENWEBUI_BASE_URL}/api`,
      defaultHeaders: {
        Authorization: `Bearer ${OPENWEBUI_API_KEY}`,
      },
    },
  });
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload non valido" }, { status: 400 });
  }

  const { message, courseId, history = [], sessionId } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "Messaggio vuoto" }, { status: 400 });
  }

  // ── Step 1: Embedding + RAG ────────────────────────────────────────────
  let ragContext = "";
  const embedding = await getEmbedding(message);
  if (embedding) {
    ragContext = await retrieveRAGContext(embedding, courseId);
  }

  // ── Step 2: Build LangChain messages ─────────────────────────────────
  const systemContent = SYSTEM_PROMPT.replace(
    "{rag_context}",
    ragContext || ""
  );

  const langchainHistory = history.slice(-6).map((m) =>
    m.role === "user"
      ? new HumanMessage(m.content)
      : new AIMessage(m.content)
  );

  const messages = [
    new SystemMessage(systemContent),
    ...langchainHistory,
    new HumanMessage(message),
  ];

  // ── Step 3: Stream via OpenWebUI ─────────────────────────────────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
        );

      try {
        const llm = buildLLM(true);
        let fullResponse = "";

        const streamResult = await llm.stream(messages);

        for await (const chunk of streamResult) {
          const token =
            typeof chunk.content === "string"
              ? chunk.content
              : Array.isArray(chunk.content)
              ? chunk.content
                  .map((c: any) => (typeof c === "string" ? c : c.text ?? ""))
                  .join("")
              : "";

          if (token) {
            fullResponse += token;
            send(token);
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));

        // Persist to session (non-blocking)
        if (sessionId && fullResponse) {
          const admin = createAdminClient();
          const updatedMsgs = [
            ...history.slice(-8),
            { role: "user", content: message, timestamp: new Date() },
            {
              role: "assistant",
              content: fullResponse,
              timestamp: new Date(),
            },
          ];
          admin
            .from("ai_chat_sessions")
            .update({
              messages_json: updatedMsgs,
              updated_at: new Date().toISOString(),
            })
            .eq("id", sessionId)
            .then(() => {});
        }
      } catch (err: any) {
        console.error("[AI Tutor] LLM error:", err?.message ?? err);

        const isConnectionError =
          err?.message?.includes("ECONNREFUSED") ||
          err?.message?.includes("fetch failed") ||
          err?.message?.includes("ENOTFOUND");

        const errorMsg = isConnectionError
          ? `\n\n⚠️ **OpenWebUI non raggiungibile** su \`${OPENWEBUI_BASE_URL}\`.\n\n` +
            `Verifica che OpenWebUI sia in esecuzione:\n` +
            `• \`ollama serve\` nel terminale\n` +
            `• Poi apri OpenWebUI e assicurati che sia attivo sulla porta ${OPENWEBUI_BASE_URL.split(":").pop()}\n\n` +
            `In alternativa aggiorna \`OPENWEBUI_BASE_URL\` nell'env con la porta corretta.`
          : `\n\n⚠️ Errore nella risposta: ${err?.message ?? "sconosciuto"}`;

        send(errorMsg);
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disabilita buffering nginx
    },
  });
}
