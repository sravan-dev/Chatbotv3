/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_WIDGET_TITLE?: string;
  readonly VITE_WIDGET_SUBTITLE?: string;
  readonly VITE_WIDGET_WELCOME?: string;
  readonly VITE_WIDGET_ACCENT_COLOR?: string;
  readonly VITE_WIDGET_POSITION?: string;
  readonly VITE_WIDGET_LAUNCHER_LABEL?: string;
  readonly VITE_WIDGET_ADMIN_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
