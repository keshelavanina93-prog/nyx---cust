# Customs Copilot GE

**განაბაჟე თვითონ, ბროკერის გარეშე.** Georgian-first web app for SME importers who self-declare with their own
eCustoms (ASYCUDA World) access: invoice → AI extraction → HS top-3 with tariff citations (human confirms every
line) → customs value / duty / VAT / excise / fees → approval card → field-by-field sheet, XLS and
(experimental) SAD XML → guided eCustoms import, payment, corridor and close.

Built from `CLAUDE_CODE_BRIEF.md` (Phase 1 complete, Phase 2 intake + memory + team, Phase 3 scaffolding).
Hard rules: no automatic submission to customs, no eCustoms credentials stored, no broker role, versioned
tariff/fee/FX data, placeholder tariff blocks export in production, strict tenant isolation, append-only audit.

## Quick start (no credentials needed)

```bash
pnpm install
pnpm db:seed -- --demo      # embedded PGlite in ./.data + placeholder tariff + demo org
pnpm dev                    # http://localhost:3000 → login with any email (AUTH_DEV_LOGIN=true)
```

Login as `demo@example.com` to see the demo org (`/demo/dashboard`). Without `ANTHROPIC_API_KEY` the AI runs in
**mock mode** (`AI_MOCK`): upload `tests/fixtures/invoices/<name>/invoice.json` as the "invoice" and the
pipeline runs end-to-end with synthetic extraction.

### With real services
Copy `.env.example` → `.env.local` and set: `DATABASE_URL` (Neon/Supabase), `BLOB_READ_WRITE_TOKEN`
(Vercel Blob), `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL`/`ANTHROPIC_MODEL_FAST`, `AUTH_SECRET`,
`AUTH_RESEND_KEY` or Google OAuth, `SUPERADMIN_EMAILS` (for `/admin`).
Set `AUTH_DEV_LOGIN=false` in production.

## Scripts
| Command | What |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js 15 |
| `pnpm lint` · `pnpm typecheck` · `pnpm test` | ESLint · tsc · Vitest (unit: fees, value, duties, penalty, value risk, working hours, calculation, tariff, XML, security, intake) |
| `pnpm e2e` | Playwright full flow (starts dev server with AI_MOCK) |
| `pnpm eval` | AI eval over `tests/fixtures/invoices/*` → `/admin/evals` |
| `pnpm xml:diff <sample.xml>` | Structural diff of our SAD XML vs a real eCustoms export |
| `pnpm db:generate` · `pnpm db:migrate` · `pnpm db:seed` · `pnpm db:reset` | Drizzle migrations, seeds, local reset |

## Layout
```
src/app/(marketing)       landing, /pricing, /calculator (landed cost)
src/app/(app)/[org]/      dashboard · shipments/new · shipments/[id]/{intake,lines,hs,calc,approve,export,sheet,ecustoms,payment,corridor,close}
                          onboarding/ecustoms (wedge wizard) · suppliers · memory · settings · tariff (search)
src/app/admin             tariff import (dry run → version), fees/holidays, xml-samples, evals, ai-runs
src/app/api               auth, files (signed), exports, intake/{email,telegram,viber}, cron/nbg, orgs export
src/lib/customs           incoterms, value, duties, fees (+working-hours), penalty, value-risk, fx, calculate, run
src/lib/ai                schemas (Zod), extract, classify (retrieval + citations + post-check), mock, prompts
src/lib/export            model, build-model, sad-xml/{builder,diff,profiles/ge}, sheet, xls, run (gates)
src/lib/tariff            csv (dry run), import (versions), search (Postgres FTS)
src/lib/intake            adapters: email / telegram / viber + shared process (allowlist, link code)
src/db                    schema (Drizzle), client (PGlite ↔ Postgres), seed/ (PLACEHOLDER tariff, reference data)
docs/                     assumptions.md (every UNVERIFIED/ASSUMPTION), xml-mapping.md, guide-content/*.md (ka, editable)
tests/                    unit/, e2e/, fixtures/invoices (16 SYNTHETIC), fixtures/sad-xml/{anon,real}
```

## Verified vs. unverified
See `docs/assumptions.md`. Highlights: fee tiers (Decree №96) are VERIFIED but flagged for re-verification
(amended 20+ times since 2022); FX rule (NBG rate on registration day, art.8) VERIFIED, NBG endpoint
UNVERIFIED; SAD XML is EXPERIMENTAL until compared to a real sample from the importer's own eCustoms
(`pnpm xml:diff`) and imported successfully once.

## Blocking inputs (brief §13)
Official tariff CSV · ≥1 real SAD XML + empty SAD export · 10–30 anonymized invoices with confirmed HS ·
№96 lines 54/54¹/82/82¹/82² current wording · NBG endpoint, VAT-base excise rule, rounding, holidays ·
domain / inbound email / Telegram token / payment provider.
