<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Data is tenant-scoped by business; RLS uses `is_business_member`/`is_business_admin` security-definer functions. Why: avoids recursive RLS on business_members.
- Pages read/write via the browser client under RLS; only AI work runs in server functions (`src/lib/ai.functions.ts`) and `src/lib/receptionist.server.ts`. Why: secrets stay server-side.
- AI uses OpenRouter when OPENROUTER_API_KEY is set, else Lovable AI. Why: preserves the migrated provider without blocking use.
- Twilio webhook lives at `/api/public/twilio/voice` and must verify X-Twilio-Signature before touching data.
- Imported users are linked via `legacy_user_map`/`legacy_memberships` only after email confirmation (auth triggers). Why: never trust unverified identity.
