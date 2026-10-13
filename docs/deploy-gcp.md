# Deploying on Google Cloud (Cloud Run + Cloud SQL + Cloud Storage + Vertex AI)

Project: `customs-copilot-ge` (dedicated, billing account "My Billing Account"), region `europe-west1`.
Everything below was created with `gcloud` on 2026-10-13; re-run only the parts you change.

## Resources
| Resource | Name |
|---|---|
| Cloud SQL (Postgres 16, Enterprise, db-custom-1-3840, zonal) | `ccg-pg` → connection `customs-copilot-ge:europe-west1:ccg-pg`, db `ccg`, user `ccg` |
| Cloud Storage (private, uniform access) | `gs://ccg-files-265781216571` |
| Artifact Registry (docker) | `europe-west1-docker.pkg.dev/customs-copilot-ge/app` |
| Runtime service account | `ccg-run@customs-copilot-ge.iam.gserviceaccount.com` (cloudsql.client, aiplatform.user, secretmanager.secretAccessor, storage.objectAdmin on the bucket) |
| Secrets (Secret Manager) | `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`, `DB_PASSWORD` |
| Cloud Run service | `customs-copilot-ge` |
| Cloud Scheduler | `ccg-nbg-daily` → `GET /api/cron/nbg` with `Authorization: Bearer $CRON_SECRET` |

## Build & deploy
```bash
P=customs-copilot-ge; R=europe-west1; IMG=$R-docker.pkg.dev/$P/app/customs-copilot-ge
gcloud builds submit --project=$P --region=$R --tag $IMG:vN --timeout=1800s
gcloud run deploy customs-copilot-ge --project=$P --region=$R --image $IMG:vN \
  --service-account ccg-run@$P.iam.gserviceaccount.com \
  --add-cloudsql-instances $P:$R:ccg-pg \
  --set-secrets DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest,CRON_SECRET=CRON_SECRET:latest \
  --set-env-vars STORAGE=gcs,GCS_BUCKET=ccg-files-265781216571,AI_PROVIDER=vertex,GOOGLE_VERTEX_PROJECT=$P,GOOGLE_VERTEX_LOCATION=global,ANTHROPIC_MODEL=claude-sonnet-5-5,ANTHROPIC_MODEL_FAST=claude-haiku-5-5,WORKING_HOURS_TZ=Asia/Tbilisi,NBG_RATES_URL=https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/ka/json,AUTH_DEV_LOGIN=false,FEATURE_XML_EXPORT=true,APP_BASE_URL=https://<service-url> \
  --allow-unauthenticated --min-instances 0 --max-instances 3 --cpu 1 --memory 1Gi --timeout 300
```
Migrations run automatically on first DB access (`DB_AUTO_MIGRATE` defaults on).

**Public access:** the organization enforces `iam.allowedPolicyMemberDomains` (domain-restricted sharing), which blocks
`allUsers`. It is overridden at project level (`gcloud org-policies set-policy` with `allowAll: true`), after which
`gcloud run services add-iam-policy-binding ... --member=allUsers --role=roles/run.invoker` succeeds (allow ~1–2 min to propagate).

Live URL: https://customs-copilot-ge-265781216571.europe-west1.run.app

## First-time seed (reference data + placeholder tariff)
```bash
curl -X POST https://<service-url>/api/admin/seed -d '' -H "Authorization: Bearer $(gcloud secrets versions access latest --secret CRON_SECRET --project $P)"
```

## AI self-check (no login needed)
```bash
SEC=$(gcloud secrets versions access latest --secret CRON_SECRET --project $P); URL=https://customs-copilot-ge-265781216571.europe-west1.run.app
curl -s $URL/api/admin/ai-check -H "Authorization: Bearer $SEC"                      # ping main + fast model
curl -s -X POST $URL/api/admin/ai-check -H "Authorization: Bearer $SEC" -F file=@tests/fixtures/invoices/tr-textiles-pdf/invoice.pdf   # real extraction + HS
```

## Claude on Vertex AI
Models resolve on the `global` location (`claude-sonnet-5-5`, `claude-haiku-5-5`). A new project has **zero quota**
until the models are enabled: Console → Vertex AI → Model Garden → "Claude Sonnet 5.5" / "Claude Haiku 5.5" → **Enable**
(accept terms). Enabling alone is NOT enough for this project: the admin-granted maximum for the metric
`global_online_prediction_requests_per_base_model` is **0** for `anthropic-claude-haiku` and `anthropic-claude-sonnet`
(verified 2026-10-13 via `gcloud alpha services quota update` → `COMMON_QUOTA_CONSUMER_OVERRIDE_TOO_HIGH max=0`).
File a quota increase: Console → IAM & Admin → Quotas & System Limits → filter metric
`aiplatform.googleapis.com/global_online_prediction_requests_per_base_model`, dimension `base_model` =
`anthropic-claude-haiku` and `anthropic-claude-sonnet` → Edit quota → request e.g. 60/min each. Until then, AI calls fail and the UI shows the error;
set `AI_MOCK=true` on the service to demo without AI.

## Auth in production
`AUTH_DEV_LOGIN` must be `false`. Configure one of: `AUTH_RESEND_KEY` + `AUTH_EMAIL_FROM` (magic link) or
`AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` (Google OAuth, redirect URI `https://<service-url>/api/auth/callback/google`).
Set `SUPERADMIN_EMAILS` for `/admin`.

## Intake (Phase 2)
Set `INBOUND_EMAIL_SECRET`, `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET` (register webhook at
`https://<service-url>/api/intake/telegram` with `secret_token`), optionally `FEATURE_VIBER=true` + `VIBER_AUTH_TOKEN`.
