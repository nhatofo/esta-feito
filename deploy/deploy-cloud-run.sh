#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  Esta Feito — Google Cloud Run Deployment Script
#  -------------------------------------------------------
#  Prerequisites:
#    1. gcloud CLI installed  →  https://cloud.google.com/sdk/docs/install
#    2. Authenticated         →  gcloud auth login
#    3. Project set           →  gcloud config set project YOUR_PROJECT_ID
#    4. MongoDB Atlas cluster created (free M0 is fine for MVP)
#       Get connection string from https://cloud.mongodb.com
#
#  Usage:
#    chmod +x deploy/deploy-cloud-run.sh
#    ./deploy/deploy-cloud-run.sh
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

# ── CONFIG — edit these ───────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
REGION="${GCP_REGION:-africa-south1}"          # Johannesburg — closest to Mozambique
SERVICE_NAME="esta-feito-api"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
WEB_SERVICE_NAME="esta-feito-web"

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }
err()  { echo -e "${RED}[error]${NC} $*"; exit 1; }

# ── Check prerequisites ───────────────────────────────────────
log "Checking prerequisites..."
command -v gcloud >/dev/null 2>&1 || err "gcloud CLI not found. Install from https://cloud.google.com/sdk"
command -v docker  >/dev/null 2>&1 || err "Docker not found. Install from https://docs.docker.com/get-docker/"

ACTIVE_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ "$ACTIVE_PROJECT" != "$PROJECT_ID" ]]; then
  warn "Active project is '$ACTIVE_PROJECT', expected '$PROJECT_ID'"
  warn "Run: gcloud config set project $PROJECT_ID"
  read -p "Continue anyway? [y/N] " yn
  [[ "$yn" =~ ^[Yy]$ ]] || exit 1
fi

# ── Enable required GCP APIs ──────────────────────────────────
log "Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  --project="${PROJECT_ID}" --quiet

# ── Read secrets (prompt if not set as env vars) ──────────────
log "Configuring secrets..."

prompt_secret() {
  local VAR_NAME=$1
  local PROMPT=$2
  if [[ -z "${!VAR_NAME:-}" ]]; then
    read -rsp "  ${PROMPT}: " value; echo
    eval "${VAR_NAME}='${value}'"
  fi
}

prompt_secret "MONGODB_URI"          "MongoDB Atlas connection string (mongodb+srv://...)"
prompt_secret "JWT_SECRET"           "JWT secret (random 64-char string)"
prompt_secret "JWT_REFRESH_SECRET"   "JWT refresh secret (different random string)"
prompt_secret "TWILIO_ACCOUNT_SID"   "Twilio Account SID"
prompt_secret "TWILIO_AUTH_TOKEN"    "Twilio Auth Token"
prompt_secret "TWILIO_PHONE_NUMBER"  "Twilio phone number (+1XXXXXXXXXX)"
prompt_secret "CLOUDINARY_CLOUD_NAME" "Cloudinary cloud name"
prompt_secret "CLOUDINARY_API_KEY"   "Cloudinary API key"
prompt_secret "CLOUDINARY_API_SECRET" "Cloudinary API secret"

# Optional — skip if not ready
MPESA_CONSUMER_KEY="${MPESA_CONSUMER_KEY:-SANDBOX_KEY_REPLACE_BEFORE_PRODUCTION}"
MPESA_CONSUMER_SECRET="${MPESA_CONSUMER_SECRET:-SANDBOX_SECRET_REPLACE_BEFORE_PRODUCTION}"
MPESA_SHORTCODE="${MPESA_SHORTCODE:-174379}"
MPESA_PASSKEY="${MPESA_PASSKEY:-SANDBOX_PASSKEY}"

# ── Store secrets in Secret Manager ──────────────────────────
log "Storing secrets in GCP Secret Manager..."

store_secret() {
  local NAME=$1
  local VALUE=$2
  if gcloud secrets describe "${NAME}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    echo -n "${VALUE}" | gcloud secrets versions add "${NAME}" --data-file=- --project="${PROJECT_ID}" --quiet
  else
    echo -n "${VALUE}" | gcloud secrets create "${NAME}" --data-file=- --project="${PROJECT_ID}" --replication-policy="automatic" --quiet
  fi
  log "  ✓ ${NAME}"
}

store_secret "MONGODB_URI"             "${MONGODB_URI}"
store_secret "JWT_SECRET"              "${JWT_SECRET}"
store_secret "JWT_REFRESH_SECRET"      "${JWT_REFRESH_SECRET}"
store_secret "TWILIO_ACCOUNT_SID"      "${TWILIO_ACCOUNT_SID}"
store_secret "TWILIO_AUTH_TOKEN"       "${TWILIO_AUTH_TOKEN}"
store_secret "TWILIO_PHONE_NUMBER"     "${TWILIO_PHONE_NUMBER}"
store_secret "CLOUDINARY_CLOUD_NAME"   "${CLOUDINARY_CLOUD_NAME}"
store_secret "CLOUDINARY_API_KEY"      "${CLOUDINARY_API_KEY}"
store_secret "CLOUDINARY_API_SECRET"   "${CLOUDINARY_API_SECRET}"
store_secret "MPESA_CONSUMER_KEY"      "${MPESA_CONSUMER_KEY}"
store_secret "MPESA_CONSUMER_SECRET"   "${MPESA_CONSUMER_SECRET}"
store_secret "MPESA_SHORTCODE"         "${MPESA_SHORTCODE}"
store_secret "MPESA_PASSKEY"           "${MPESA_PASSKEY}"

# ── Build & push Docker image ─────────────────────────────────
log "Building Docker image from monorepo root..."
cd "$(dirname "$0")/.."    # repo root

# Authenticate Docker to GCR
gcloud auth configure-docker --quiet

docker build \
  --file apps/backend/Dockerfile \
  --tag "${IMAGE_NAME}:latest" \
  --tag "${IMAGE_NAME}:$(git rev-parse --short HEAD 2>/dev/null || echo 'manual')" \
  --platform linux/amd64 \
  .

log "Pushing image to Google Container Registry..."
docker push "${IMAGE_NAME}:latest"

# ── Deploy to Cloud Run ───────────────────────────────────────
log "Deploying to Cloud Run (${REGION})..."

WEB_URL="https://${WEB_SERVICE_NAME}-$(gcloud config get-value project | tr ':' '-')-uc.a.run.app"
CALLBACK_BASE="https://${SERVICE_NAME}-$(gcloud config get-value project | tr ':' '-')-uc.a.run.app"

gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_NAME}:latest" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --concurrency=80 \
  --timeout=30s \
  --set-env-vars="NODE_ENV=production,PORT=8080,MPESA_ENV=sandbox" \
  --set-secrets="\
MONGODB_URI=MONGODB_URI:latest,\
JWT_SECRET=JWT_SECRET:latest,\
JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest,\
TWILIO_ACCOUNT_SID=TWILIO_ACCOUNT_SID:latest,\
TWILIO_AUTH_TOKEN=TWILIO_AUTH_TOKEN:latest,\
TWILIO_PHONE_NUMBER=TWILIO_PHONE_NUMBER:latest,\
CLOUDINARY_CLOUD_NAME=CLOUDINARY_CLOUD_NAME:latest,\
CLOUDINARY_API_KEY=CLOUDINARY_API_KEY:latest,\
CLOUDINARY_API_SECRET=CLOUDINARY_API_SECRET:latest,\
MPESA_CONSUMER_KEY=MPESA_CONSUMER_KEY:latest,\
MPESA_CONSUMER_SECRET=MPESA_CONSUMER_SECRET:latest,\
MPESA_SHORTCODE=MPESA_SHORTCODE:latest,\
MPESA_PASSKEY=MPESA_PASSKEY:latest" \
  --project="${PROJECT_ID}" \
  --quiet

# ── Get deployed URL ──────────────────────────────────────────
API_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region="${REGION}" --project="${PROJECT_ID}" \
  --format="value(status.url)")

log "Updating ALLOWED_ORIGINS and callback URLs..."
gcloud run services update "${SERVICE_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --update-env-vars="\
ALLOWED_ORIGINS=${WEB_URL},http://localhost:3000,\
MPESA_CALLBACK_URL=${API_URL}/api/payments/mpesa/callback,\
EMOLA_CALLBACK_URL=${API_URL}/api/payments/emola/callback" \
  --quiet

# ── Seed database ─────────────────────────────────────────────
log "Seeding database with dummy data..."
MONGODB_URI="${MONGODB_URI}" npx ts-node \
  --project apps/backend/tsconfig.json \
  apps/backend/src/seeds/seed.ts \
  2>/dev/null && log "  ✓ Database seeded" || warn "  Seeding failed — run manually later"

# ── Health check ──────────────────────────────────────────────
log "Health check..."
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health")
if [[ "$HTTP_STATUS" == "200" ]]; then
  log "  ✓ API is healthy"
else
  warn "  API returned HTTP ${HTTP_STATUS} — check Cloud Run logs"
fi

# ── Deploy web to Vercel (optional) ──────────────────────────
if command -v vercel >/dev/null 2>&1; then
  log "Deploying web to Vercel..."
  cd apps/web
  NEXT_PUBLIC_API_URL="${API_URL}/api" vercel --prod --yes
  cd ../..
else
  warn "Vercel CLI not found. Deploy web manually:"
  warn "  cd apps/web && NEXT_PUBLIC_API_URL=${API_URL}/api vercel --prod"
fi

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Esta Feito — Deployed Successfully! 🚀${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo "  🌐 API URL:        ${API_URL}"
echo "  📊 Health:         ${API_URL}/health"
echo "  📋 Cloud Console:  https://console.cloud.google.com/run?project=${PROJECT_ID}"
echo ""
echo "  Test accounts (OTP shown in Cloud Run logs in dev):"
echo "    Admin:    +258840000001"
echo "    Customer: +258841111001"
echo "    Provider: +258842222001"
echo ""
echo "  Next steps:"
echo "    1. Update NEXT_PUBLIC_API_URL in apps/web/.env.local → ${API_URL}/api"
echo "    2. Deploy web: cd apps/web && vercel --prod"
echo "    3. Build mobile: cd apps/mobile && eas build --platform android"
echo ""
