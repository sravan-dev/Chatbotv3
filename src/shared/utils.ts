import type { VisitorRecord } from './types';

export function formatClockTime(value: string | null | undefined): string {
  if (!value) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return 'Just now';
  }

  const timestamp = new Date(value).getTime();
  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000);
  const magnitude = Math.abs(deltaSeconds);

  if (magnitude < 10) {
    return 'Just now';
  }

  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
  });

  if (magnitude < 60) {
    return formatter.format(deltaSeconds, 'second');
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, 'minute');
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (Math.abs(deltaHours) < 24) {
    return formatter.format(deltaHours, 'hour');
  }

  const deltaDays = Math.round(deltaHours / 24);
  return formatter.format(deltaDays, 'day');
}

export function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) {
    return 'GU';
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || 'GU';
}

export function isVisitorOnline(visitor: VisitorRecord): boolean {
  const lastSeen = new Date(visitor.last_seen_at).getTime();
  return Date.now() - lastSeen <= 90_000;
}

export function compactUrl(value: string | null | undefined): string {
  if (!value) {
    return 'Unknown page';
  }

  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

export function joinClasses(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function buildVisitorPresencePayload(overrides?: {
  displayName?: string;
  email?: string;
  phone?: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    current_url: window.location.href,
    current_path: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    page_title: document.title,
    referrer: document.referrer || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? null,
    locale: navigator.language ?? null,
    last_user_agent: navigator.userAgent,
    last_seen_at: new Date().toISOString(),
    metadata: {
      screen: `${window.innerWidth}x${window.innerHeight}`,
      origin: window.location.origin,
    },
  };

  if (typeof overrides?.displayName !== 'undefined') {
    payload.display_name = overrides.displayName.trim() || null;
  }

  if (typeof overrides?.email !== 'undefined') {
    payload.email = overrides.email.trim() || null;
  }

  if (typeof overrides?.phone !== 'undefined') {
    payload.phone = overrides.phone.trim() || null;
  }

  return payload;
}
