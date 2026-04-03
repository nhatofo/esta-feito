#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  Esta Feito — GCP Project Bootstrap Script
#  Run this ONCE before the first deployment.
#
#  Usage:
#    chmod +x deploy/setup-gcp.sh
#    GCP_PROJECT_ID=my-project-id ./deploy/setup-gcp.sh
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-africa-south1}"
SA_NAME="esta-feito-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }

[[ -z "$PROJECT_ID" ]] && { echo "Set GCP_PROJECT_ID env var"; exit 1; }

log "Setting up GCP project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

# ── Enable APIs ───────────────────────────────
log "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  --quiet
log "  ✓ APIs enabled"

# ── Service account ───────────────────────────
log "Creating service account..."
if ! gcloud iam service-accounts describe "${SA_EMAIL}" --quiet 2>/dev/null; then
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="Esta Feito Runtime SA" \
    --quiet
fi
log "  ✓ Service account: ${SA_EMAIL}"

# ── IAM roles ─────────────────────────────────
log "Granting IAM roles..."
for ROLE in \
  roles/secretmanager.secretAccessor \
  roles/run.invoker \
  roles/logging.logWriter \
  roles/monitoring.metricWriter; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --quiet
  log "  ✓ ${ROLE}"
done

# Allow Cloud Build to deploy to Cloud Run
CB_SA="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')@cloudbuild.gserviceaccount.com"
for ROLE in \
  roles/run.admin \
  roles/iam.serviceAccountUser \
  roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CB_SA}" \
    --role="${ROLE}" \
    --quiet
done
log "  ✓ Cloud Build roles granted"

# ── Container Registry ────────────────────────
log "Configuring Container Registry..."
gcloud auth configure-docker --quiet
log "  ✓ Docker configured for GCR"

# ── Update service YAML ───────────────────────
log "Updating service YAML with project ID..."
sed -i "s/PROJECT_ID/${PROJECT_ID}/g" "$(dirname "$0")/cloud-run-service.yaml"
log "  ✓ cloud-run-service.yaml updated"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  GCP Setup Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo "  Project:          ${PROJECT_ID}"
echo "  Region:           ${REGION}"
echo "  Service Account:  ${SA_EMAIL}"
echo ""
echo "  Next: Run the deployment script:"
echo "    GCP_PROJECT_ID=${PROJECT_ID} ./deploy/deploy-cloud-run.sh"
echo ""
