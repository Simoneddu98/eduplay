"use server";

/**
 * Server Actions — AI Generation (Anthropic)
 *
 * La ANTHROPIC_API_KEY non viene MAI esposta al browser.
 * Tutte le chiamate AI passano esclusivamente qui, lato server.
 * Pattern: ogni action ritorna ActionResult<T> per gestione errori uniforme.
 */

import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./courses";
import type { AIOutline, QuizQuestion } from "@/features/course-creator/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-20250514";

// ─── Helpers ─────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");
  return user;
}

function parseJSON<T>(text: string): T {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as T;
}

/** Wraps a Promise with a timeout — throws a clear Italian error on expiry */
function withTimeout<T>(promise: Promise<T>, ms = 30_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("La generazione ha impiegato troppo tempo. Riprova.")),
      ms
    );
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

function toItalianError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  // Anthropic rate-limit responses include "rate_limit" or "429"
  if (msg.includes("rate_limit") || msg.includes("429")) {
    return "Troppe richieste. Attendi un momento.";
  }
  if (msg.includes("troppo tempo")) return msg; // already Italian
  if (msg.includes("Non autenticato")) return msg;
  return "Si è verificato un errore con l'AI. Riprova o procedi manualmente.";
}

// ─── 1. Genera struttura corso ────────────────────────────────

export async function generateCourseOutlineAction(params: {
  topic: string;
  audience: string;
  duration_hours?: number;
  num_modules?: number;
  level?: string;
}): Promise<ActionResult<AIOutline>> {
  try {
    await requireAuth();

    const result = await withTimeout(
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: `Sei un esperto di instructional design. Crea una struttura completa per un corso e-learning in italiano.

Argomento: ${params.topic}
Pubblico target: ${params.audience || "professionisti"}
Durata totale: ${params.duration_hours ?? 2} ore
Numero di moduli: ${params.num_modules ?? 4}
Livello: ${params.level ?? "base"}

Rispondi SOLO con JSON valido, senza testo aggiuntivo:
{
  "course_title": "...",
  "course_description": "...",
  "learning_objectives": ["Al termine di questo corso saprai..."],
  "total_duration_hours": 2,
  "modules": [{
    "title": "...",
    "description": "...",
    "lessons": [{
      "title": "...",
      "description": "...",
      "content_type": "text",
      "duration_minutes": 15,
      "key_points": ["..."]
    }]
  }]
}

Linee guida: usa verbi di Bloom per gli obiettivi, prevedi almeno un quiz per modulo, titoli di lezione concreti e azionabili.`,
        }],
      }),
      30_000
    );

    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    const outline = parseJSON<AIOutline>(text);
    return { ok: true, data: outline };
  } catch (e) {
    return { ok: false, error: toItalianError(e) };
  }
}

// ─── 2. Genera contenuto lezione ──────────────────────────────

export async function generateLessonContentAction(params: {
  lesson_title: string;
  module_title?: string;
  course_context?: string;
  style?: "teorico" | "pratico" | "narrativo" | "esempi";
  length?: "breve" | "medio" | "dettagliato";
}): Promise<ActionResult<Array<{ type: string; content: string; options?: Record<string, unknown> }>>> {
  try {
    await requireAuth();

    const wordTarget = {
      breve: "200-350 parole (lettura 3 min)",
      medio: "500-700 parole (lettura 7 min)",
      dettagliato: "900-1200 parole (lettura 15 min)",
    }[params.length ?? "medio"];

    const styleDesc = {
      teorico: "accademico, con definizioni e teoria",
      pratico: "diretto, con step pratici e checklist",
      narrativo: "storytelling, casi reali, aneddoti",
      esempi: "esempi concreti e analogie per ogni concetto",
    }[params.style ?? "pratico"];

    const result = await withTimeout(
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{
          role: "user",
          content: `Crea il contenuto di una lezione e-learning in italiano.

Titolo lezione: ${params.lesson_title}
${params.module_title ? `Modulo: ${params.module_title}` : ""}
Contesto corso: ${params.course_context ?? "corso professionale"}
Stile: ${styleDesc}
Lunghezza: ${wordTarget}

Rispondi SOLO con JSON — un array di blocchi di contenuto:
[
  { "type": "text", "content": "<h2>Titolo sezione</h2><p>Testo...</p>" },
  { "type": "callout", "content": "Consiglio importante", "options": { "variant": "tip" } },
  { "type": "text", "content": "<p>Continua...</p>" }
]

Tipi disponibili: "text" (HTML con h2,h3,p,ul,ol,strong,em), "callout" (variant: tip|warning|info|success).
Usa 3-5 blocchi. Il testo principale usa HTML. Includi almeno un callout rilevante.`,
        }],
      }),
      30_000
    );

    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    const blocks = parseJSON<Array<{ type: string; content: string; options?: Record<string, unknown> }>>(text);
    return { ok: true, data: blocks };
  } catch (e) {
    return { ok: false, error: toItalianError(e) };
  }
}

// ─── 3. Genera domande quiz ───────────────────────────────────

export async function generateQuizQuestionsAction(params: {
  lesson_title: string;
  content_text?: string;
  count?: number;
  question_types?: Array<"singola" | "multipla" | "vero_falso" | "aperta">;
}): Promise<ActionResult<QuizQuestion[]>> {
  try {
    await requireAuth();

    // Map Italian type names to internal types
    const typeMap: Record<string, string> = {
      singola: "single",
      multipla: "multiple",
      vero_falso: "true_false",
      aperta: "open",
    };
    const types = (params.question_types ?? ["singola", "multipla", "vero_falso"])
      .map((t) => typeMap[t] ?? t);

    const result = await withTimeout(
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Crea domande quiz e-learning in italiano.

Lezione: ${params.lesson_title}
Contenuto di riferimento: ${params.content_text ? params.content_text.slice(0, 2000) : "Genera in base al titolo"}
Numero domande: ${params.count ?? 5}
Tipi ammessi: ${types.join(", ")}

Rispondi SOLO con JSON:
{
  "questions": [{
    "text": "...",
    "type": "single",
    "options": [{"id": "a", "text": "..."}, {"id": "b", "text": "..."}],
    "correct_ids": ["a"],
    "explanation": "..."
  }]
}

Regole: per true_false usa id "t"=Vero, "f"=Falso. Distrattori plausibili ma chiaramente sbagliati. Spiegazioni educative.`,
        }],
      }),
      30_000
    );

    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    const parsed = parseJSON<{ questions: QuizQuestion[] }>(text);
    const questions = parsed.questions.map((q) => ({ ...q, id: q.id ?? nanoid(8) }));
    return { ok: true, data: questions };
  } catch (e) {
    return { ok: false, error: toItalianError(e) };
  }
}

// ─── 4. Migliora testo ────────────────────────────────────────

export async function improveTextAction(params: {
  text: string;
  instruction: "semplifica" | "coinvolgi" | "aggiungi_esempio" | "correggi" | string;
}): Promise<ActionResult<{ improved: string }>> {
  try {
    await requireAuth();

    const instructionMap: Record<string, string> = {
      semplifica: "Semplifica il linguaggio per un pubblico non esperto, mantieni tutti i concetti chiave",
      coinvolgi: "Rendi il testo più coinvolgente e motivante, usa un tono energico e diretto",
      aggiungi_esempio: "Aggiungi un esempio pratico e concreto al testo, mantenendo il contenuto originale",
      correggi: "Correggi errori grammaticali e di stile, migliora la chiarezza e la scorrevolezza",
    };

    const instr = instructionMap[params.instruction] ?? params.instruction;

    const result = await withTimeout(
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `${instr}. Mantieni il testo in italiano. Rispondi SOLO con JSON:
{"improved": "testo migliorato"}

Testo originale:
${params.text}`,
        }],
      }),
      30_000
    );

    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    return { ok: true, data: parseJSON(text) };
  } catch (e) {
    return { ok: false, error: toItalianError(e) };
  }
}
