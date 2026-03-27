import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserSupabaseClient } from '../shared/supabase';
import type {
  ConversationRecord,
  MessageRecord,
  VisitorRecord,
  WidgetPosition,
  WidgetRuntimeConfig,
  WidgetSettingsRecord,
} from '../shared/types';
import {
  buildVisitorPresencePayload,
  compactUrl,
  formatClockTime,
  formatRelativeTime,
  getInitials,
  joinClasses,
} from '../shared/utils';

interface WidgetAppProps {
  config: WidgetRuntimeConfig;
}

type HistoryMethod = 'pushState' | 'replaceState';

export function WidgetApp({ config }: WidgetAppProps) {
  const client = useMemo(() => {
    const projectHost = new URL(config.supabaseUrl).hostname;

    return createBrowserSupabaseClient(
      {
        supabaseUrl: config.supabaseUrl,
        supabaseAnonKey: config.supabaseAnonKey,
      },
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          storageKey: `support-desk-widget:${projectHost}`,
        },
      },
    );
  }, [config.supabaseAnonKey, config.supabaseUrl]);

  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(config.autoOpen);
  const [visitor, setVisitor] = useState<VisitorRecord | null>(null);
  const [conversation, setConversation] = useState<ConversationRecord | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState<WidgetPosition>(config.position);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showIdentityForm, setShowIdentityForm] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setError(null);

      try {
        const session = await ensureAnonymousSession(client);
        const visitorId = session.user.id;
        const widgetSettings = await fetchWidgetSettings(client);
        const visitorRecord = await upsertVisitor(client, visitorId);
        const activeConversation = await ensureConversation(client, visitorId);
        const initialMessages = await fetchMessages(client, activeConversation.id);

        if (cancelled) {
          return;
        }

        if (!config.positionLocked && widgetSettings?.position) {
          setPosition(widgetSettings.position);
        }

        setVisitor(visitorRecord);
        setDisplayName(visitorRecord.display_name ?? '');
        setEmail(visitorRecord.email ?? '');
        setPhone(visitorRecord.phone ?? '');
        setConversation(activeConversation);
        setMessages(initialMessages);
        setUnreadCount(activeConversation.unread_by_visitor ?? 0);
        setReady(true);

        await updateVisitorPresence(client, visitorId);
        await logVisitorEvent(client, visitorId, activeConversation.id);
      } catch (bootstrapError) {
        if (!cancelled) {
          setError(
            bootstrapError instanceof Error
              ? bootstrapError.message
              : 'The widget could not connect to Supabase.',
          );
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [client]);

  useEffect(() => {
    if (config.positionLocked) {
      return;
    }

    const channel = client
      .channel('support-desk-widget-settings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'widget_settings',
          filter: 'id=eq.default',
        },
        (payload) => {
          const nextSettings = payload.new as WidgetSettingsRecord;
          if (nextSettings?.position) {
            setPosition(nextSettings.position);
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, config.positionLocked]);

  useEffect(() => {
    if (!conversation) {
      return;
    }

    const channel = client
      .channel(`support-desk-widget:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const nextMessage = payload.new as MessageRecord;

          setMessages((currentMessages) =>
            currentMessages.some((item) => item.id === nextMessage.id)
              ? currentMessages
              : [...currentMessages, nextMessage],
          );

          if (nextMessage.sender_type === 'admin') {
            if (open) {
              void markVisitorMessagesAsRead(client, conversation.id);
            } else {
              setUnreadCount((count) => count + 1);
            }
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversation.id}`,
        },
        (payload) => {
          setConversation(payload.new as ConversationRecord);
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, conversation, open]);

  useEffect(() => {
    if (!visitor || !conversation) {
      return;
    }

    const syncPresence = () =>
      void updateVisitorPresence(client, visitor.id, {
        displayName: displayName || visitor.display_name || undefined,
        email: email || visitor.email || undefined,
        phone: phone || visitor.phone || undefined,
      });

    const syncNavigation = () => {
      syncPresence();
      void logVisitorEvent(client, visitor.id, conversation.id);
    };

    syncPresence();

    const heartbeat = window.setInterval(syncPresence, 30_000);
    const cleanupPushState = patchHistory('pushState', syncNavigation);
    const cleanupReplaceState = patchHistory('replaceState', syncNavigation);

    const handleNavigation = () => syncNavigation();

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);

    return () => {
      window.clearInterval(heartbeat);
      cleanupPushState();
      cleanupReplaceState();
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
    };
  }, [client, conversation, displayName, email, phone, visitor]);

  useEffect(() => {
    if (!open || !conversation) {
      return;
    }

    setUnreadCount(0);
    void markVisitorMessagesAsRead(client, conversation.id);
  }, [client, conversation, open]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages, open]);

  const shellStyle = {
    '--accent': config.accentColor,
    '--z-index': String(config.zIndex),
  } as CSSProperties;

  const introName = visitor?.display_name ?? displayName ?? '';
  const showIdentityFields = showIdentityForm || !introName || !visitor?.email || !visitor?.phone;

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!visitor || !draft.trim()) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const currentConversation =
        !conversation || conversation.status === 'closed'
          ? await ensureConversation(client, visitor.id, true)
          : conversation;

      if (!conversation || currentConversation.id !== conversation.id) {
        setConversation(currentConversation);
        setMessages(await fetchMessages(client, currentConversation.id));
      }

      const nextVisitor = await upsertVisitor(client, visitor.id, {
        displayName,
        email,
        phone,
      });

      setVisitor(nextVisitor);

      const { data, error: insertError } = await client
        .from('messages')
        .insert({
          conversation_id: currentConversation.id,
          sender_id: visitor.id,
          sender_type: 'visitor',
          body: draft.trim(),
          metadata: {
            source: 'widget',
            page: window.location.href,
          },
        })
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      const nextMessage = data as MessageRecord;
      setMessages((currentMessages) =>
        currentMessages.some((item) => item.id === nextMessage.id)
          ? currentMessages
          : [...currentMessages, nextMessage],
      );
      setDraft('');
      setOpen(true);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  }

  async function handleIdentitySave() {
    if (!visitor) {
      return;
    }

    try {
      const nextVisitor = await upsertVisitor(client, visitor.id, {
        displayName,
        email,
        phone,
      });
      setVisitor(nextVisitor);
      setShowIdentityForm(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update visitor info.');
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const form = event.currentTarget.form;
      form?.requestSubmit();
    }
  }

  return (
    <div
      className={joinClasses(
        'sd-widget',
        open && 'is-open',
        position === 'left' ? 'is-left' : 'is-right',
      )}
      style={shellStyle}
    >
      {open ? (
        <section className="sd-panel" aria-label={config.title}>
          <header className="sd-header">
            <div>
              <p className="sd-kicker">{config.subtitle}</p>
              <h2>{config.title}</h2>
              <small>{conversation ? compactUrl(window.location.href) : 'Connecting...'}</small>
            </div>

            <button
              aria-label="Close chat"
              className="sd-close"
              onClick={() => setOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>

          <div className="sd-body">
            {!ready && !error ? (
              <div className="sd-empty">
                <h3>Connecting...</h3>
                <p>Creating a visitor session and joining the live inbox.</p>
              </div>
            ) : null}

            {error ? (
              <div className="sd-empty sd-empty--error">
                <h3>Connection issue</h3>
                <p>{error}</p>
              </div>
            ) : null}

            {ready && !error ? (
              <>
                <div className="sd-intro">
                  <div>
                    <strong>{config.adminLabel}</strong>
                    <p>{config.welcomeText}</p>
                  </div>
                  <button
                    className="sd-text-button"
                    onClick={() => setShowIdentityForm((current) => !current)}
                    type="button"
                  >
                    {showIdentityFields ? 'Hide details' : 'Add your details'}
                  </button>
                </div>

                {showIdentityFields ? (
                  <div className="sd-identity">
                    <label>
                      <span>Name</span>
                      <input
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="Jane Visitor"
                        type="text"
                        value={displayName}
                      />
                    </label>

                    <label>
                      <span>Email</span>
                      <input
                        inputMode="email"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="jane@example.com"
                        type="email"
                        value={email}
                      />
                    </label>

                    <label>
                      <span>Phone</span>
                      <input
                        inputMode="tel"
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="+1 555 123 4567"
                        type="tel"
                        value={phone}
                      />
                    </label>

                    <button className="sd-save" onClick={() => void handleIdentitySave()} type="button">
                      Save details
                    </button>
                  </div>
                ) : null}

                <div className="sd-messages">
                  {messages.length === 0 ? (
                    <div className="sd-empty">
                      <h3>Start the conversation</h3>
                      <p>Your message lands straight in the admin dashboard.</p>
                    </div>
                  ) : null}

                  {messages.map((message) => (
                    <article
                      className={joinClasses(
                        'sd-message',
                        message.sender_type === 'admin' ? 'is-admin' : 'is-visitor',
                      )}
                      key={message.id}
                    >
                      <div className="sd-message__meta">
                        <strong>
                          {message.sender_type === 'admin'
                            ? config.adminLabel
                            : displayName || visitor?.display_name || 'You'}
                        </strong>
                        <span>{formatClockTime(message.created_at)}</span>
                      </div>
                      <p>{message.body}</p>
                    </article>
                  ))}

                  <div ref={endOfMessagesRef} />
                </div>

                <div className="sd-footer-note">
                  <span className="sd-footer-dot" />
                  <small>
                    Visitor tracked {formatRelativeTime(visitor?.last_seen_at)} on{' '}
                    {compactUrl(visitor?.current_url)}
                  </small>
                </div>
              </>
            ) : null}
          </div>

          <form className="sd-composer" onSubmit={handleSend}>
            <textarea
              disabled={!ready || sending}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Write your message..."
              rows={3}
              value={draft}
            />
            <button disabled={!ready || sending || !draft.trim()} type="submit">
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </section>
      ) : null}

      <button className="sd-launcher" onClick={() => setOpen((current) => !current)} type="button">
        <span className="sd-launcher__glyph">{getInitials(config.adminLabel)}</span>
        <span className="sd-launcher__text">
          <strong>{config.launcherLabel}</strong>
          <small>{unreadCount > 0 ? `${unreadCount} new message(s)` : 'Live support inbox'}</small>
        </span>
        {unreadCount > 0 ? <span className="sd-launcher__badge">{unreadCount}</span> : null}
      </button>
    </div>
  );
}

async function ensureAnonymousSession(client: SupabaseClient) {
  const {
    data: { session },
  } = await client.auth.getSession();

  if (session?.user) {
    return session;
  }

  const { data, error } = await client.auth.signInAnonymously();

  if (error) {
    throw new Error(
      'Enable anonymous sign-ins in Supabase Auth before loading the widget.',
    );
  }

  if (!data.session) {
    throw new Error('Supabase did not return an anonymous session.');
  }

  return data.session;
}

async function upsertVisitor(
  client: SupabaseClient,
  visitorId: string,
  identity?: {
    displayName?: string;
    email?: string;
    phone?: string;
  },
): Promise<VisitorRecord> {
  const payload = buildVisitorPresencePayload(identity);

  const { data: existing, error: fetchError } = await client
    .from('visitors')
    .select('*')
    .eq('id', visitorId)
    .maybeSingle();

  if (fetchError && !isMissingRowError(fetchError)) {
    throw fetchError;
  }

  const mutation = existing
    ? client.from('visitors').update(payload).eq('id', visitorId)
    : client.from('visitors').insert({
        id: visitorId,
        first_seen_at: new Date().toISOString(),
        ...payload,
      });

  const { data, error } = await mutation.select('*').single();

  if (error) {
    throw error;
  }

  return data as VisitorRecord;
}

async function ensureConversation(
  client: SupabaseClient,
  visitorId: string,
  forceNew = false,
): Promise<ConversationRecord> {
  if (!forceNew) {
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('visitor_id', visitorId)
      .in('status', ['open', 'pending'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && !isMissingRowError(error)) {
      throw error;
    }

    if (data) {
      return data as ConversationRecord;
    }
  }

  const { data, error } = await client
    .from('conversations')
    .insert({
      visitor_id: visitorId,
      status: 'open',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as ConversationRecord;
}

async function fetchMessages(client: SupabaseClient, conversationId: string): Promise<MessageRecord[]> {
  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as MessageRecord[]) ?? [];
}

async function fetchWidgetSettings(client: SupabaseClient): Promise<WidgetSettingsRecord | null> {
  const { data, error } = await client
    .from('widget_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error && !isMissingOptionalResourceError(error)) {
    throw error;
  }

  return (data as WidgetSettingsRecord | null) ?? null;
}

async function updateVisitorPresence(
  client: SupabaseClient,
  visitorId: string,
  identity?: {
    displayName?: string;
    email?: string;
  },
) {
  const presencePayload = buildVisitorPresencePayload(identity);

  await client.from('visitors').upsert({
    id: visitorId,
    ...presencePayload,
  });
}

async function logVisitorEvent(
  client: SupabaseClient,
  visitorId: string,
  conversationId: string,
) {
  await client.from('visitor_events').insert({
    visitor_id: visitorId,
    conversation_id: conversationId,
    event_type: 'page_view',
    pathname: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    current_url: window.location.href,
    page_title: document.title,
    referrer: document.referrer || null,
    metadata: {
      source: 'widget',
    },
  });
}

async function markVisitorMessagesAsRead(client: SupabaseClient, conversationId: string) {
  await client
    .from('conversations')
    .update({
      unread_by_visitor: 0,
    })
    .eq('id', conversationId);
}

function patchHistory(method: HistoryMethod, callback: () => void) {
  const original = window.history[method];

  window.history[method] = function patchedHistory(
    ...args: Parameters<History['pushState']>
  ): void {
    (original as (...params: Parameters<History['pushState']>) => void).apply(window.history, args);
    window.setTimeout(callback, 0);
  } as History[HistoryMethod];

  return () => {
    window.history[method] = original;
  };
}

function isMissingRowError(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST116';
}

function isMissingOptionalResourceError(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST116' || error?.code === 'PGRST205' || error?.code === '42P01';
}
