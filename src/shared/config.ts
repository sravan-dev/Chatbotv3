import type { WidgetPosition, WidgetRuntimeConfig } from './types';

function requiredValue(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`${label} is missing. Add it to your Vite environment variables.`);
  }

  return value;
}

export function getAdminSupabaseConfig(): {
  supabaseUrl: string;
  supabaseAnonKey: string;
} {
  return {
    supabaseUrl: requiredValue(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL'),
    supabaseAnonKey: requiredValue(
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      'VITE_SUPABASE_ANON_KEY',
    ),
  };
}

function resolvePosition(value: string | undefined): WidgetPosition {
  return value === 'left' ? 'left' : 'right';
}

export function resolveWidgetConfig(script: HTMLScriptElement | null): WidgetRuntimeConfig {
  const data = script?.dataset ?? {};
  const explicitPosition = data.position;

  return {
    supabaseUrl:
      data.supabaseUrl ?? requiredValue(import.meta.env.VITE_SUPABASE_URL, 'VITE_SUPABASE_URL'),
    supabaseAnonKey:
      data.supabaseAnonKey ??
      requiredValue(import.meta.env.VITE_SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY'),
    title: data.title ?? import.meta.env.VITE_WIDGET_TITLE ?? 'Support Desk',
    subtitle:
      data.subtitle ??
      import.meta.env.VITE_WIDGET_SUBTITLE ??
      'Live chat powered by Supabase',
    welcomeText:
      data.welcome ??
      import.meta.env.VITE_WIDGET_WELCOME ??
      'Ask anything and the admin dashboard will see your message instantly.',
    accentColor: data.accentColor ?? import.meta.env.VITE_WIDGET_ACCENT_COLOR ?? '#f97316',
    position: resolvePosition(explicitPosition ?? import.meta.env.VITE_WIDGET_POSITION),
    launcherLabel:
      data.launcherLabel ?? import.meta.env.VITE_WIDGET_LAUNCHER_LABEL ?? 'Chat with us',
    adminLabel: data.adminLabel ?? import.meta.env.VITE_WIDGET_ADMIN_LABEL ?? 'Support',
    autoOpen: data.autoOpen === 'true',
    zIndex: Number(data.zIndex ?? '2147483000'),
    positionLocked: Boolean(explicitPosition),
  };
}
