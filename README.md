# Support Desk Widget + Admin

A Supabase-backed live chat system with:

- an embeddable widget installed with a single JavaScript URL
- an admin dashboard for tracking visitors and replying in real time
- anonymous visitor sessions for public websites
- email/password auth for dashboard users

## What you get

- Admin app at `/`
- Widget loader at `/chatbot-widget.js`
- Widget app bundle at `/chatbot-widget-app.js`
- Supabase schema in [`supabase/schema.sql`](./supabase/schema.sql)

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Run the app:

```bash
npm run dev
```

3. Build production files:

```bash
npm run build
```

The production bundle lands in `dist/`.

## Supabase setup

1. Open the Supabase SQL editor and run [`supabase/schema.sql`](./supabase/schema.sql).
2. In `Authentication -> Providers`, enable:
   - Email
   - Anonymous Sign-Ins
3. Create your first admin user in `Authentication -> Users`.
4. Promote that profile row:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

After that, log into the admin dashboard with the same email and password.

## Environment variables

The project already includes your Supabase public config in `.env`.

If you want to swap projects later, update:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_WIDGET_TITLE=Support Desk
VITE_WIDGET_SUBTITLE=Live chat powered by Supabase
VITE_WIDGET_WELCOME=Ask anything and the admin dashboard will see your message instantly.
VITE_WIDGET_ACCENT_COLOR=#f97316
VITE_WIDGET_POSITION=right
VITE_WIDGET_LAUNCHER_LABEL=Chat with us
VITE_WIDGET_ADMIN_LABEL=Support
```

## Embed snippet

After deploying `dist/chatbot-widget.js` and `dist/chatbot-widget-app.js` to your server or CDN, install the widget with:

```html
<script
  src="https://your-domain.com/chatbot-widget.js"
  data-app-url="https://your-domain.com/chatbot-widget-app.js"
  data-title="Chat with our team"
  data-subtitle="Typically replies in a few minutes"
  data-welcome="Tell us what you need and the admin will see it instantly."
  data-accent-color="#ea580c"
  data-launcher-label="Need help?"
  data-admin-label="Support"
></script>
```

Optional overrides:

```html
<script
  src="https://your-domain.com/chatbot-widget.js"
  data-app-url="https://your-domain.com/chatbot-widget-app.js"
  data-supabase-url="https://your-project.supabase.co"
  data-supabase-anon-key="your-public-anon-key"
  data-position="left"
></script>
```

If `data-position` is omitted, the widget uses the live default saved in the admin dashboard.

If your CMS or cache plugin rewrites third-party script URLs, set `data-app-url` to the full app bundle URL and exclude both widget URLs from minify/combine/defer rules.

## Admin workflow

- Visitors are signed in anonymously when the widget loads.
- The widget stores visitor presence, page URL, page title, referrer, and message history.
- Admins log in with Supabase Auth and only gain dashboard access when `profiles.role` is `admin` or `agent`.
- Admins can change the default widget position from the dashboard.
- Realtime subscriptions keep both the widget and the dashboard in sync.

## Deployment

Deploy `dist/` to any static host:

- Vercel
- Netlify
- Cloudflare Pages
- your own VPS / shared hosting

Host the admin dashboard at the site root and the widget script at `/chatbot-widget.js`.
