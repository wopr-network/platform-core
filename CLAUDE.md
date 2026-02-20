# wopr-platform-ui

Next.js 16 web platform — dashboard, onboarding, marketplace, billing, fleet management.

## Commands

```bash
npm run dev      # Next.js dev server (localhost:3000)
npm run build    # next build
npm run check    # biome check + tsc --noEmit (run before committing)
npm run lint     # biome check src/
npm run format   # biome format --write src/
npm test         # vitest run
```

**Linter/formatter is Biome.** Never add ESLint/Prettier config.

## Architecture

```
src/
  app/
    (auth)/           # Login, register, OAuth
    (dashboard)/      # Main app shell (authenticated)
    (onboard)/        # Onboarding wizard
    auth/             # Auth API routes
    channels/         # Channel management pages
    fleet/            # Multi-bot fleet view
    instances/        # Bot instance pages
    onboarding/       # Onboarding flow pages
    plugins/          # Plugin marketplace
    pricing/          # Pricing page
    privacy/ terms/   # Legal pages
    layout.tsx        # Root layout
    page.tsx          # Landing page
  components/
    auth/             # Auth forms and OAuth buttons
    billing/          # Subscription and credit UI
    bot-settings/     # Bot config panels
    channel-wizard/   # Channel setup wizard
    dashboard/        # Dashboard widgets
    landing/          # Marketing landing page
    marketplace/      # Plugin marketplace UI
    observability/    # Metrics and monitoring
    onboarding/       # Onboarding step components
    pricing/          # Pricing cards
    sidebar.tsx       # App sidebar
    ui/               # Base design system components
  hooks/              # Custom React hooks
  lib/                # Shared utilities, auth config
  middleware.ts       # Auth middleware (better-auth)
```

## Key Libraries

- **Next.js 16** with App Router
- **better-auth** for authentication
- **Tailwind CSS v4** (PostCSS plugin, not standalone CLI)
- **Radix UI** for headless primitives
- **framer-motion** for animations
- **Recharts** for data visualization
- **shadcn** (component generator — run `npx shadcn add <component>` to add components)

## Design Principles (Critical)

- **Dark mode first.** All components must look correct in dark mode before light mode.
- **Declarative capability resolution** — never build per-capability bespoke UI. Plugins declare `requires: ["tts"]` and the platform renders generically from the capability registry. See `<CapabilityResolver>` pattern (WOP-490).
- **No generic shadcn defaults.** Components should be branded — custom colors, animations, and spacing. Use `frontend-design` and `ui-ux-pro-max` skills when implementing UI stories.

## Auth

- `better-auth` handles sessions. Config in `src/lib/auth.ts`.
- Middleware at `src/middleware.ts` — protects `(dashboard)` routes.
- OAuth buttons in `src/app/auth/oauth-buttons.tsx`.

## Issue Tracking

All issues in **Linear** (team: WOPR). No GitHub issues. Issue descriptions start with `**Repo:** wopr-network/wopr-platform-ui`.

## Session Memory

At the start of every WOPR session, **read `~/.wopr-memory.md` if it exists.** It contains recent session context: which repos were active, what branches are in flight, and how many uncommitted changes exist. Use it to orient quickly without re-investigating.

The `Stop` hook writes to this file automatically at session end. Only non-main branches are recorded — if everything is on `main`, nothing is written for that repo.