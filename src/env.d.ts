/// <reference path="../.astro/types.d.ts" />
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string | undefined;
  readonly PUBLIC_SUPABASE_ANON_KEY: string | undefined;
  readonly THESPORTSDB_API_KEY: string | undefined;
  readonly PUBLIC_THESPORTSDB_API_KEY: string | undefined;
  readonly API_FUSSBALL_TOKEN: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
