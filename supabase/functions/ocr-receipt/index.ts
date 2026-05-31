// ocr-receipt Edge Function
// Proxies OpenAI GPT-4o-mini Vision API for receipt OCR.
// The client sends a base64-encoded JPEG image; this function returns structured item data.
// OPENAI_API_KEY is read from Supabase secrets — never from the client.
//
// Önfejlesztő rész: a felhasználó korábbi kézi javításait (ocr_corrections tábla) glosszáriumként
// visszainjektáljuk a promptba, így a modell idővel egyre jobban ismeri fel a tipikus rövidítéseket.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB hard limit
const GLOSSARY_LIMIT = 40; // hány korábbi javítást injektálunk a promptba

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Magyar OCR prompt — a modellt a tételek pontos kiolvasására utasítja.
// A logikát az Edge Functionben tartjuk, hogy ne szivárogjon a kliensre.
const RECEIPT_OCR_SYSTEM_PROMPT = `Te egy magyar bolti blokk (nyugta) feldolgozó rendszer vagy. A felhasználó egy magyar élelmiszerbolti blokk fényképét küldi (ALDI, Lidl, Spar, Tesco, Penny, CBA, kisboltok stb.). A fotó ferde, gyűrött vagy gyenge fényű lehet.

Feladatod: olvasd ki a MEGVÁSÁROLT TERMÉKEKET pontosan, és add vissza strukturált JSON-ként.

VÁLASZ FORMÁTUM — KIZÁRÓLAG valid JSON, markdown és magyarázat nélkül:
{
  "items": [
    { "name": "...", "quantity": 1, "unit": "db", "unit_price": 0, "total_price": 0, "category": "...", "confidence": 0.0 }
  ],
  "total": 0,
  "store": "ALDI",
  "date": "YYYY-MM-DD"
}

NÉV (name):
- A tényleges terméknév, tisztán. Bővítsd ki az egyértelmű magyar rövidítéseket olvasható formára:
  "Parad.koktél" → "Paradicsom koktél", "burg.pogácsa" → "Burgonyás pogácsa",
  "LM trapp.sz." → "Trappista sajt", "Felsőcombfilé" → "Csirke felsőcombfilé",
  "Bécsi virsli 2x200g" → "Bécsi virsli". Ha a rövidítés nem egyértelmű, hagyd meg az eredetit.
- NE tedd a névbe: ÁFA-kódot (a sor elején álló C00/B00/A00/E00, vagy elmosódva COO/BOO),
  cikkszámot/PLU-t (hosszú számsor, pl. 10000220319), a "mennyiség × ár" részt, sem a
  "Ft", "Ft/DB", "Ft/KG" jelölést.

MENNYISÉG ÉS ÁR:
- "quantity": darabszám vagy súly. A magyar tizedes elválasztó a VESSZŐ: "1,021 KG" → 1.021.
- "unit": "db" | "kg" | "g" | "l" | "csomag". Ha nincs jelölve, "db".
- Tipikus minták:
  "2 DB * 249 Ft/DB"      → quantity 2,     unit "db", unit_price 249,  total_price 498
  "6 DB * 179 Ft/DB"      → quantity 6,     unit "db", unit_price 179,  total_price 1074
  "1,021 KG * 1849 Ft/KG" → quantity 1.021, unit "kg", unit_price 1849, total_price 1888
- Ha CSAK egy szám áll a sor jobb szélén (nincs "* ... Ft/DB" rész), az a SOR VÉGÖSSZEGE (total_price).
  Ilyenkor: quantity 1 esetén unit_price = total_price; quantity > 1 esetén unit_price = total_price / quantity.

KIHAGYANDÓ SOROK (NE szerepeljenek az "items" között):
- Betét-/visszaváltási díj: "visszaváltási díj", "visszavált.díj", "betétdíj", "DRS", "REpont", "göngyöleg".
- Zacskó/szatyor díj, kerekítés, "RÉSZÖSSZESEN", "ÖSSZESEN", bankkártya/fizetés sorok,
  adószám, NAV/AP sorok, kedvezmény-összesítő, pontgyűjtő sorok.

VÉGÖSSZEG (total): az "ÖSSZESEN" sor értéke (NEM a "RÉSZÖSSZESEN"). Ha nem látszik, null.

BOLT (store): a márkanév tisztán, ne a cégforma. "ALDI MAGYARORSZÁG ÉLELMISZER Bt." → "ALDI",
"LIDL MAGYARORSZÁG BT." → "Lidl". Ha csak a cég látszik (pl. "HANSA INVEST ZRT."), de van bolt-megnevezés
(pl. "Paks Italház"), azt használd. Ha bizonytalan, null.

DÁTUM (date): a vásárlás dátuma ISO formátumban (YYYY-MM-DD). Magyar "2026.05.15" → "2026-05-15". Ha nincs, null.

KATEGÓRIA (category): rövid magyar kategória, pl. "Pékáru", "Tejtermék", "Hús", "Ital",
"Zöldség/Gyümölcs", "Édesség", "Háztartás", "Egyéb".

CONFIDENCE: 0.0–1.0 — mennyire vagy biztos a tételben (név + ár). Halvány, elmosódott vagy
bizonytalanul olvasott sornál adj 0.78 ALATTI értéket, így a felhasználó tudja, mit kell ellenőriznie.`;

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
): Response {
  return jsonResponse({ error: { code, message } }, status);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OcrReceiptItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  total_price: number | null;
  category: string | null;
  confidence: number | null;
}

interface OcrReceiptResult {
  items: OcrReceiptItem[];
  total: number | null;
  store: string | null;
  date: string | null;
}

// Sorok, amelyek nem termékek — defenzív szűrés, ha a modell mégis átengedi őket.
const NON_PRODUCT_RE =
  /visszavált|betétd[íi]j|göngyöleg|\bDRS\b|REpont|részösszesen|összesen|kerek[íi]t/i;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.9;
  return Math.min(1, Math.max(0, n));
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Only POST is supported");
  }

  // ------------------------------------------------------------------
  // 1. Authenticate the caller via Supabase JWT
  // ------------------------------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(
      401,
      "UNAUTHORIZED",
      "Missing or malformed Authorization header",
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse(401, "UNAUTHORIZED", "Invalid or expired JWT");
  }

  // ------------------------------------------------------------------
  // 2. Body size check (5 MB hard limit)
  // ------------------------------------------------------------------
  const contentLength = req.headers.get("Content-Length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return errorResponse(
      413,
      "PAYLOAD_TOO_LARGE",
      "Request body exceeds the 5 MB limit",
    );
  }

  const rawBytes = new Uint8Array(await req.arrayBuffer());
  if (rawBytes.byteLength > MAX_BODY_BYTES) {
    return errorResponse(
      413,
      "PAYLOAD_TOO_LARGE",
      "Request body exceeds the 5 MB limit",
    );
  }

  // ------------------------------------------------------------------
  // 3. Parse and validate request body
  // ------------------------------------------------------------------
  let imageBase64: string;
  try {
    const body = JSON.parse(new TextDecoder().decode(rawBytes));
    if (
      typeof body?.imageBase64 !== "string" ||
      body.imageBase64.length === 0
    ) {
      return errorResponse(
        422,
        "INVALID_BODY",
        "Body must contain a non-empty 'imageBase64' string field",
      );
    }
    imageBase64 = body.imageBase64;
  } catch {
    return errorResponse(422, "INVALID_JSON", "Request body is not valid JSON");
  }

  // ------------------------------------------------------------------
  // 4. Tanuló glosszárium — a felhasználó korábbi javításai
  //    (RLS a user_id-re szűr; ha üres vagy hibázik, csak kihagyjuk)
  // ------------------------------------------------------------------
  let glossaryBlock = "";
  try {
    const { data: corrections } = await supabase
      .from("ocr_corrections")
      .select("raw_name, corrected_name")
      .order("use_count", { ascending: false })
      .limit(GLOSSARY_LIMIT);

    if (corrections && corrections.length > 0) {
      const lines = (
        corrections as Array<{ raw_name: string; corrected_name: string }>
      )
        .map((c) => `- "${c.raw_name}" → "${c.corrected_name}"`)
        .join("\n");
      glossaryBlock =
        `\n\nISMERT JAVÍTÁSI SZÓTÁR (a felhasználó korábbi kézi javításai). Ha egy blokkon szereplő ` +
        `(rövidített vagy hibásan olvasott) név erősen egyezik a bal oldalival, a "name" mezőbe a ` +
        `jobb oldali kanonikus nevet írd:\n${lines}`;
    }
  } catch (glossaryError) {
    console.error("Glossary fetch failed (non-fatal):", glossaryError);
  }

  // ------------------------------------------------------------------
  // 5. Call OpenAI Vision API
  // ------------------------------------------------------------------
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    console.error("OPENAI_API_KEY secret is not configured");
    return errorResponse(
      500,
      "CONFIGURATION_ERROR",
      "OpenAI API key is not configured on the server",
    );
  }

  const startMs = Date.now();
  let openaiResponse: Response;

  try {
    openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 3000,
        temperature: 0.05,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: RECEIPT_OCR_SYSTEM_PROMPT + glossaryBlock,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Dolgozd fel ezt a bevásárlási blokkot és add vissza a strukturált JSON adatokat.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
      }),
    });
  } catch (networkError) {
    console.error("OpenAI network error:", networkError);
    return errorResponse(
      502,
      "UPSTREAM_ERROR",
      "Failed to reach the OpenAI API",
    );
  }

  if (!openaiResponse.ok) {
    const errText = await openaiResponse.text();
    console.error(
      `OpenAI API error ${openaiResponse.status}:`,
      errText.slice(0, 500),
    );
    return errorResponse(
      502,
      "UPSTREAM_ERROR",
      `OpenAI returned HTTP ${openaiResponse.status}`,
    );
  }

  // ------------------------------------------------------------------
  // 6. Parse OpenAI response and normalize structured data
  // ------------------------------------------------------------------
  let result: OcrReceiptResult;

  try {
    const completion = await openaiResponse.json();
    const rawContent: string = completion?.choices?.[0]?.message?.content ?? "";

    // response_format=json_object miatt tiszta JSON-t kapunk, de a fence-eket
    // defenzíven még levágjuk.
    const cleaned = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as {
      items?: unknown[];
      total?: unknown;
      store?: unknown;
      date?: unknown;
    };

    if (!Array.isArray(parsed?.items)) {
      throw new Error("Parsed result is missing 'items' array");
    }

    const items: OcrReceiptItem[] = parsed.items
      .map((raw): OcrReceiptItem => {
        const it = raw as Record<string, unknown>;
        const name = String(it.name ?? "").trim();
        const quantity = toNumberOrNull(it.quantity) ?? 1;
        let unitPrice = toNumberOrNull(it.unit_price);
        let totalPrice = toNumberOrNull(it.total_price);

        // Egységár / sorösszeg kiegészítése, ha csak az egyik érkezett meg.
        if (unitPrice === null && totalPrice !== null) {
          unitPrice =
            quantity > 0 ? Math.round(totalPrice / quantity) : totalPrice;
        }
        if (totalPrice === null && unitPrice !== null) {
          totalPrice = Math.round(unitPrice * quantity);
        }

        return {
          name,
          quantity,
          unit: it.unit ? String(it.unit) : null,
          unit_price: unitPrice,
          total_price: totalPrice,
          category: it.category ? String(it.category) : null,
          confidence: clamp01(Number(it.confidence ?? 0.9)),
        };
      })
      // Üres nevű és nem-termék (díj/összesítő) sorok kiszűrése.
      .filter((it) => it.name.length > 0 && !NON_PRODUCT_RE.test(it.name));

    result = {
      items,
      total: toNumberOrNull(parsed.total),
      store: parsed.store ? String(parsed.store) : null,
      date: parsed.date ? String(parsed.date) : null,
    };
  } catch (parseError) {
    console.error("JSON parse error from OpenAI response:", parseError);
    return errorResponse(
      422,
      "PARSE_ERROR",
      "Could not parse the structured receipt data from the OCR response",
    );
  }

  const latencyMs = Date.now() - startMs;

  // ------------------------------------------------------------------
  // 7. Audit log — no sensitive data (no image, no raw OCR text)
  // ------------------------------------------------------------------
  console.log(
    JSON.stringify({
      event: "ocr_receipt",
      user_id: user.id,
      item_count: result.items.length,
      latency_ms: latencyMs,
      store: result.store,
      date: result.date,
    }),
  );

  return jsonResponse(result, 200);
});
