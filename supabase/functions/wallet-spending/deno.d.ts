// Ambient típusok a Deno Edge Function környezethez.
// A projekt fő tsconfig.json-ja kizárja a `supabase/functions` mappát, így ezek
// a deklarációk nem szivárognak az app kódjába — kizárólag a szerkesztő (IDE)
// számára adnak típusinformációt erről a fájlról, Deno bővítmény nélkül is.

// --- Deno globális namespace (csak a használt felület) ---------------------
declare namespace Deno {
  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;

  export const env: {
    get(key: string): string | undefined;
  };
}

// --- Távoli supabase-js modul (esm.sh) ------------------------------------
declare module "https://esm.sh/@supabase/supabase-js@2" {
  interface SupabaseClient {
    auth: {
      getUser(): Promise<{
        data: { user: { id: string } | null };
        error: unknown;
      }>;
    };
  }

  export function createClient(
    url: string,
    key: string,
    options?: { global?: { headers?: Record<string, string> } },
  ): SupabaseClient;
}
