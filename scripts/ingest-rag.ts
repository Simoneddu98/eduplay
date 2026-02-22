#!/usr/bin/env tsx
/**
 * EduPlay — RAG Ingestion Script
 * ================================
 * Carica i contenuti delle lezioni in pgvector (Supabase) per il RAG dell'AI Tutor.
 *
 * Cosa fa:
 *  1. Legge tutte le lezioni pubblicate da Supabase
 *  2. Divide il testo in chunk da ~500 token con overlap
 *  3. Genera embedding con Ollama (nomic-embed-text)
 *  4. Inserisce/aggiorna i documenti nella tabella rag_documents
 *
 * Uso:
 *  cd apps/web
 *  npx tsx ../../scripts/ingest-rag.ts
 *
 * Opzioni env (le legge da .env.local):
 *  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OLLAMA_BASE_URL, OLLAMA_EMBED_MODEL
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// ── Carica .env.local ────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local non trovato. Assicurati di eseguire lo script da apps/web/");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
const CHUNK_SIZE = 500;    // caratteri per chunk
const CHUNK_OVERLAP = 100; // overlap tra chunk

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY richiesti nel .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Text chunking ─────────────────────────────────────────────────────────
function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (!text || text.length <= size) return [text].filter(Boolean);
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    // Cerca fine frase o spazio per non spezzare a metà parola
    let cutAt = end;
    if (end < text.length) {
      const periodIdx = text.lastIndexOf(".", end);
      const spaceIdx = text.lastIndexOf(" ", end);
      cutAt = Math.max(periodIdx > start ? periodIdx + 1 : 0, spaceIdx > start ? spaceIdx : end);
      if (cutAt <= start) cutAt = end;
    }
    chunks.push(text.slice(start, cutAt).trim());
    start = cutAt - overlap;
    if (start < 0) start = 0;
    if (start >= end) break;
  }
  return chunks.filter((c) => c.length > 20);
}

// ── Embedding via Ollama ──────────────────────────────────────────────────
async function embed(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`  ⚠️ Ollama error: ${err.slice(0, 100)}`);
      return null;
    }
    const data = await res.json();
    return data.embedding ?? null;
  } catch (err: any) {
    console.warn(`  ⚠️ Embedding failed: ${err.message}`);
    return null;
  }
}

// ── Sleep utility ─────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 EduPlay RAG Ingestion");
  console.log(`   Supabase: ${SUPABASE_URL}`);
  console.log(`   Ollama:   ${OLLAMA_BASE_URL} (${EMBED_MODEL})`);
  console.log("");

  // Verifica connessione Ollama
  try {
    const pingRes = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!pingRes.ok) throw new Error("not ok");
    const tags = await pingRes.json();
    const models = tags.models?.map((m: any) => m.name) ?? [];
    if (!models.some((m: string) => m.startsWith(EMBED_MODEL.split(":")[0]))) {
      console.warn(`⚠️  Modello "${EMBED_MODEL}" non trovato in Ollama.`);
      console.warn(`   Modelli disponibili: ${models.join(", ") || "nessuno"}`);
      console.warn(`   Esegui: ollama pull ${EMBED_MODEL}`);
    } else {
      console.log(`✅ Ollama connesso — modello "${EMBED_MODEL}" disponibile`);
    }
  } catch {
    console.error(`❌ Ollama non raggiungibile su ${OLLAMA_BASE_URL}`);
    console.error(`   Avvia Ollama con: ollama serve`);
    process.exit(1);
  }

  // Fetch lezioni + corsi
  console.log("\n📚 Caricamento lezioni da Supabase...");
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("id, title, description, content, course_id, order_index")
    .eq("is_published", true)
    .order("course_id")
    .order("order_index");

  if (lessonsError || !lessons) {
    console.error("❌ Errore nel caricamento lezioni:", lessonsError);
    process.exit(1);
  }

  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, description, category");
  const courseMap = new Map((courses ?? []).map((c: any) => [c.id, c]));

  console.log(`   ${lessons.length} lezioni trovate`);

  // Conta documenti esistenti
  const { count: existingCount } = await supabase
    .from("rag_documents")
    .select("*", { count: "exact", head: true });
  console.log(`   ${existingCount ?? 0} documenti già in pgvector`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  // ── Processa lezioni ────────────────────────────────────────────────────
  for (const lesson of lessons) {
    const course = courseMap.get(lesson.course_id);
    const courseTitle = course?.title ?? "Corso sconosciuto";

    // Costruisci testo da indicizzare
    const textParts: string[] = [];
    if (lesson.title) textParts.push(`Lezione: ${lesson.title}`);
    if (courseTitle) textParts.push(`Corso: ${courseTitle}`);
    if (lesson.description) textParts.push(lesson.description);

    // Estrai testo dal content (potrebbe essere HTML, JSON quiz, o testo puro)
    if (lesson.content) {
      let contentText = "";
      if (typeof lesson.content === "string") {
        // Strip HTML tags
        contentText = lesson.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        // Se è JSON (quiz), estrai le domande
        if (contentText.startsWith("{") || contentText.startsWith("[")) {
          try {
            const parsed = JSON.parse(lesson.content);
            if (parsed.questions) {
              contentText = parsed.questions
                .map((q: any) => `Q: ${q.question}\nA: ${q.options?.[q.correct] ?? ""}`)
                .join("\n");
            }
          } catch {}
        }
      }
      if (contentText.length > 20) textParts.push(contentText);
    }

    const fullText = textParts.join("\n\n");
    if (!fullText || fullText.length < 30) {
      console.log(`  ⏭️  Skip "${lesson.title}" — testo troppo breve`);
      skipped++;
      continue;
    }

    // Chunk il testo
    const chunks = chunkText(fullText);
    console.log(`\n📄 "${lesson.title}" → ${chunks.length} chunk(s)`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkLabel = chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : "";

      // Genera embedding
      process.stdout.write(`  🧠 Embedding chunk${chunkLabel}...`);
      const vector = await embed(chunk);

      if (!vector) {
        console.log(" ❌ fallito");
        errors++;
        continue;
      }
      console.log(` ✅ (${vector.length}d)`);

      // Upsert in rag_documents
      const { error: upsertError } = await supabase
        .from("rag_documents")
        .upsert(
          {
            course_id: lesson.course_id,
            lesson_id: lesson.id,
            title: `${courseTitle} — ${lesson.title}${chunkLabel}`,
            content: chunk,
            embedding: vector,
            metadata: {
              course_title: courseTitle,
              course_category: course?.category,
              lesson_order: lesson.order_index,
              chunk_index: i,
              total_chunks: chunks.length,
              ingested_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "lesson_id, chunk_index",
            ignoreDuplicates: false,
          }
        );

      if (upsertError) {
        // Se onConflict non supportato, prova insert
        const { error: insertError } = await supabase
          .from("rag_documents")
          .insert({
            course_id: lesson.course_id,
            lesson_id: lesson.id,
            title: `${courseTitle} — ${lesson.title}${chunkLabel}`,
            content: chunk,
            embedding: vector,
            metadata: {
              course_title: courseTitle,
              chunk_index: i,
              ingested_at: new Date().toISOString(),
            },
          });

        if (insertError) {
          console.warn(`  ⚠️ Insert error: ${insertError.message}`);
          errors++;
        } else {
          inserted++;
        }
      } else {
        inserted++;
      }

      // Rate limit: evita di sovraccaricare Ollama
      await sleep(100);
    }
  }

  // ── Ingesta anche le descrizioni dei corsi ─────────────────────────────
  console.log("\n📚 Indicizzazione descrizioni corsi...");
  for (const course of courses ?? []) {
    if (!course.description || course.description.length < 30) continue;
    const text = `Corso: ${course.title}\nCategoria: ${course.category}\n${course.description}`;

    process.stdout.write(`  🧠 "${course.title}"...`);
    const vector = await embed(text);

    if (!vector) { console.log(" ❌"); errors++; continue; }
    console.log(" ✅");

    const { error } = await supabase.from("rag_documents").insert({
      course_id: course.id,
      lesson_id: null,
      title: `Panoramica: ${course.title}`,
      content: text,
      embedding: vector,
      metadata: { type: "course_overview", category: course.category },
    });

    if (!error) inserted++;
    await sleep(100);
  }

  // ── Riepilogo ─────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log(`✅ Completato!`);
  console.log(`   Inseriti/aggiornati: ${inserted}`);
  console.log(`   Saltati (testo breve): ${skipped}`);
  console.log(`   Errori: ${errors}`);

  // Verifica finale
  const { count: finalCount } = await supabase
    .from("rag_documents")
    .select("*", { count: "exact", head: true });
  console.log(`   Totale documenti in pgvector: ${finalCount ?? 0}`);
  console.log("\n🎉 L'AI Tutor ora ha accesso ai contenuti del corso!");
}

main().catch((err) => {
  console.error("❌ Errore fatale:", err);
  process.exit(1);
});
