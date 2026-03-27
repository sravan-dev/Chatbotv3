export type UserRole = 'admin' | 'agent' | 'viewer';
export type ConversationStatus = 'open' | 'pending' | 'closed';
export type SenderType = 'visitor' | 'admin' | 'system';
export type WidgetPosition = 'left' | 'right';

export interface ProfileRecord {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole | null;
  created_at: string;
  updated_at: string;
}

export interface VisitorRecord {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  current_url: string | null;
  current_path: string | null;
  page_title: string | null;
  referrer: string | null;
  timezone: string | null;
  locale: string | null;
  last_user_agent: string | null;
  metadata: Record<string, unknown> | null;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationRecord {
  id: string;
  visitor_id: string;
  status: ConversationStatus;
  assigned_admin_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  unread_by_admin: number;
  unread_by_visitor: number;
  created_at: string;
  updated_at: string;
  visitor?: VisitorRecord | null;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: SenderType;
  body: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface WidgetSettingsRecord {
  id: string;
  position: WidgetPosition;
  created_at: string;
  updated_at: string;
}

export interface WidgetRuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  title: string;
  subtitle: string;
  welcomeText: string;
  accentColor: string;
  position: WidgetPosition;
  launcherLabel: string;
  adminLabel: string;
  autoOpen: boolean;
  zIndex: number;
  positionLocked: boolean;
}
