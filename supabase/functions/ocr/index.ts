import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? ""
const CONF_THRESHOLD = 0.78

interface OCRItem {
  name: string
  qty: number
  unit: string | null
  price: number
  conf: number
}

interface OCRResponse {
  lines: string[]
  items: OCRItem[]
  total: number | null
  store: string | null
  date: string | null
  conf: number
}

const SYSTEM_PROMPT = `Te egy magyar blokk (kassza-bizonylat) feldolgozó asszisztens vagy.
A képen egy bevásárlási blokkot látsz. Kérd ki az összes tételt.

Válaszolj KIZÁRÓLAG érvényes JSON-nal, más szöveg nélkül, ebben a formátumban:
{
  "items": [
    {
      "name": "Terméknév magyarul",
      "qty": 1,
      "unit": "db",
      "price": 499,
      "conf": 0.95
    }
  ],
  "total": 2490,
  "store": "Bolt neve vagy null",
  "date": "2024-01-15 vagy null"
}

Szabályok:
- "name": eredeti magyar terméknév a blokkon (rövidítés nélkül ha felismerhető)
- "qty": mennyiség számként (pl. 0.5 kg esetén 0.5)
- "unit": "kg", "l", "db", "csomag" stb. — ha nem egyértelmű, "db"
- "price": egységár forintban, egész szám
- "conf": 0.0–1.0, mennyire biztos vagy a felismerésben (< ${CONF_THRESHOLD} = bizonytalan)
- "total": végösszeg forintban vagy null
- "store": bolt neve ha látható, egyébként null
- "date": dátum ISO formátumban (YYYY-MM-DD) vagy null`

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY nincs beállítva" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  let imageBase64: string
  try {
    const body = await req.json() as { image?: string }
    if (!body.image) throw new Error("image mező hiányzik")
    imageBase64 = body.image
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `Hibás kérés: ${(e as Error).message}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  // Ensure proper data URL format
  const imageUrl = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl, detail: "high" },
              },
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0.05,
      }),
    })

    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      throw new Error(`OpenAI hiba ${openaiRes.status}: ${err}`)
    }

    const openaiData = await openaiRes.json() as {
      choices: Array<{ message: { content: string } }>
    }

    const raw = openaiData.choices[0]?.message?.content ?? ""

    // Extract JSON from response (strip markdown fences if present)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("Nem sikerült JSON-t kinyerni a válaszból")

    const parsed = JSON.parse(jsonMatch[0]) as {
      items?: OCRItem[]
      total?: number | null
      store?: string | null
      date?: string | null
    }

    const items: OCRItem[] = (parsed.items ?? []).map((item) => ({
      name: String(item.name ?? "").trim(),
      qty: Number(item.qty) || 1,
      unit: item.unit ? String(item.unit) : null,
      price: Math.round(Number(item.price) || 0),
      conf: Math.min(1, Math.max(0, Number(item.conf) || 0.8)),
    }))

    const response: OCRResponse = {
      lines: [],
      items,
      total: parsed.total ? Math.round(Number(parsed.total)) : null,
      store: parsed.store ? String(parsed.store) : null,
      date: parsed.date ? String(parsed.date) : null,
      conf: items.length > 0
        ? items.reduce((s, i) => s + i.conf, 0) / items.length
        : 0,
    }

    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  }
})
