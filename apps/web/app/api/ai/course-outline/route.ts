import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  // Check trainer role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["trainer", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Accesso riservato ai trainer" }, { status: 403 });
  }

  const body = await req.json();
  const { topic, audience, duration_hours, language = "it" } = body;

  if (!topic || !audience) {
    return NextResponse.json(
      { error: "Argomento e pubblico target sono obbligatori" },
      { status: 400 }
    );
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Sei un esperto di instructional design. Crea una struttura completa per un corso e-learning in italiano.

**Argomento del corso:** ${topic}
**Pubblico target:** ${audience}
**Durata totale stimata:** ${duration_hours ?? 2} ore
**Lingua:** ${language === "it" ? "Italiano" : language}

Rispondi SOLO con un oggetto JSON valido con questa struttura esatta:

{
  "course_title": "Titolo del corso",
  "course_description": "Descrizione coinvolgente del corso in 2-3 frasi",
  "learning_objectives": [
    "Al termine del corso, lo studente sarà in grado di...",
    "..."
  ],
  "total_duration_hours": 2,
  "modules": [
    {
      "title": "Nome Modulo 1",
      "description": "Descrizione breve del modulo",
      "lessons": [
        {
          "title": "Titolo lezione",
          "description": "Descrizione lezione",
          "content_type": "text",
          "duration_minutes": 15,
          "key_points": ["punto 1", "punto 2", "punto 3"]
        }
      ]
    }
  ]
}

Linee guida:
- 3-5 moduli
- 2-4 lezioni per modulo
- Ogni lezione 10-20 minuti
- content_type può essere: "text", "video", "quiz", "interactive"
- Includi almeno un quiz per modulo
- Obiettivi di apprendimento specifici e misurabili (usa i verbi di Bloom)`,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("Risposta AI non valida");
    }

    // Strip markdown code blocks if present
    const jsonText = textContent.text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const outline = JSON.parse(jsonText);

    return NextResponse.json({ outline });
  } catch (err) {
    console.error("AI outline generation error:", err);
    return NextResponse.json(
      { error: "Errore durante la generazione. Riprova." },
      { status: 500 }
    );
  }
}
