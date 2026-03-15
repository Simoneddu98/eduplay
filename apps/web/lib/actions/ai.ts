"use server";

/**
 * Server Actions — AI Generation
 *
 * Tutte le chiamate Anthropic passano qui, lato server.
 * La ANTHROPIC_API_KEY non viene mai esposta al browser.
 * Pattern: ogni action ritorna ActionResult<T> per gestione errori uniforme.
 */

import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./courses";
import type { AIOutline, QuizQuestion } from "@/features/course-creator/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-20250514";

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

// ─── 1. Genera struttura corso ────────────────────────────────

export async function generateCourseOutlineAction(params: {
  topic: string;
  audience: string;
  duration_hours?: number;
  num_modules?: number;
}): Promise<ActionResult<AIOutline>> {
  try {
    await requireAuth();

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `Sei un esperto di instructional design. Crea una struttura completa per un corso e-learning in italiano.

Argomento: ${params.topic}
Pubblico target: ${params.audience}
Durata: ${params.duration_hours ?? 2} ore
Moduli: ${params.num_modules ?? 4}

Rispondi SOLO con JSON valido:
{
  "course_title": "...",
  "course_description": "...",
  "learning_objectives": ["Al termine..."],
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

Linee guida: 3-5 moduli, 2-4 lezioni/modulo, usa verbi di Bloom per gli obiettivi, almeno un quiz per modulo.`,
      }],
    });

    const text = msg.content.find((c) => c.type === "text")?.text ?? "";
    const outline = parseJSON<AIOutline>(text);
    return { ok: true, data: outline };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore generazione struttura" };
  }
}

// ─── 2. Genera contenuto lezione ──────────────────────────────

export async function generateLessonContentAction(params: {
  lesson_title: string;
  course_context?: string;
  audience?: string;
  style?: "formale" | "conversazionale" | "tecnico";
  length?: "breve" | "medio" | "lungo";
}): Promise<ActionResult<{ html: string; summary: string; key_takeaways: string[] }>> {
  try {
    await requireAuth();

    const wordTarget = { breve: "300-400", medio: "500-700", lungo: "800-1000" }[params.length ?? "medio"];

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `Crea contenuto per una lezione e-learning in italiano.

Titolo: ${params.lesson_title}
Contesto corso: ${params.course_context ?? "corso professionale"}
Pubblico: ${params.audience ?? "professionisti"}
Stile: ${params.style ?? "conversazionale"}
Lunghezza: ${wordTarget} parole

Rispondi SOLO con JSON:
{
  "content_html": "<h2>...</h2><p>...</p>",
  "summary": "...",
  "key_takeaways": ["...", "...", "..."]
}

L'HTML deve usare: h2, h3, p, ul, ol, li, strong, em. 3-5 sezioni. Esempi pratici.`,
      }],
    });

    const text = msg.content.find((c) => c.type === "text")?.text ?? "";
    return { ok: true, data: parseJSON(text) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore generazione contenuto" };
  }
}

// ─── 3. Genera domande quiz ───────────────────────────────────

export async function generateQuizQuestionsAction(params: {
  lesson_title: string;
  content_text?: string;
  num_questions?: number;
  types?: Array<"single" | "multiple" | "true_false">;
}): Promise<ActionResult<QuizQuestion[]>> {
  try {
    await requireAuth();

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `Crea domande quiz e-learning in italiano.

Lezione: ${params.lesson_title}
Contenuto: ${params.content_text ? params.content_text.slice(0, 2000) : "Genera in base al titolo"}
Numero domande: ${params.num_questions ?? 5}
Tipi ammessi: ${(params.types ?? ["single", "multiple", "true_false"]).join(", ")}

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

Per true_false: id "t"=Vero, "f"=Falso. Distrattori plausibili. Spiegazioni educative.`,
      }],
    });

    const text = msg.content.find((c) => c.type === "text")?.text ?? "";
    const result = parseJSON<{ questions: QuizQuestion[] }>(text);
    const questions = result.questions.map((q) => ({ ...q, id: q.id ?? nanoid(8) }));
    return { ok: true, data: questions };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore generazione quiz" };
  }
}

// ─── 4. Migliora testo ────────────────────────────────────────

export async function improveTextAction(params: {
  text: string;
  instruction: "chiarisci" | "accorcia" | "espandi" | "rendi_formale" | "rendi_semplice" | string;
}): Promise<ActionResult<{ improved: string }>> {
  try {
    await requireAuth();

    const instructions: Record<string, string> = {
      chiarisci: "Rendi il testo più chiaro e facile da capire",
      accorcia: "Riduci il testo del 30% mantenendo tutti i concetti chiave",
      espandi: "Espandi il testo con più dettagli ed esempi pratici",
      rendi_formale: "Rendi il testo più professionale e formale",
      rendi_semplice: "Semplifica il linguaggio per un pubblico non esperto",
    };

    const instr = instructions[params.instruction] ?? params.instruction;

    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `${instr}. Mantieni il testo in italiano. Rispondi con JSON:
{"improved": "testo migliorato"}

Testo originale:
${params.text}`,
      }],
    });

    const text = msg.content.find((c) => c.type === "text")?.text ?? "";
    return { ok: true, data: parseJSON(text) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore miglioramento testo" };
  }
}
