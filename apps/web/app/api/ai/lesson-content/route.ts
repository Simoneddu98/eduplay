import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { lesson_title, key_points, course_context, audience } = await req.json();

  if (!lesson_title) {
    return NextResponse.json({ error: "Titolo lezione obbligatorio" }, { status: 400 });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `Sei un esperto di instructional design e copywriting educativo. Crea il contenuto testuale per una lezione e-learning in italiano.

**Titolo lezione:** ${lesson_title}
**Contesto corso:** ${course_context ?? "corso professionale"}
**Pubblico target:** ${audience ?? "professionisti"}
**Punti chiave da coprire:** ${(key_points ?? []).join(", ") || "da determinare in base al titolo"}

Rispondi SOLO con JSON valido:

{
  "content_html": "<h2>Titolo sezione</h2><p>Testo della lezione con paragrafi ben strutturati, esempi pratici e spiegazioni chiare...</p>",
  "summary": "Breve riassunto della lezione in 1-2 frasi",
  "key_takeaways": ["Punto chiave 1", "Punto chiave 2", "Punto chiave 3"]
}

Il content_html deve:
- Usare tag HTML semantici: h2, h3, p, ul, ol, li, strong, em
- Avere 3-5 sezioni ben distinte
- Includere esempi pratici e casi d'uso reali
- Essere scritto in italiano professionale ma accessibile
- Lunghezza: 400-800 parole`,
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
    return NextResponse.json({ result });
  } catch (err) {
    console.error("AI lesson content error:", err);
    return NextResponse.json({ error: "Errore generazione contenuto" }, { status: 500 });
  }
}
