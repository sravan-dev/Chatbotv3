import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getAdminSupabaseConfig } from '../shared/config';
import { createBrowserSupabaseClient } from '../shared/supabase';
import type {
  ConversationRecord,
  ConversationStatus,
  MessageRecord,
  ProfileRecord,
  UserRole,
  VisitorRecord,
  WidgetPosition,
  WidgetSettingsRecord,
} from '../shared/types';
import {
  compactUrl,
  formatClockTime,
  formatRelativeTime,
  getInitials,
  isVisitorOnline,
  joinClasses,
} from '../shared/utils';

const dashboardRoles = new Set<UserRole>(['admin', 'agent']);
const conversationSelect = `
  id,
  visitor_id,
  status,
  assigned_admin_id,
  last_message_at,
  last_message_preview,
  unread_by_admin,
  unread_by_visitor,
  created_at,
  updated_at,
  visitor:visitors (
    id,
    display_name,
    email,
    phone,
    current_url,
    current_path,
    page_title,
    referrer,
    timezone,
    locale,
    last_user_agent,
    metadata,
    first_seen_at,
    last_seen_at,
    created_at,
    updated_at
  )
`;

let bootError: string | null = null;
let supabase: ReturnType<typeof createBrowserSupabaseClient> | null = null;

try {
  const config = getAdminSupabaseConfig();
  const projectHost = new URL(config.supabaseUrl).hostname;
  supabase = createBrowserSupabaseClient(config, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      storageKey: `support-desk-admin:${projectHost}`,
    },
  });
} catch (error) {
  bootError = error instanceof Error ? error.message : 'Unable to start the dashboard.';
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setSessionLoading(false);
      return;
    }

    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session);
        setSessionLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);

    void supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) {
          return;
        }

        if (error) {
          setAuthError(error.message);
          setProfile(null);
        } else {
          setProfile((data as ProfileRecord | null) ?? null);
        }

        setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  async function handleLogin(email: string, password: string) {
    if (!supabase) {
      return;
    }

    setAuthPending(true);
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
    }

    setAuthPending(false);
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setProfile(null);
  }

  const canAccessDashboard = profile ? dashboardRoles.has(profile.role ?? 'viewer') : false;

  if (bootError) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">Configuration</p>
          <h1>Dashboard cannot start</h1>
          <p className="muted">{bootError}</p>
        </div>
      </div>
    );
  }

  if (sessionLoading || profileLoading) {
    return <SplashScreen />;
  }

  if (!session) {
    return (
      <AuthScreen
        authError={authError}
        pending={authPending}
        onLogin={handleLogin}
      />
    );
  }

  if (!canAccessDashboard) {
    return <AccessPendingScreen profile={profile} onSignOut={handleSignOut} />;
  }

  return <Dashboard session={session} profile={profile} onSignOut={handleSignOut} />;
}

function SplashScreen() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Support Desk</p>
        <h1>Loading your inbox</h1>
        <p className="muted">Connecting to Supabase and restoring the latest session.</p>
      </div>
    </div>
  );
}

function AuthScreen(props: {
  authError: string | null;
  pending: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await props.onLogin(email, password);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card--feature">
        <div className="auth-copy">
          <p className="eyebrow">Live chat admin</p>
          <h1>Track visitors and reply in real time.</h1>
          <p>
            This dashboard pairs with the embeddable widget bundle, stores every conversation in
            Supabase, and shows which page each visitor is currently browsing.
          </p>
          <div className="feature-grid">
            <div className="feature-pill">Realtime inbox</div>
            <div className="feature-pill">Visitor timeline</div>
            <div className="feature-pill">Anonymous widget auth</div>
            <div className="feature-pill">Script-tag install</div>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your dashboard password"
              required
              type="password"
              value={password}
            />
          </label>

          {props.authError ? <p className="form-error">{props.authError}</p> : null}

          <button className="primary-button" disabled={props.pending} type="submit">
            {props.pending ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="form-hint">
            Create the user in Supabase Auth, then promote the profile row to{' '}
            <code>admin</code> or <code>agent</code>.
          </p>
        </form>
      </div>
    </div>
  );
}

function AccessPendingScreen(props: {
  profile: ProfileRecord | null;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Access</p>
        <h1>Profile created, dashboard access still pending.</h1>
        <p className="muted">
          Signed in as <strong>{props.profile?.email ?? 'unknown user'}</strong>. Update the{' '}
          <code>profiles.role</code> column in Supabase to <code>admin</code> or{' '}
          <code>agent</code>, then refresh.
        </p>
        <button className="secondary-button" onClick={() => void props.onSignOut()} type="button">
          Sign out
        </button>
      </div>
    </div>
  );
}

function Dashboard(props: {
  session: Session;
  profile: ProfileRecord;
  onSignOut: () => Promise<void>;
}) {
  if (!supabase) {
    return null;
  }

  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettingsRecord | null>(null);
  const [widgetPosition, setWidgetPosition] = useState<WidgetPosition>('right');
  const [widgetSettingsSaving, setWidgetSettingsSaving] = useState(false);
  const [widgetSettingsError, setWidgetSettingsError] = useState<string | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  async function fetchConversations(): Promise<ConversationRecord[]> {
    const { data, error: queryError } = await supabase
      .from('conversations')
      .select(conversationSelect)
      .order('last_message_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (queryError) {
      throw queryError;
    }

    return (data as ConversationRecord[]) ?? [];
  }

  async function fetchVisitors(): Promise<VisitorRecord[]> {
    const { data, error: queryError } = await supabase
      .from('visitors')
      .select('*')
      .order('last_seen_at', { ascending: false });

    if (queryError) {
      throw queryError;
    }

    return (data as VisitorRecord[]) ?? [];
  }

  async function fetchMessages(conversationId: string): Promise<MessageRecord[]> {
    const { data, error: queryError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (queryError) {
      throw queryError;
    }

    return (data as MessageRecord[]) ?? [];
  }

  async function fetchWidgetSettings(): Promise<WidgetSettingsRecord | null> {
    const { data, error: queryError } = await supabase
      .from('widget_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (
      queryError &&
      queryError.code !== 'PGRST116' &&
      queryError.code !== 'PGRST205' &&
      queryError.code !== '42P01'
    ) {
      throw queryError;
    }

    return (data as WidgetSettingsRecord | null) ?? null;
  }

  async function refreshLists(options?: { reloadMessages?: boolean }) {
    try {
      const [nextConversations, nextVisitors] = await Promise.all([
        fetchConversations(),
        fetchVisitors(),
      ]);

      setConversations(nextConversations);
      setVisitors(nextVisitors);

      const fallbackConversationId =
        selectedConversationId && nextConversations.some((item) => item.id === selectedConversationId)
          ? selectedConversationId
          : (nextConversations[0]?.id ?? null);

      setSelectedConversationId(fallbackConversationId);

      if (options?.reloadMessages !== false && fallbackConversationId) {
        const nextMessages = await fetchMessages(fallbackConversationId);
        setMessages(nextMessages);
      }

      if (!fallbackConversationId) {
        setMessages([]);
      }
    } catch (refreshError) {
      const nextError =
        refreshError instanceof Error ? refreshError.message : 'Unable to load the dashboard.';
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshLists();
  }, [props.session.user.id]);

  useEffect(() => {
    let cancelled = false;

    void fetchWidgetSettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }

        setWidgetSettings(settings);
        setWidgetPosition(settings?.position ?? 'right');
      })
      .catch((loadError) => {
        if (!cancelled) {
          setWidgetSettingsError(
            loadError instanceof Error ? loadError.message : 'Unable to load widget settings.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    let cancelled = false;

    void fetchMessages(selectedConversationId)
      .then((nextMessages) => {
        if (!cancelled) {
          setMessages(nextMessages);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.');
        }
      });

    void supabase
      .from('conversations')
      .update({
        unread_by_admin: 0,
        assigned_admin_id: props.session.user.id,
      })
      .eq('id', selectedConversationId);

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId, props.session.user.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`support-desk-admin:${props.session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          void refreshLists({ reloadMessages: false });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const incomingMessage = payload.new as MessageRecord;
          if (incomingMessage.conversation_id === selectedConversationId) {
            setMessages((currentMessages) =>
              currentMessages.some((item) => item.id === incomingMessage.id)
                ? currentMessages
                : [...currentMessages, incomingMessage],
            );
          }

          void refreshLists({ reloadMessages: false });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'visitors' },
        (payload) => {
          const nextVisitor = payload.new as VisitorRecord;

          setVisitors((currentVisitors) =>
            [...currentVisitors.filter((item) => item.id !== nextVisitor.id), nextVisitor].sort(
              (left, right) =>
                new Date(right.last_seen_at).getTime() - new Date(left.last_seen_at).getTime(),
            ),
          );

          setConversations((currentConversations) =>
            currentConversations.map((conversation) =>
              conversation.visitor_id === nextVisitor.id
                ? {
                    ...conversation,
                    visitor: nextVisitor,
                  }
                : conversation,
            ),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'widget_settings', filter: 'id=eq.default' },
        (payload) => {
          const nextSettings = payload.new as WidgetSettingsRecord;
          if (nextSettings?.position) {
            setWidgetSettings(nextSettings);
            setWidgetPosition(nextSettings.position);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [props.session.user.id, selectedConversationId]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages]);

  const selectedConversation =
    conversations.find((item) => item.id === selectedConversationId) ?? conversations[0] ?? null;
  const selectedVisitor = selectedConversation?.visitor ?? null;
  const selectedVisitorOnline = selectedVisitor ? isVisitorOnline(selectedVisitor) : false;
  const onlineVisitors = visitors.filter((item) => isVisitorOnline(item)).length;
  const unreadConversations = conversations.reduce(
    (total, conversation) => total + conversation.unread_by_admin,
    0,
  );
  const openConversations = conversations.filter((conversation) => conversation.status === 'open').length;
  const pendingConversations = conversations.filter(
    (conversation) => conversation.status === 'pending',
  ).length;

  async function handleSendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedConversation || !draft.trim()) {
      return;
    }

    setSending(true);
    setError(null);

    if (selectedConversation.status === 'closed') {
      await supabase
        .from('conversations')
        .update({ status: 'open' })
        .eq('id', selectedConversation.id);
    }

    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: props.session.user.id,
        sender_type: 'admin',
        body: draft.trim(),
        metadata: {
          source: 'dashboard',
        },
      })
      .select('*')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSending(false);
      return;
    }

    setMessages((currentMessages) => {
      const nextMessage = data as MessageRecord;
      return currentMessages.some((item) => item.id === nextMessage.id)
        ? currentMessages
        : [...currentMessages, nextMessage];
    });
    setDraft('');
    setSending(false);
    await refreshLists({ reloadMessages: false });
  }

  async function handleWidgetPositionSave() {
    setWidgetSettingsSaving(true);
    setWidgetSettingsError(null);

    const { data, error: saveError } = await supabase
      .from('widget_settings')
      .upsert({
        id: 'default',
        position: widgetPosition,
      })
      .select('*')
      .single();

    if (saveError) {
      setWidgetSettingsError(saveError.message);
      setWidgetSettingsSaving(false);
      return;
    }

    setWidgetSettings(data as WidgetSettingsRecord);
    setWidgetSettingsSaving(false);
  }

  async function handleStatusChange(status: ConversationStatus) {
    if (!selectedConversation) {
      return;
    }

    setError(null);

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ status })
      .eq('id', selectedConversation.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setConversations((currentConversations) =>
      currentConversations.map((conversation) =>
        conversation.id === selectedConversation.id ? { ...conversation, status } : conversation,
      ),
    );
  }

  return (
    <div className="dashboard-shell">
      <header className="topbar panel">
        <div className="topbar-copy">
          <p className="eyebrow">Support Desk</p>
          <h1>Live inbox</h1>
          <p className="topbar-description">
            Track intent, catch new leads while they are still browsing, and reply from one
            realtime workspace built around the live visitor journey.
          </p>
          <div className="topbar-strip">
            <span className="topbar-chip">Realtime sync</span>
            <span className="topbar-chip">{unreadConversations} unread</span>
            <span className="topbar-chip">{onlineVisitors} visitors online</span>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="profile-badge">
            <span>{getInitials(props.profile.full_name ?? props.profile.email)}</span>
            <div>
              <strong>{props.profile.full_name ?? props.profile.email}</strong>
              <small>{props.profile.role}</small>
            </div>
          </div>

          <button className="secondary-button" onClick={() => void props.onSignOut()} type="button">
            Sign out
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        <aside className="panel sidebar-panel">
          <section className="metrics-block">
            <div className="panel-heading">
              <div>
                <p className="section-label">Snapshot</p>
                <h2>At a glance</h2>
              </div>
              <span className="signal-pill">Live</span>
            </div>

            <div className="metrics-grid">
              <MetricCard label="Open chats" value={String(openConversations)} />
              <MetricCard label="Pending" value={String(pendingConversations)} />
              <MetricCard label="Unread" value={String(unreadConversations)} accent />
              <MetricCard label="Online visitors" value={String(onlineVisitors)} />
            </div>
          </section>

          <section className="list-section">
            <div className="panel-heading">
              <div>
                <p className="section-label">Inbox</p>
                <h2>Conversations</h2>
                <p className="section-copy">
                  Prioritized by the latest activity across the widget.
                </p>
              </div>
              <button className="ghost-button" onClick={() => void refreshLists()} type="button">
                Refresh
              </button>
            </div>

            <div className="conversation-list">
              {loading ? <p className="empty-state">Loading conversations...</p> : null}

              {!loading && conversations.length === 0 ? (
                <p className="empty-state">
                  No conversations yet. Load the widget on a page and send the first message.
                </p>
              ) : null}

              {conversations.map((conversation) => {
                const visitorName =
                  conversation.visitor?.display_name ??
                  conversation.visitor?.email ??
                  'Guest visitor';

                return (
                  <button
                    className={joinClasses(
                      'conversation-card',
                      conversation.id === selectedConversation?.id && 'is-active',
                    )}
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    type="button"
                  >
                    <div className="conversation-card__header">
                      <div className="avatar-stack">
                        <span className="avatar-circle">{getInitials(visitorName)}</span>
                        {conversation.visitor && isVisitorOnline(conversation.visitor) ? (
                          <span className="online-dot" />
                        ) : null}
                      </div>

                      <div className="conversation-card__meta">
                        <strong>{visitorName}</strong>
                        <small>{formatRelativeTime(conversation.last_message_at)}</small>
                      </div>

                      {conversation.unread_by_admin > 0 ? (
                        <span className="badge">{conversation.unread_by_admin}</span>
                      ) : null}
                    </div>

                    <p className="conversation-card__preview">
                      {conversation.last_message_preview || 'New conversation'}
                    </p>

                    <div className="conversation-card__footer">
                      <span className={joinClasses('status-pill', `is-${conversation.status}`)}>
                        {conversation.status}
                      </span>
                      <small>{compactUrl(conversation.visitor?.current_url)}</small>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="panel thread-panel">
          <div className="panel-heading panel-heading--thread">
            <div className="panel-heading-copy">
              <p className="section-label">Active chat</p>
              <h2>
                {selectedVisitor?.display_name ?? selectedVisitor?.email ?? 'Select a conversation'}
              </h2>
              <p className="section-copy">
                {selectedConversation
                  ? `${selectedVisitor?.email ?? 'Anonymous visitor'} • ${formatRelativeTime(
                      selectedConversation.last_message_at,
                    )}`
                  : 'Choose a conversation to inspect the visitor path and reply in realtime.'}
              </p>
            </div>

            {selectedConversation ? (
              <div className="status-actions">
                <button
                  className={joinClasses(
                    'status-toggle',
                    selectedConversation.status === 'open' && 'is-selected',
                  )}
                  onClick={() => void handleStatusChange('open')}
                  type="button"
                >
                  Open
                </button>
                <button
                  className={joinClasses(
                    'status-toggle',
                    selectedConversation.status === 'pending' && 'is-selected',
                  )}
                  onClick={() => void handleStatusChange('pending')}
                  type="button"
                >
                  Pending
                </button>
                <button
                  className={joinClasses(
                    'status-toggle',
                    selectedConversation.status === 'closed' && 'is-selected',
                  )}
                  onClick={() => void handleStatusChange('closed')}
                  type="button"
                >
                  Closed
                </button>
              </div>
            ) : null}
          </div>

          {selectedConversation ? (
            <div className="thread-context-grid">
              <div className="thread-context-card">
                <span>Presence</span>
                <strong>{selectedVisitorOnline ? 'Live on site' : 'Recently active'}</strong>
                <small>
                  {selectedConversation.unread_by_admin > 0
                    ? `${selectedConversation.unread_by_admin} unread before opening`
                    : 'Inbox already cleared for this thread'}
                </small>
              </div>

              <div className="thread-context-card thread-context-card--wide">
                <span>Current page</span>
                <strong>{compactUrl(selectedVisitor?.current_url)}</strong>
                <small>{selectedVisitor?.page_title ?? 'Page title not available yet'}</small>
              </div>

              <div className="thread-context-card">
                <span>Last active</span>
                <strong>{formatRelativeTime(selectedVisitor?.last_seen_at)}</strong>
                <small>
                  {selectedVisitor?.locale ?? 'Unknown locale'} ·{' '}
                  {selectedVisitor?.timezone ?? 'Unknown timezone'}
                </small>
              </div>
            </div>
          ) : null}

          <div className="message-thread">
            {!selectedConversation ? (
              <div className="thread-placeholder">
                <h3>No chat selected</h3>
                <p>Choose a conversation from the left to inspect the visitor and reply.</p>
              </div>
            ) : null}

            {selectedConversation && messages.length === 0 ? (
              <div className="thread-placeholder">
                <h3>Conversation started</h3>
                <p>The widget is ready. Messages will appear here in realtime.</p>
              </div>
            ) : null}

            {messages.map((message) => (
              <article
                className={joinClasses(
                  'message-bubble',
                  message.sender_type === 'admin' ? 'is-admin' : 'is-visitor',
                )}
                key={message.id}
              >
                <div className="message-bubble__label">
                  <strong>
                    {message.sender_type === 'admin'
                      ? props.profile.full_name ?? 'Admin'
                      : selectedVisitor?.display_name ?? 'Visitor'}
                  </strong>
                  <span>{formatClockTime(message.created_at)}</span>
                </div>
                <p>{message.body}</p>
              </article>
            ))}

            <div ref={endOfMessagesRef} />
          </div>

          <form className="composer" onSubmit={handleSendReply}>
            {error ? <p className="form-error">{error}</p> : null}

            <textarea
              disabled={!selectedConversation || sending}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Reply to the visitor..."
              rows={4}
              value={draft}
            />

            <div className="composer-actions">
              <small>
                {selectedConversation
                  ? `Assigned to ${props.profile.full_name ?? props.profile.email ?? 'you'}`
                  : 'Select a conversation to respond'}
              </small>
              <button
                className="primary-button"
                disabled={!selectedConversation || sending || !draft.trim()}
                type="submit"
              >
                {sending ? 'Sending...' : 'Send reply'}
              </button>
            </div>
          </form>
        </section>

        <aside className="panel detail-panel">
          <section className="widget-settings-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Widget settings</p>
                <h2>Chat position</h2>
                <p className="section-copy">
                  Control the default launcher placement for the live script.
                </p>
              </div>
              <span className="status-pill is-open">Live default</span>
            </div>

            <p className="muted settings-copy">
              Choose where the widget appears by default. This applies to the live script unless the
              embed snippet explicitly sets <code>data-position</code>.
            </p>

            <div className="settings-toggle-group">
              <button
                className={joinClasses('status-toggle', widgetPosition === 'left' && 'is-selected')}
                onClick={() => setWidgetPosition('left')}
                type="button"
              >
                Left side
              </button>
              <button
                className={joinClasses('status-toggle', widgetPosition === 'right' && 'is-selected')}
                onClick={() => setWidgetPosition('right')}
                type="button"
              >
                Right side
              </button>
            </div>

            <div className="settings-footer">
              <small>
                Current saved position: <strong>{widgetSettings?.position ?? 'right'}</strong>
              </small>
              <button
                className="primary-button"
                disabled={
                  widgetSettingsSaving || widgetPosition === (widgetSettings?.position ?? 'right')
                }
                onClick={() => void handleWidgetPositionSave()}
                type="button"
              >
                {widgetSettingsSaving ? 'Saving...' : 'Save setting'}
              </button>
            </div>

            {widgetSettingsError ? <p className="form-error">{widgetSettingsError}</p> : null}
          </section>

          <section className="visitor-spotlight">
            <div className="panel-heading">
              <div>
                <p className="section-label">Visitor detail</p>
                <h2>{selectedVisitor?.display_name ?? selectedVisitor?.email ?? 'No visitor yet'}</h2>
                <p className="section-copy">
                  See the page context, location signals, and recency for the active visitor.
                </p>
              </div>
              {selectedVisitor ? (
                <span
                  className={joinClasses(
                    'status-pill',
                    selectedVisitorOnline ? 'is-online' : 'is-offline',
                  )}
                >
                  {selectedVisitorOnline ? 'online' : 'offline'}
                </span>
              ) : null}
            </div>

            {selectedVisitor ? (
              <div className="detail-list">
                <DetailItem label="Current page" value={compactUrl(selectedVisitor.current_url)} />
                <DetailItem label="Email" value={selectedVisitor.email ?? 'Unknown'} />
                <DetailItem label="Phone" value={selectedVisitor.phone ?? 'Unknown'} />
                <DetailItem label="Page title" value={selectedVisitor.page_title ?? 'Unknown'} />
                <DetailItem
                  label="Last active"
                  value={formatRelativeTime(selectedVisitor.last_seen_at)}
                />
                <DetailItem label="Locale" value={selectedVisitor.locale ?? 'Unknown'} />
                <DetailItem label="Timezone" value={selectedVisitor.timezone ?? 'Unknown'} />
                <DetailItem label="Referrer" value={selectedVisitor.referrer ?? 'Direct visit'} />
              </div>
            ) : (
              <p className="empty-state">
                Open a conversation to see the tracked visitor details here.
              </p>
            )}
          </section>

          <section className="list-section">
            <div className="panel-heading">
              <div>
                <p className="section-label">Presence</p>
                <h2>Recent visitors</h2>
                <p className="section-copy">Latest presence signals from the widget.</p>
              </div>
            </div>

            <div className="visitor-list">
              {visitors.length === 0 ? (
                <p className="empty-state">Visitor presence will appear once the widget loads.</p>
              ) : null}

              {visitors.slice(0, 8).map((visitor) => (
                <div className="visitor-row" key={visitor.id}>
                  <div className="avatar-stack">
                    <span className="avatar-circle">
                      {getInitials(visitor.display_name ?? visitor.email)}
                    </span>
                    {isVisitorOnline(visitor) ? <span className="online-dot" /> : null}
                  </div>

                  <div className="visitor-row__meta">
                    <strong>{visitor.display_name ?? visitor.email ?? 'Guest visitor'}</strong>
                    <small>{compactUrl(visitor.current_url)}</small>
                  </div>

                  <small>{formatRelativeTime(visitor.last_seen_at)}</small>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function MetricCard(props: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={joinClasses('metric-card', props.accent && 'metric-card--accent')}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function DetailItem(props: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}
