# Technical Documentation

## Overview

This is a **multi-tenant AI-powered receptionist and appointment management system** built for small businesses. The application provides both a web interface and phone call handling through an AI agent that can answer questions, manage appointments, and handle customer interactions autonomously.

**Key Features:**
- Multi-tenant architecture with business-scoped data
- AI receptionist for chat and phone calls
- Appointment scheduling and management
- Knowledge base for business information
- Twilio integration for voice calls
- Supabase backend with Row Level Security (RLS)

---

## Tech Stack

### Frontend
- **React 19** - UI framework
- **TanStack Router** - Type-safe routing with file-based routing
- **TanStack Start** - Full-stack React framework with SSR
- **TanStack Query** - Server state management
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - Pre-built component library
- **Recharts** - Data visualization
- **Lucide React** - Icon library

### Backend
- **TanStack Start** - Server-side rendering and API routes
- **Nitro** - Universal server framework (Cloudflare target)
- **Supabase** - PostgreSQL database with auth and RLS
- **Drizzle ORM** - Type-safe database toolkit

### AI & Integrations
- **OpenRouter** - AI model routing (when configured)
- **Lovable AI** - Fallback AI provider (Gemini 3 Flash Preview)
- **Twilio** - Voice call handling
- **Lovable Cloud Auth** - Authentication layer

### Development & Testing
- **Vite** - Build tool and dev server
- **Vitest** - Unit testing framework
- **Testing Library** - React component testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

---

## Architecture

### Multi-Tenancy Model

All data is scoped to a **business** entity. Users can belong to multiple businesses through the `business_members` table with role-based access (`owner`, `admin`, `member`).

**Security Model:**
- Row Level Security (RLS) policies on all tables
- Uses security-definer functions (`is_business_member`, `is_business_admin`) to check access
- Why security-definer? Avoids recursive RLS checks on `business_members` table

**Authentication Flow:**
1. User authenticates via Supabase Auth
2. JWT token contains user ID and claims
3. Middleware (`requireSupabaseAuth`) validates token on server functions
4. RLS policies filter data based on user's business memberships

### Data Access Patterns

**Browser Client (RLS-Protected):**
- Pages read/write data directly through Supabase client
- RLS policies automatically filter data based on authenticated user
- Located in: `src/integrations/supabase/client.ts`

**Server Functions (Privileged Access):**
- AI work and Twilio webhooks run with admin client
- Business membership verified before operations
- Located in: `src/lib/ai.functions.ts`, `src/lib/receptionist.server.ts`
- Why? API keys and secrets must stay server-side

---

## AI Receptionist System

### Architecture

The AI receptionist is a function-calling agent that can:
1. Search the knowledge base
2. Check appointment availability
3. Create/reschedule/cancel appointments
4. Look up existing customers
5. Record callback requests for human follow-up

**Provider Selection:**
- Uses **OpenRouter** if `OPENROUTER_API_KEY` is set (with configurable model)
- Falls back to **Lovable AI** with Gemini 3 Flash Preview (fast, low-latency)
- Why? Preserves migrated provider choice without blocking functionality

### Chat Turns

The receptionist maintains conversation history with these message types:
```typescript
type ChatTurn =
  | { role: "user" | "assistant"; content: string }
  | { role: "assistant"; content: string | null; tool_calls: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };
```

### Available Tools

1. **search_knowledge_base** - Searches business FAQs, services, pricing, hours
2. **check_availability** - Returns available appointment slots for a date
3. **create_appointment** - Books a new appointment (collects all required info first)
4. **reschedule_appointment** - Moves an existing appointment to a new time
5. **cancel_appointment** - Cancels an upcoming appointment
6. **lookup_customer** - Finds customer by phone number
7. **record_callback_request** - Escalates to human (high/medium/low priority)

Tools can be disabled per business via settings (e.g., `booking_enabled: false`).

### Channels

**Chat Channel:**
- Web-based conversation
- Returns formatted responses with markdown support
- Accessed via `chatWithReceptionist` server function

**Phone Channel:**
- Live voice calls through Twilio
- Optimized for spoken responses (1-3 short sentences, no markdown)
- Includes caller's phone number in context for automatic lookup
- Uses TwiML for voice synthesis and speech recognition

---

## Twilio Voice Integration

### Webhook Endpoint

**URL:** `/api/public/twilio/voice`

**Security:**
- Every request verifies `X-Twilio-Signature` header using HMAC-SHA1
- Uses constant-time comparison to prevent timing attacks
- Rejects invalid signatures with 403 error

### Call Flow

1. **Incoming Call** (`step=incoming`)
   - Matches called number to business
   - Creates call log in database
   - Plays AI greeting (configurable per business)
   - Starts speech recognition with `<Gather>`

2. **Gather Speech** (`step=gather`)
   - Receives transcribed speech from caller
   - Appends to conversation history
   - Calls AI receptionist with phone context
   - Synthesizes response with Polly voice
   - Continues conversation loop

3. **Status Callback** (`step=status`)
   - Twilio sends final call status
   - Updates call log with duration and end time

**Voice Selection:**
- Configurable per business (female-natural, male-natural, etc.)
- Uses Amazon Polly voices via Twilio
- Default: Polly.Joanna

### Call Logging

All calls stored in `call_logs` table with:
- Full conversation transcript
- Tools used by AI (e.g., created appointment, requested callback)
- Call metadata (duration, status, timestamps)
- AI-handled flag for analytics

---

## Database Schema

### Core Tables

**businesses**
- Business profile (name, type, timezone, contact info)
- One business can have many users via `business_members`

**business_members**
- Join table: user ↔ business with role
- Roles: `owner`, `admin`, `member`
- Used by RLS security-definer functions

**business_settings**
- Per-business configuration
- AI tone, greeting, voice type
- Feature flags (booking_enabled, cancellation_enabled)

**business_hours**
- Operating hours per day of week (0 = Sunday, 6 = Saturday)
- Open/close times, is_open flag

**services**
- Business offerings with duration and pricing
- Used by AI for knowledge base searches

**knowledge_entries**
- FAQ system (question, answer, category)
- Searchable by AI receptionist
- Can be enabled/disabled per entry

**appointments**
- Scheduled appointments with status (scheduled, completed, cancelled, no-show)
- Links to customer contact info
- Duration in minutes

**contacts**
- Customer database
- Phone, email, notes

**messages**
- Callback requests from AI or customers
- Priority levels (low, medium, high)

**call_logs**
- Voice call history
- Conversation transcripts
- AI tool usage analytics

### Migration System

**legacy_user_map** & **legacy_memberships**
- Used for importing data from previous system
- Links Supabase auth users to legacy IDs
- Only activated after email confirmation (auth triggers)
- Why? Never trust unverified identity

---

## Authentication & Authorization

### Authentication Flow

1. User signs up/logs in via Supabase Auth
2. Token issued containing user ID and claims
3. Browser stores session in local storage
4. Server functions receive token via `Authorization: Bearer <token>` header

### Server Middleware

**requireSupabaseAuth** (`src/integrations/supabase/auth-middleware.ts`)
- Validates JWT token structure (3-part JWT)
- Extracts claims and user ID
- Creates authorized Supabase client
- Injects context into server functions

**Context Shape:**
```typescript
{
  supabase: SupabaseClient,
  userId: string,
  claims: TokenClaims
}
```

### RLS Policies

All tables have policies that call:
- `is_business_member(business_id, user_id)` - Check any access
- `is_business_admin(business_id, user_id)` - Check admin access

These are **security-definer functions** that execute with elevated permissions to avoid recursive RLS on `business_members`.

---

## Appointment System

### Availability Calculation

**Algorithm** (`src/lib/appointments.ts`):
1. Get business hours for requested date's day of week
2. Generate 30-minute slots between open/close times
3. Filter out slots that overlap with existing appointments
4. Return available slots as ISO 8601 timestamps

**Slot Duration:** 30 minutes by default

**Buffer Time:** Appointments are filtered to prevent overlaps

### Booking Flow

1. **Check Availability** - AI calls `check_availability` tool
2. **Suggest Times** - AI presents available slots to customer
3. **Collect Info** - Name, phone, service, date/time, duration
4. **Confirm** - AI summarizes booking details
5. **Create** - AI calls `create_appointment` tool
6. **Record** - Appointment stored with customer contact info

### Phone Number Matching

Uses fuzzy matching to find customers:
- Strips all non-digits
- Compares last 10 digits
- Handles various formats (+1, dashes, parentheses)

---

## Deployment

### Build Process

```bash
npm run build        # Production build for Cloudflare
npm run build:dev    # Development build
```

**Build Output:**
- Server bundle via Nitro (Cloudflare Workers target)
- Client assets via Vite
- SSR entry point: `src/server.ts` (custom error handling wrapper)

### Environment Variables

**Required:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` - Public anon key
- `SUPABASE_SERVICE_KEY` - Admin key (server-only)
- `LOVABLE_API_KEY` - Lovable AI fallback

**Optional:**
- `OPENROUTER_API_KEY` - Use OpenRouter instead of Lovable AI
- `OPENROUTER_MODEL` - Model to use (default: openai/gpt-4o-mini)
- `TWILIO_AUTH_TOKEN` - For webhook signature verification

**Managed by Lovable Cloud:**
- Authentication tokens
- Database credentials
- API keys

### Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite HMR)
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # Lint code
npm run format       # Format code
```

**Dev Server:**
- Port auto-selected by Vite
- Hot Module Replacement (HMR) enabled
- TanStack Router devtools available

---

## Error Handling

### SSR Error Wrapper

**Location:** `src/server.ts`

Wraps the default TanStack Start server entry to:
1. Catch catastrophic SSR errors
2. Capture errors before h3 swallows them
3. Render user-friendly error page
4. Log full error details to console

**Why?** h3 (underlying server framework) transforms some throws into JSON responses that hide the actual error. This wrapper intercepts and logs them properly.

### Error Capture

**Location:** `src/lib/error-capture.ts`

Global error boundary that:
- Captures uncaught exceptions
- Stores last error for SSR correlation
- Reports to Lovable error tracking (if configured)

**Error Page:** Static HTML in `src/lib/error-page.ts`

---

## File Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components (Radix primitives)
│   ├── app-ui.tsx      # Main app shell
│   └── hours-editor.tsx # Business hours configuration
├── hooks/              # React hooks
│   └── use-mobile.tsx  # Responsive breakpoint hook
├── integrations/       # External service integrations
│   ├── lovable/        # Lovable Cloud integration
│   └── supabase/       # Supabase client & auth
│       ├── client.ts          # Browser client
│       ├── client.server.ts   # Admin client
│       ├── auth-middleware.ts # Server auth
│       └── types.ts           # Generated DB types
├── lib/                # Business logic
│   ├── ai.functions.ts        # AI server functions
│   ├── receptionist.server.ts # AI agent core
│   ├── appointments.ts        # Appointment logic
│   ├── business.ts            # Business utilities
│   └── utils.ts               # General utilities
├── routes/             # TanStack Router pages & API
│   ├── api/           # Server endpoints
│   │   └── public/
│   │       └── twilio/
│   │           └── voice.ts  # Twilio webhook
│   └── (pages)/       # App pages (auth-protected)
├── test/              # Test files
│   ├── setup.ts       # Vitest config
│   ├── slots.test.tsx # Appointment tests
│   └── app-routing.test.tsx
├── router.tsx         # Router configuration
├── routeTree.gen.ts   # Generated route tree
├── server.ts          # SSR entry wrapper
├── start.ts           # Client entry
└── styles.css         # Global styles (Tailwind)

drizzle/
├── schema.ts          # Database schema (auto-generated)
└── migrations/        # Schema migrations
    └── 0000_migration.sql

public/
├── favicon.ico
└── robots.txt
```

---

## Testing

### Test Framework

- **Vitest** - Fast unit test runner
- **Testing Library** - React component testing
- **jsdom** - Browser environment simulation

### Running Tests

```bash
npm run test         # Run once (CI mode)
npm run test:watch   # Watch mode for development
```

### Test Files

- `src/test/setup.ts` - Global test configuration
- `src/test/slots.test.tsx` - Appointment availability tests
- `src/test/app-routing.test.tsx` - Routing tests

---

## Project Rules & Conventions

### Data Scoping
- All data is tenant-scoped by `business_id`
- RLS uses security-definer functions to avoid recursion
- Never trust unverified user identity (email confirmation required)

### Code Organization
- Pages read/write via browser client under RLS
- AI work and webhooks use server functions with admin client
- Secrets stay server-side (never exposed to browser)

### AI Provider Strategy
- Prefer OpenRouter when configured (user's migrated choice)
- Fall back to Lovable AI (ensures system always works)
- Use fast models for phone calls (low latency critical)

### Twilio Security
- Always verify `X-Twilio-Signature` before touching data
- Use constant-time comparison for signature verification
- Reject invalid signatures immediately

### Git Workflow
- ⚠️ **Never rewrite published history** (no force push, rebase, amend on pushed commits)
- Why? Connected to Lovable - history rewrites cause sync issues
- Keep branch in working state (commits sync back to Lovable editor)

---

## API Endpoints

### Public Endpoints

**GET/POST `/api/public/twilio/voice`**
- Twilio webhook for voice calls
- Requires valid `X-Twilio-Signature`
- Handles incoming calls, speech gathering, status callbacks

**Query Parameters:**
- `step=incoming` - Initial call
- `step=gather` - Process caller speech
- `step=status` - Call status update

### Protected Server Functions

**POST `chatWithReceptionist`**
- Chat with AI receptionist
- Requires authentication
- Validates business membership

**Input:**
```typescript
{
  businessId: string,
  messages: Array<{ role: "user" | "assistant", content: string }>
}
```

**Output:**
```typescript
{
  reply: string,
  toolsUsed: string[],
  model: string
}
```

---

## Configuration Files

### `vite.config.ts`
- Uses `@lovable.dev/vite-tanstack-config` preset
- Custom server entry: `src/server.ts`
- Includes: React, TanStack Start, Tailwind, TypeScript paths
- Build target: Cloudflare Workers (via Nitro)

### `drizzle.config.ts`
- Drizzle Kit configuration for migrations
- Schema: `drizzle/schema.ts`
- Migrations: `drizzle/migrations/`

### `tsconfig.json`
- Strict TypeScript configuration
- Path alias: `@/*` → `src/*`
- Target: ES2022

### `components.json`
- shadcn/ui configuration
- Component aliases and paths
- Theme: Tailwind CSS v4

### `.prettierrc` & `eslint.config.js`
- Code formatting and linting rules
- React hooks plugin enabled
- Prettier integration

---

## Troubleshooting

### Common Issues

**"Missing Supabase environment variable"**
- Ensure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are set
- Check Lovable Cloud connection

**"Unauthorized: Invalid token"**
- Token may be expired - refresh authentication
- Verify token is being sent in `Authorization` header

**"AI service is temporarily busy" (429)**
- Rate limit hit - wait and retry
- Consider upgrading AI provider plan

**"AI credits are exhausted" (402)**
- Add credits to Lovable AI or configure OpenRouter

**"Twilio webhook invalid signature"**
- Verify `TWILIO_AUTH_TOKEN` is correct
- Check webhook URL uses HTTPS and matches Twilio config
- Ensure request is not modified by proxies

**"No business for number"**
- Called number doesn't match any business phone
- Update business phone number in database

---

## Future Enhancements

See `roadmap.md` for project status and blocked items:

- [ ] Import existing data/users (waiting on exports)
- [ ] Twilio + OpenRouter API keys (user to provide)
- [x] Migration complete (schema, auth, pages, AI, webhook)
- [x] UI polish complete (animations, design system)

---

## Contributing

When working on this project:

1. **Never force push** - connected to Lovable
2. **Test locally** - `npm run test` before committing
3. **Follow TypeScript** - use strict types
4. **Respect RLS** - all data queries must be tenant-scoped
5. **Keep secrets server-side** - never expose API keys to client
6. **Verify Twilio signatures** - security critical for webhooks

---

## License & Credits

Built with [Lovable](https://lovable.dev) - AI-powered full-stack development platform.

This project uses open source software:
- React, TanStack, Vite, Vitest (MIT)
- Supabase client libraries (MIT)
- Radix UI, Tailwind CSS (MIT)
- And many more - see `package.json` for full list

---

## Support

For questions about:
- **Lovable Platform** - See [Lovable docs](https://docs.lovable.dev)
- **TanStack Start** - See [TanStack Start docs](https://tanstack.com/start)
- **Supabase** - See [Supabase docs](https://supabase.com/docs)
- **Twilio** - See [Twilio docs](https://www.twilio.com/docs)

---

**Last Updated:** October 2026
