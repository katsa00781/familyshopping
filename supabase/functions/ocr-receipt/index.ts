/// <reference path="./deno.d.ts" />
// ocr-receipt Edge Function
// Proxies the Anthropic (Claude Haiku 4.5) Vision API for receipt OCR.
// The client sends a base64-encoded JPEG image; this function returns structured item data.
// A JSON-séma kényszerítésével (structured outputs) garantáltan valid JSON-t kapunk.
// ANTHROPIC_API_KEY is read from Supabase secrets — never from the client.
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
    { "raw_name": "...", "name": "...", "quantity": 1, "unit": "db", "unit_price": 0, "total_price": 0, "category": "...", "confidence": 0.0 }
  ],
  "total": 0,
  "store": "ALDI",
  "date": "YYYY-MM-DD"
}

NYERS NÉV (raw_name) — KRITIKUS a tanuláshoz:
- A terméksor szövege BETŰHÍVEN, AHOGY A BLOKKON SZEREPEL, rövidítésekkel együtt
  (pl. "Parad.koktél", "burg.pogácsa", "LM trapp.sz.", "Csirkecombf.kgvák.").
- CSAK ezt hagyd el belőle: a sor elején álló ÁFA-kódot (C00/B00/A00/E00, elmosódva COO/BOO),
  a cikkszámot/PLU-t (hosszú számsor), a "mennyiség × ár" részt és a "Ft"/"Ft/DB"/"Ft/KG" jelölést.
- NE bővítsd, NE javítsd, NE értelmezd — ez a kulcs, amivel a rendszer felismeri ugyanazt a
  terméket a következő blokkokon, ezért stabilnak kell lennie.

NÉV (name):
- A tényleges, tiszta terméknév. Bővítsd ki az egyértelmű magyar rövidítéseket olvasható formára:
  "Parad.koktél" → "Paradicsom koktél", "burg.pogácsa" → "Burgonyás pogácsa",
  "LM trapp.sz." → "Trappista sajt", "Felsőcombfilé" → "Csirke felsőcombfilé",
  "Bécsi virsli 2x200g" → "Bécsi virsli". Ha a rövidítés nem egyértelmű, hagyd meg az eredetit.
- Ugyanazokat a részeket hagyd el, mint a raw_name-nél (ÁFA-kód, cikkszám, mennyiség×ár, Ft jelölés).

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

// A válasz alakját strukturált kimenettel (output_config.format) kényszerítjük → garantáltan
// valid JSON. A séma minden mezőt megkövetel (a nullázható mezők is), additionalProperties tiltva.
const RECEIPT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          raw_name: { type: "string" },
          name: { type: "string" },
          quantity: { type: ["number", "null"] },
          unit: { type: ["string", "null"] },
          unit_price: { type: ["number", "null"] },
          total_price: { type: ["number", "null"] },
          category: { type: ["string", "null"] },
          confidence: { type: ["number", "null"] },
        },
        required: [
          "raw_name",
          "name",
          "quantity",
          "unit",
          "unit_price",
          "total_price",
          "category",
          "confidence",
        ],
      },
    },
    total: { type: ["number", "null"] },
    store: { type: ["string", "null"] },
    date: { type: ["string", "null"] },
  },
  required: ["items", "total", "store", "date"],
};

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
  raw_name: string;
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
        `\n\nISMERT JAVÍTÁSI SZÓTÁR (a felhasználó korábbi kézi javításai). A bal oldal a blokkon ` +
        `BETŰHÍVEN szereplő (rövidített) szöveg, a jobb oldal a helyes terméknév. Ha egy tétel ` +
        `"raw_name" mezője — kis-/nagybetűtől eltekintve — erősen egyezik egy bal oldali kulccsal, ` +
        `akkor a "name" mezőbe KÖTELEZŐEN a hozzá tartozó jobb oldali nevet írd (a "raw_name" maradjon ` +
        `a blokkon látható eredeti szöveg):\n${lines}`;
    }
  } catch (glossaryError) {
    console.error("Glossary fetch failed (non-fatal):", glossaryError);
  }

  // ------------------------------------------------------------------
  // 5. Call Anthropic (Claude Haiku 4.5) Vision API
  // ------------------------------------------------------------------
  const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicApiKey) {
    console.error("ANTHROPIC_API_KEY secret is not configured");
    return errorResponse(
      500,
      "CONFIGURATION_ERROR",
      "Anthropic API key is not configured on the server",
    );
  }

  const startMs = Date.now();
  let anthropicResponse: Response;

  try {
    anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        temperature: 0,
        system: RECEIPT_OCR_SYSTEM_PROMPT + glossaryBlock,
        // Structured outputs: a séma kényszeríti a válasz alakját → mindig valid JSON.
        output_config: {
          format: { type: "json_schema", schema: RECEIPT_JSON_SCHEMA },
        },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Dolgozd fel ezt a bevásárlási blokkot és add vissza a strukturált JSON adatokat.",
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });
  } catch (networkError) {
    console.error("Anthropic network error:", networkError);
    return errorResponse(
      502,
      "UPSTREAM_ERROR",
      "Failed to reach the Anthropic API",
    );
  }

  if (!anthropicResponse.ok) {
    const errText = await anthropicResponse.text();
    console.error(
      `Anthropic API error ${anthropicResponse.status}:`,
      errText.slice(0, 500),
    );
    return errorResponse(
      502,
      "UPSTREAM_ERROR",
      `Anthropic returned HTTP ${anthropicResponse.status}`,
    );
  }

  // ------------------------------------------------------------------
  // 6. Parse Anthropic response and normalize structured data
  // ------------------------------------------------------------------
  let result: OcrReceiptResult;

  try {
    const completion = await anthropicResponse.json();

    // Biztonsági ellenőrzés: ritkán a modell elutasíthatja a kérést.
    if (completion?.stop_reason === "refusal") {
      console.error("Anthropic refused the OCR request");
      return errorResponse(
        422,
        "REFUSED",
        "Az OCR kérést a modell elutasította.",
      );
    }

    // Az Anthropic válasz content tömb; a structured output a (jellemzően egyetlen)
    // text blokkban érkezik valid JSON-ként.
    const blocks: Array<{ type?: string; text?: string }> = Array.isArray(
      completion?.content,
    )
      ? completion.content
      : [];
    const rawContent: string =
      blocks.find((b) => b?.type === "text")?.text ?? "";

    // A structured output miatt tiszta JSON-t kapunk, de a fence-eket
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
        // A nyers (blokkon látható) szöveg a tanuló glosszárium kulcsa. Ha a modell
        // nem adta vissza, a tiszta névre esünk vissza, hogy ne maradjon üresen.
        const rawName = String(it.raw_name ?? it.name ?? "").trim();
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
          raw_name: rawName,
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
    console.error("JSON parse error from Anthropic response:", parseError);
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
