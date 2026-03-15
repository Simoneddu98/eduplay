import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { lesson_title, content_text, num_questions = 5, difficulty = "intermediate" } = await req.json();

  if (!lesson_title && !content_text) {
    return NextResponse.json({ error: "Titolo o testo della lezione richiesto" }, { status: 400 });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `Sei un esperto di assessment e-learning. Crea domande quiz in italiano per una lezione.

**Lezione:** ${lesson_title ?? ""}
**Contenuto:** ${content_text ? content_text.slice(0, 2000) : "Genera domande pertinenti al titolo"}
**Numero domande:** ${num_questions}
**Difficoltà:** ${difficulty} (base | intermediate | advanced)

Rispondi SOLO con JSON valido:

{
  "questions": [
    {
      "text": "Testo della domanda?",
      "type": "single",
      "options": [
        {"id": "a", "text": "Risposta A"},
        {"id": "b", "text": "Risposta B"},
        {"id": "c", "text": "Risposta C"},
        {"id": "d", "text": "Risposta D"}
      ],
      "correct_ids": ["a"],
      "explanation": "Spiegazione perché la risposta A è corretta"
    }
  ]
}

Linee guida:
- type può essere: "single" (risposta singola), "multiple" (risposte multiple), "true_false"
- Per true_false: 2 opzioni (id "t" = Vero, id "f" = Falso)
- correct_ids è un array, per "multiple" può avere più elementi
- Variare i tipi di domanda
- Distrattori plausibili ma chiaramente sbagliati se si conosce il contenuto
- Spiegazioni educative e costruttive`,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") throw new Error("Risposta non valida");

    const jsonText = textContent.text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const result = JSON.parse(jsonText);

    // Add nanoid IDs for questions if missing
    const questions = (result.questions ?? []).map((q: Record<string, unknown>) => ({
      ...q,
      id: q.id ?? nanoid(8),
    }));

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("AI quiz generation error:", err);
    return NextResponse.json({ error: "Errore generazione quiz" }, { status: 500 });
  }
}
