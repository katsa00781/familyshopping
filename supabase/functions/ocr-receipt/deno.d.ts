// Ambient típusok a Deno Edge Function környezethez.
// A projekt fő tsconfig.json-ja kizárja a `supabase/functions` mappát, így ezek
// a deklarációk nem szivárognak az app kódjába — kizárólag a szerkesztő (IDE)
// számára adnak típusinformációt erről a fájlról, Deno bővítmény nélkül is.
//
// Éles futtatáskor a valódi Deno runtime és a távoli esm.sh modul biztosítja
// ezeket; itt csak a TypeScript "Cannot find name 'Deno'" / "Cannot find module"
// hibákat némítjuk el helyes típusokkal.

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
  interface PostgrestResult {
    data: unknown[] | null;
    error: unknown;
  }

  interface QueryBuilder {
    select(columns: string): QueryBuilder;
    order(column: string, options: { ascending: boolean }): QueryBuilder;
    limit(count: number): Promise<PostgrestResult>;
  }

  interface SupabaseClient {
    auth: {
      getUser(): Promise<{
        data: { user: { id: string } | null };
        error: unknown;
      }>;
    };
    from(table: string): QueryBuilder;
  }

  export function createClient(
    url: string,
    key: string,
    options?: { global?: { headers?: Record<string, string> } },
  ): SupabaseClient;
}
