import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1:8b";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

const SYSTEM_PROMPT = `Sei un AI Tutor esperto per una piattaforma di apprendimento gamificata chiamata EduPlay.
Aiuti studenti con corsi di Digital Marketing, Intelligenza Artificiale e Vendite.

REGOLE:
- Rispondi SEMPRE in italiano
- Sii conciso ma esaustivo
- Usa esempi pratici e concreti
- Incoraggia lo studente
- Se hai contesto RAG, basati su quello per rispondere
- Se non sai qualcosa, dillo onestamente

STILE:
- Tono amichevole ma professionale
- Usa liste e struttura quando utile
- Massimo 400 parole per risposta`;

interface ChatBody {
  sessionId?: string;
  courseId?: string;
  message: string;
  history: { role: string; content: string }[];
}

export async function POST(req: Request) {
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

  const { message, courseId, history = [] } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: "Messaggio vuoto" }, { status: 400 });
  }

  // --- Step 1: Generate embedding for the user's message ---
  let ragContext = "";
  try {
    const embedRes = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_EMBED_MODEL,
        prompt: message,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (embedRes.ok) {
      const embedData = await embedRes.json();
      const embedding = embedData.embedding;

      if (embedding && Array.isArray(embedding)) {
        // --- Step 2: Similarity search in pgvector ---
        const { data: docs } = await supabase.rpc("match_documents", {
          query_embedding: embedding,
          match_threshold: 0.6,
          match_count: 3,
          filter_course_id: courseId ?? null,
        });

        if (docs && docs.length > 0) {
          ragContext =
            "\n\n---CONTESTO DAL MATERIALE DEL CORSO---\n" +
            docs
              .map(
                (d: any, i: number) =>
                  `[${i + 1}] ${d.content?.slice(0, 500) ?? ""}`
              )
              .join("\n\n") +
            "\n---FINE CONTESTO---\n\n";
        }
      }
    }
  } catch (err) {
    // RAG failure is non-fatal — continue without context
    console.warn("RAG/embedding failed:", err);
  }

  // --- Step 3: Build messages for Ollama ---
  const ollamaMessages = [
    { role: "system", content: SYSTEM_PROMPT + ragContext },
    ...history.slice(-6).map((h) => ({
      role: h.role === "user" ? "user" : "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  // --- Step 4: Call Ollama (streaming) ---
  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 600,
        },
      }),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text();
      console.error("Ollama error:", errText);
      throw new Error(`Ollama returned ${ollamaRes.status}`);
    }

    // Pipe Ollama's NDJSON stream → SSE stream to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = ollamaRes.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value, { stream: true });
            const lines = text.split("\n").filter(Boolean);

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.message?.content) {
                  const chunk = `data: ${JSON.stringify({ content: parsed.message.content })}\n\n`;
                  controller.enqueue(encoder.encode(chunk));
                }
                if (parsed.done) {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        } catch (err) {
          const errChunk = `data: ${JSON.stringify({ content: "\n\n⚠️ Errore nella risposta del modello." })}\n\n`;
          controller.enqueue(encoder.encode(errChunk));
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (ollamaErr: any) {
    console.error("Ollama connection error:", ollamaErr);

    // Fallback: return a helpful error message
    const fallbackMsg = `⚠️ Non riesco a connettermi al modello AI in questo momento.

**Per usare l'AI Tutor:**
1. Installa Ollama: https://ollama.com
2. Avvia il server: \`ollama serve\`
3. Scarica il modello: \`ollama pull ${OLLAMA_MODEL}\`
4. Ricarica questa pagina

Nel frattempo, puoi consultare i materiali del corso nelle lezioni.`;

    return NextResponse.json(
      { response: fallbackMsg, error: "ollama_unavailable" },
      { status: 200 }
    );
  }
}
