/// <reference path="./deno.d.ts" />
// wallet-spending Edge Function
// Proxies the BudgetBakers Wallet REST API to fetch REAL monthly spending.
//
// A Wallet a tényleges tranzakciókat tartja — amit a mobilapp közvetlenül NEM ér el.
// Ez a függvény szerver oldalon lekéri az adott hónap kiadásait, és egy fix Wallet→
// terv koncepció-mapping (CATEGORY_MAP) mentén TERV-KATEGÓRIA NÉV szerint összegzi
// (a belső átvezetéseket kihagyva), majd visszaadja a kliensnek. A kliens egyszerű
// név-join-nal köti a tervhez. (A budget_data `walletCategories` ID-jei elavultak,
// ezért a stabil, globális Wallet bázis-kategória ID-kre képezünk.)
//
// A BUDGETBAKERS_API_TOKEN (személyes Wallet API token, Premium) a Supabase
// secrets-ből jön — SOHA nem a kliensről. Auth: a hívót a Supabase JWT azonosítja.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WALLET_API_BASE = "https://rest.budgetbakers.com/wallet/v1/api";
const PAGE_SIZE = 200; // a Wallet REST max lapmérete
const MAX_PAGES = 25; // védőkorlát (max 5000 tétel/hó) – elszállás ellen

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse({ error: { code, message } }, status);
}

// ---------------------------------------------------------------------------
// Date helpers — hónaphatár (UTC, firstDayOfMonth = 1)
// ---------------------------------------------------------------------------

const MONTH_RE = /^\d{4}-\d{2}-\d{2}$/;

// A kapott `month` (YYYY-MM-DD, a hónap első napja) → [start, nextMonthStart) UTC.
function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map((s) => parseInt(s, 10));
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start: isoDate(start), end: isoDate(end) };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function currentMonthStart(): string {
  const now = new Date();
  return isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
}

// ---------------------------------------------------------------------------
// Kategória-térkép: Wallet (BudgetBakers) bázis-kategória ID → familybudget terv-
// kategória neve. A budget_data `walletCategories` ID-jei elavultak (nem egyeznek az
// élő Wallet kategóriákkal), ezért a stabil, globális bázis-kategória ID-kre képezünk
// (felhasználó által jóváhagyott koncepció-mapping, 2026-06-22). Ami nincs a térképen
// és nincs kizárva → „Egyéb". A belső átvezetések (Transfer/Debt/Shopping list) NEM
// valós költés → kihagyva.
const FALLBACK_CATEGORY = "Egyéb";

const CATEGORY_MAP: Record<string, string> = {
  // Háztartás
  "5c5c03e8-000a-8000-8000-000000000000": "Háztartás", // Groceries
  "5c5c03eb-000a-8000-8000-000000000000": "Háztartás", // Food & Drinks
  "5c5c07d4-0014-8000-8000-000000000000": "Háztartás", // Home & garden
  "5c5c0bbc-001e-8000-8000-000000000000": "Háztartás", // Maintenance & repairs
  "5c5c07db-0014-8000-8000-000000000000": "Háztartás", // Drugstore
  // Rezsi
  "5c5c0bba-001e-8000-8000-000000000000": "Rezsi", // Energy & utilities
  "5c5c0bbd-001e-8000-8000-000000000000": "Rezsi", // Housing
  "5c5c0bbb-001e-8000-8000-000000000000": "Rezsi", // Services
  "5c5c0bb8-001e-8000-8000-000000000000": "Rezsi", // Rent
  "5c5c0bc2-001e-8000-8000-000000000000": "Rezsi", // Insurance (Housing)
  "5c5c1b59-0046-8000-8000-000000000000": "Rezsi", // Phone, cell phones
  "5c5c1b5a-0046-8000-8000-000000000000": "Rezsi", // Internet
  "5c5c1b5c-0046-8000-8000-000000000000": "Rezsi", // Postal services
  // Autó
  "5c5c1388-0032-8000-8000-000000000000": "Autó", // Fuel
  "5c5c138a-0032-8000-8000-000000000000": "Autó", // Vehicle maintenance
  "5c5c1389-0032-8000-8000-000000000000": "Autó", // Parking
  "5c5c1392-0032-8000-8000-000000000000": "Autó", // Insurance (Vehicle)
  "5c5c1f46-0032-8000-8000-000000000000": "Autó", // Leasing
  "5c5c138b-0032-8000-8000-000000000000": "Autó", // Rentals
  "5c5c138c-0032-8000-8000-000000000000": "Autó", // Vehicle
  "5c5c0fa1-0028-8000-8000-000000000000": "Autó", // Taxi
  "5c5c0fa0-0028-8000-8000-000000000000": "Autó", // Public transport
  "5c5c0fa2-0028-8000-8000-000000000000": "Autó", // Long distance
  "5c5c0fa3-0028-8000-8000-000000000000": "Autó", // Business trips
  "5c5c0fa4-0028-8000-8000-000000000000": "Autó", // Transportation
  // Digitális Rezsi
  "5c5c1778-003c-8000-8000-000000000000": "Digitális Rezsi", // Tv, streaming
  "5c5c1777-003c-8000-8000-000000000000": "Digitális Rezsi", // Books, audio, subscription
  "5c5c1b5b-0046-8000-8000-000000000000": "Digitális Rezsi", // Software, apps, games
  "5c5c1b5d-0046-8000-8000-000000000000": "Digitális Rezsi", // PC, Communication
  // Szórakozás
  "5c5c1773-003c-8000-8000-000000000000": "Szórakozás", // Culture, sport events
  "5c5c1772-003c-8000-8000-000000000000": "Szórakozás", // Active sport, fitness
  "5c5c1775-003c-8000-8000-000000000000": "Szórakozás", // Hobbies
  "5c5c1779-003c-8000-8000-000000000000": "Szórakozás", // Holidays, trips, hotels
  "5c5c03e9-000a-8000-8000-000000000000": "Szórakozás", // Restaurants & fast food
  "5c5c03ea-000a-8000-8000-000000000000": "Szórakozás", // Bar cafe
  "5c5c177b-003c-8000-8000-000000000000": "Szórakozás", // Alcohol, tobacco
  "5c5c1776-003c-8000-8000-000000000000": "Szórakozás", // Education & development
  "5c5c177d-003c-8000-8000-000000000000": "Szórakozás", // Life & Entertainment
  "5c5c177c-003c-8000-8000-000000000000": "Szórakozás", // Lottery, gambling (L&E)
  // Egészség
  "5c5c07d2-0014-8000-8000-000000000000": "Egészség", // Health & beauty
  "5c5c1770-003c-8000-8000-000000000000": "Egészség", // Health care & doctor
  "5c5c1771-003c-8000-8000-000000000000": "Egészség", // Wellness & beauty
  // Hitel
  "5c5c0bb9-001e-8000-8000-000000000000": "Hitel", // Mortgage
  "5c5c1f42-0050-8000-8000-000000000000": "Hitel", // Loan, interests
  "5c5c1f45-0050-8000-8000-000000000000": "Hitel", // Charges, fees
  "5c5c1f48-0050-8000-8000-000000000000": "Hitel", // Financial expenses
  // Mama
  "5c5c2af9-006e-8000-8000-000000000000": "Mama", // Mamci revolut
  "7bed4dc9-ba3f-456e-8f18-be32b22cd0bf": "Mama", // Mamci (custom)
  // Megtakarítás
  "5c5c232b-005a-8000-8000-000000000000": "Megtakarítás", // Savings
  "5c5c232d-005a-8000-8000-000000000000": "Megtakarítás", // Investments
};

// Belső átvezetés / nem valós költés — kihagyjuk az összesítésből.
const EXCLUDED_CATEGORIES = new Set<string>([
  "5c5c4e21-00c8-8000-8000-000000000000", // Transfer
  "5c5c4e20-00c8-8000-8000-000000000000", // Debt
  "5c5c4e22-00c8-8000-8000-000000000000", // Shopping list
]);

// Egy rekord terv-kategóriája, vagy null, ha kihagyandó (átvezetés).
function budgetCategoryFor(walletCategoryId: string | null): string | null {
  if (walletCategoryId && EXCLUDED_CATEGORIES.has(walletCategoryId)) return null;
  if (walletCategoryId && CATEGORY_MAP[walletCategoryId]) return CATEGORY_MAP[walletCategoryId];
  return FALLBACK_CATEGORY;
}

// Wallet bázis-kategória ID → magyar alkategória-címke (a detail-nézet csoportcímei).
// Hiányzó kulcs → a rekord saját (angol) kategórianeve a fallback.
const SUBCATEGORY_HU: Record<string, string> = {
  "5c5c03e8-000a-8000-8000-000000000000": "Élelmiszer",
  "5c5c03eb-000a-8000-8000-000000000000": "Étel-ital",
  "5c5c07d4-0014-8000-8000-000000000000": "Otthon, kert",
  "5c5c0bbc-001e-8000-8000-000000000000": "Karbantartás, javítás",
  "5c5c07db-0014-8000-8000-000000000000": "Drogéria",
  "5c5c0bba-001e-8000-8000-000000000000": "Energia, rezsi",
  "5c5c0bbd-001e-8000-8000-000000000000": "Lakhatás",
  "5c5c0bbb-001e-8000-8000-000000000000": "Szolgáltatások",
  "5c5c0bb8-001e-8000-8000-000000000000": "Bérleti díj",
  "5c5c0bc2-001e-8000-8000-000000000000": "Lakásbiztosítás",
  "5c5c1b59-0046-8000-8000-000000000000": "Telefon",
  "5c5c1b5a-0046-8000-8000-000000000000": "Internet",
  "5c5c1b5c-0046-8000-8000-000000000000": "Postai szolgáltatás",
  "5c5c1388-0032-8000-8000-000000000000": "Üzemanyag",
  "5c5c138a-0032-8000-8000-000000000000": "Autószerviz",
  "5c5c1389-0032-8000-8000-000000000000": "Parkolás",
  "5c5c1392-0032-8000-8000-000000000000": "Autóbiztosítás",
  "5c5c1f46-0032-8000-8000-000000000000": "Lízing",
  "5c5c138b-0032-8000-8000-000000000000": "Bérlés",
  "5c5c138c-0032-8000-8000-000000000000": "Jármű",
  "5c5c0fa1-0028-8000-8000-000000000000": "Taxi",
  "5c5c0fa0-0028-8000-8000-000000000000": "Tömegközlekedés",
  "5c5c0fa2-0028-8000-8000-000000000000": "Távolsági utazás",
  "5c5c0fa3-0028-8000-8000-000000000000": "Üzleti út",
  "5c5c0fa4-0028-8000-8000-000000000000": "Közlekedés",
  "5c5c1778-003c-8000-8000-000000000000": "Tv, streaming",
  "5c5c1777-003c-8000-8000-000000000000": "Könyv, hang, előfizetés",
  "5c5c1b5b-0046-8000-8000-000000000000": "Szoftver, appok, játékok",
  "5c5c1b5d-0046-8000-8000-000000000000": "Számítástechnika",
  "5c5c1773-003c-8000-8000-000000000000": "Kultúra, sportesemény",
  "5c5c1772-003c-8000-8000-000000000000": "Sport, fitnesz",
  "5c5c1775-003c-8000-8000-000000000000": "Hobbi",
  "5c5c1779-003c-8000-8000-000000000000": "Nyaralás, utazás",
  "5c5c03e9-000a-8000-8000-000000000000": "Étterem, gyorsétterem",
  "5c5c03ea-000a-8000-8000-000000000000": "Bár, kávézó",
  "5c5c177b-003c-8000-8000-000000000000": "Alkohol, dohány",
  "5c5c1776-003c-8000-8000-000000000000": "Oktatás, fejlődés",
  "5c5c177d-003c-8000-8000-000000000000": "Élet, szórakozás",
  "5c5c177c-003c-8000-8000-000000000000": "Lottó, szerencsejáték",
  "5c5c07d2-0014-8000-8000-000000000000": "Egészség, szépségápolás",
  "5c5c1770-003c-8000-8000-000000000000": "Orvos, egészségügy",
  "5c5c1771-003c-8000-8000-000000000000": "Wellness, szépség",
  "5c5c0bb9-001e-8000-8000-000000000000": "Jelzáloghitel",
  "5c5c1f42-0050-8000-8000-000000000000": "Hitel, kamat",
  "5c5c1f45-0050-8000-8000-000000000000": "Díjak, költségek",
  "5c5c1f48-0050-8000-8000-000000000000": "Pénzügyi kiadás",
  "5c5c2af9-006e-8000-8000-000000000000": "Mamci revolut",
  "7bed4dc9-ba3f-456e-8f18-be32b22cd0bf": "Mamci",
  "5c5c232b-005a-8000-8000-000000000000": "Megtakarítás",
  "5c5c232d-005a-8000-8000-000000000000": "Befektetés",
  "5c5c07d0-0014-8000-8000-000000000000": "Ruházat, cipő",
  "5c5c07d7-0014-8000-8000-000000000000": "Ajándék",
  "5c5c1f41-0050-8000-8000-000000000000": "Biztosítás",
  "5c5c07d6-0014-8000-8000-000000000000": "Elektronika",
  "5c5c07d3-0014-8000-8000-000000000000": "Gyerek",
  "5c5c07d5-0014-8000-8000-000000000000": "Állatok",
  "5c5c07da-0014-8000-8000-000000000000": "Vásárlás",
  "5c5c07dc-0014-8000-8000-000000000000": "Áruház",
  "5c5c07d8-0014-8000-8000-000000000000": "Írószer, eszközök",
  "5c5c07d1-0014-8000-8000-000000000000": "Ékszer",
  "5c5c4e23-00c8-8000-8000-000000000000": "Besorolatlan",
  "5c5c32c9-0082-8000-8000-000000000000": "Ismeretlen",
};

// ---------------------------------------------------------------------------
// Wallet record parsing
// ---------------------------------------------------------------------------

interface WalletAmount {
  value?: unknown;
  currencyCode?: unknown;
}

interface WalletRecord {
  category?: { id?: unknown; name?: unknown } | null;
  amount?: WalletAmount | null;
  convertedAmount?: WalletAmount | null;
  note?: unknown;
  counterParty?: unknown;
  recordDate?: unknown;
}

function toFiniteNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// A detail-csoport magyar alkategória-címkéje (id → SUBCATEGORY_HU, fallback: angol név).
function subLabelFor(rec: WalletRecord): string {
  const id = recordCategoryId(rec);
  if (id && SUBCATEGORY_HU[id]) return SUBCATEGORY_HU[id];
  const name = asTrimmedString(rec.category?.name);
  return name.length > 0 ? name : FALLBACK_CATEGORY;
}

// Egy tétel olvasható címkéje: jegyzet → partner → alkategória.
function recordLabel(rec: WalletRecord): string {
  return asTrimmedString(rec.note) || asTrimmedString(rec.counterParty) || subLabelFor(rec);
}

// Egy rekord HUF-összege (abszolút). A `convertTo=base` által adott convertedAmount-ot
// részesítjük előnyben (forex átváltás), különben a saját devizás amount-ot (a legtöbb
// tétel HUF, így ez biztonságos fallback, ha a convertTo-t a backend nem támogatja).
function recordBaseAmount(rec: WalletRecord): number {
  const conv = rec.convertedAmount;
  const raw = rec.amount;
  const value =
    conv && conv.value !== undefined && conv.value !== null
      ? toFiniteNumber(conv.value)
      : toFiniteNumber(raw?.value);
  return Math.abs(value);
}

function recordCategoryId(rec: WalletRecord): string | null {
  const id = rec.category?.id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Only POST is supported");
  }

  // ------------------------------------------------------------------
  // 1. A hívó azonosítása Supabase JWT-vel (mint az ocr-receipt-nél)
  // ------------------------------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return errorResponse(401, "UNAUTHORIZED", "Missing or malformed Authorization header");
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
  // 2. Hónap meghatározása a body-ból (alapért. aktuális hónap)
  // ------------------------------------------------------------------
  let month = currentMonthStart();
  // `detail` = egy terv-kategória neve. Ha megadva, a függvény a hónap tételeit
  // ahhoz a kategóriához szűrve, Wallet-alkategória szerint csoportosítva adja vissza.
  let detailCategory: string | null = null;
  try {
    const text = await req.text();
    if (text) {
      const body = JSON.parse(text) as { month?: unknown; detail?: unknown };
      if (typeof body?.month === "string" && MONTH_RE.test(body.month)) {
        month = body.month;
      }
      if (typeof body?.detail === "string" && body.detail.length > 0) {
        detailCategory = body.detail;
      }
    }
  } catch {
    // üres / hibás body → marad az aktuális hónap, aggregált nézet
  }
  const { start, end } = monthBounds(month);

  // ------------------------------------------------------------------
  // 3. BudgetBakers token
  // ------------------------------------------------------------------
  const walletToken = Deno.env.get("BUDGETBAKERS_API_TOKEN");
  if (!walletToken) {
    console.error("BUDGETBAKERS_API_TOKEN secret is not configured");
    return errorResponse(
      500,
      "CONFIGURATION_ERROR",
      "A Wallet API token nincs beállítva a szerveren",
    );
  }

  // ------------------------------------------------------------------
  // 4. Kiadások lapozott lekérése + aggregálás Wallet kategória szerint
  // ------------------------------------------------------------------
  const byCategory: Record<string, number> = {};
  let totalSpent = 0;
  let recordCount = 0;
  // detail módban a kért kategória tételei (alcímke + olvasható címke + összeg + dátum)
  const detailItems: { sub: string; label: string; amount: number; date: string }[] = [];

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = new URLSearchParams();
      params.set("recordType", "expense");
      params.append("recordDate", `gte.${start}`);
      params.append("recordDate", `lt.${end}`);
      params.set("convertTo", "base");
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));

      const res = await fetch(`${WALLET_API_BASE}/records?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${walletToken}`,
          Accept: "application/json",
        },
      });

      if (res.status === 401 || res.status === 403) {
        return errorResponse(
          502,
          "WALLET_AUTH_ERROR",
          "A Wallet API elutasította a tokent (lejárt vagy érvénytelen)",
        );
      }
      if (res.status === 429) {
        return errorResponse(429, "WALLET_RATE_LIMIT", "A Wallet API rate limit elérve");
      }
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Wallet API error ${res.status}:`, errText.slice(0, 500));
        return errorResponse(502, "UPSTREAM_ERROR", `Wallet API HTTP ${res.status}`);
      }

      const payload = await res.json();
      // A válasz lehet { records: [...] } vagy közvetlen tömb — mindkettőt kezeljük.
      const records: WalletRecord[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.records)
          ? payload.records
          : [];

      for (const rec of records) {
        const amount = recordBaseAmount(rec);
        if (amount <= 0) continue;
        // Wallet kategória → terv-kategória; az átvezetések (null) kimaradnak.
        const budgetCat = budgetCategoryFor(recordCategoryId(rec));
        if (!budgetCat) continue;
        totalSpent += amount;
        byCategory[budgetCat] = (byCategory[budgetCat] ?? 0) + amount;
        if (detailCategory && budgetCat === detailCategory) {
          detailItems.push({
            sub: subLabelFor(rec),
            label: recordLabel(rec),
            amount,
            date: asTrimmedString(rec.recordDate),
          });
        }
      }

      recordCount += records.length;
      if (records.length < PAGE_SIZE) break; // utolsó lap
    }
  } catch (networkError) {
    console.error("Wallet API network error:", networkError);
    return errorResponse(502, "UPSTREAM_ERROR", "Nem sikerült elérni a Wallet API-t");
  }

  // ── Bevételek — csak aggregált módban kell (detail korai return után) ──────────
  // A bevétel-összeg a tényleges havi keret kiszámításához kell.
  // Ha a fetch hibázik, 0-t adunk vissza (a kiadás-nézet megmarad).
  let totalIncome = 0;
  if (!detailCategory) {
    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const incParams = new URLSearchParams();
        incParams.set("recordType", "income");
        incParams.append("recordDate", `gte.${start}`);
        incParams.append("recordDate", `lt.${end}`);
        incParams.set("convertTo", "base");
        incParams.set("limit", String(PAGE_SIZE));
        incParams.set("offset", String(page * PAGE_SIZE));

        const incRes = await fetch(`${WALLET_API_BASE}/records?${incParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${walletToken}`,
            Accept: "application/json",
          },
        });

        if (!incRes.ok) break;

        const incPayload = await incRes.json();
        const incRecords: WalletRecord[] = Array.isArray(incPayload)
          ? incPayload
          : Array.isArray(incPayload?.records)
            ? incPayload.records
            : [];

        for (const rec of incRecords) {
          const catId = recordCategoryId(rec);
          if (catId && EXCLUDED_CATEGORIES.has(catId)) continue; // átvezetés kihagyva
          totalIncome += recordBaseAmount(rec);
        }

        if (incRecords.length < PAGE_SIZE) break;
      }
    } catch {
      // bevétel-lekérés hiba nem kritikus — 0-val folytatjuk
    }
  }

  // ── Detail nézet: a kért kategória tételei Wallet-alkategória szerint csoportosítva ──
  if (detailCategory) {
    const groupMap = new Map<string, { total: number; records: { label: string; amount: number; date: string }[] }>();
    for (const it of detailItems) {
      const g = groupMap.get(it.sub) ?? { total: 0, records: [] };
      g.total += it.amount;
      g.records.push({ label: it.label, amount: Math.round(it.amount), date: it.date });
      groupMap.set(it.sub, g);
    }
    const groups = [...groupMap.entries()]
      .map(([subCategory, g]) => ({
        subCategory,
        total: Math.round(g.total),
        records: g.records.sort((a, b) => b.amount - a.amount),
      }))
      .sort((a, b) => b.total - a.total);
    const total = groups.reduce((s, g) => s + g.total, 0);

    console.log(
      JSON.stringify({
        event: "wallet_spending_detail",
        user_id: user.id,
        month,
        category: detailCategory,
        group_count: groups.length,
        total,
      }),
    );

    return jsonResponse(
      { month, category: detailCategory, currency: "HUF", total, groups, syncedAt: new Date().toISOString() },
      200,
    );
  }

  // Kerekítés (forint, egész) — a UI egész Ft-ot mutat.
  for (const k of Object.keys(byCategory)) {
    byCategory[k] = Math.round(byCategory[k]);
  }

  const result = {
    month,
    currency: "HUF",
    byCategory,
    totalSpent: Math.round(totalSpent),
    totalIncome: Math.round(totalIncome),
    syncedAt: new Date().toISOString(),
  };

  console.log(
    JSON.stringify({
      event: "wallet_spending",
      user_id: user.id,
      month,
      record_count: recordCount,
      category_count: Object.keys(byCategory).length,
      total_spent: result.totalSpent,
      total_income: result.totalIncome,
    }),
  );

  return jsonResponse(result, 200);
});
