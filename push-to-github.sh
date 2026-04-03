#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  Esta Feito — GitHub Push Script
#  Initialises git, creates the GitHub repo, and pushes everything.
#
#  Prerequisites:
#    - git installed
#    - GitHub CLI (gh) installed  →  https://cli.github.com
#      OR a GitHub personal access token (classic) with repo scope
#
#  Usage:
#    chmod +x push-to-github.sh
#    ./push-to-github.sh
#
#  Or with explicit credentials:
#    GITHUB_USER=yourname GITHUB_TOKEN=ghp_xxx ./push-to-github.sh
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[github]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}  $*"; }
err()  { echo -e "${RED}[error]${NC} $*"; exit 1; }

REPO_NAME="${REPO_NAME:-esta-feito}"
REPO_DESC="On-demand home services marketplace for Mozambique (Tete & Maputo)"
REPO_PRIVATE="${REPO_PRIVATE:-false}"   # set to "true" to make private

# ── Detect auth method ────────────────────────
if command -v gh &>/dev/null && gh auth status &>/dev/null 2>&1; then
  AUTH_METHOD="gh"
  GITHUB_USER=$(gh api user --jq .login)
  log "Using GitHub CLI — logged in as: ${GITHUB_USER}"
elif [[ -n "${GITHUB_TOKEN:-}" && -n "${GITHUB_USER:-}" ]]; then
  AUTH_METHOD="token"
  log "Using personal access token for: ${GITHUB_USER}"
else
  echo ""
  echo "Choose authentication method:"
  echo "  1) GitHub CLI (gh)    — recommended, run 'gh auth login' first"
  echo "  2) Personal access token"
  echo ""
  read -rp "Enter 1 or 2: " choice

  if [[ "$choice" == "1" ]]; then
    command -v gh &>/dev/null || err "gh CLI not found. Install from https://cli.github.com"
    gh auth login
    AUTH_METHOD="gh"
    GITHUB_USER=$(gh api user --jq .login)
  else
    read -rp "GitHub username: " GITHUB_USER
    read -rsp "Personal access token (ghp_...): " GITHUB_TOKEN; echo
    AUTH_METHOD="token"
  fi
fi

REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}"

# ── Init git ──────────────────────────────────
log "Initialising git repository..."
if [[ ! -d ".git" ]]; then
  git init
  log "  ✓ git init"
fi

# Ensure .gitignore exists
cat > .gitignore << 'GITIGNORE'
node_modules/
.next/
dist/
build/
.env
.env.local
*.log
logs/
.DS_Store
.expo/
android/
ios/
*.apk
*.ipa
google-services.json
GoogleService-Info.plist
.turbo/
coverage/
GITIGNORE

# ── Create GitHub repository ──────────────────
log "Creating GitHub repository: ${GITHUB_USER}/${REPO_NAME}..."
REPO_EXISTS=false

if [[ "$AUTH_METHOD" == "gh" ]]; then
  if gh repo view "${GITHUB_USER}/${REPO_NAME}" &>/dev/null 2>&1; then
    REPO_EXISTS=true
    warn "  Repository already exists — will push to existing repo"
  else
    gh repo create "${REPO_NAME}" \
      --description "${REPO_DESC}" \
      --public \
      --confirm 2>/dev/null || \
    gh repo create "${REPO_NAME}" \
      --description "${REPO_DESC}" \
      $( [[ "$REPO_PRIVATE" == "true" ]] && echo "--private" || echo "--public" )
    log "  ✓ Repository created: ${REPO_URL}"
  fi
else
  # Use GitHub REST API
  HTTP=$(curl -s -o /tmp/gh_create.json -w "%{http_code}" \
    -X POST https://api.github.com/user/repos \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"${REPO_NAME}\",
      \"description\": \"${REPO_DESC}\",
      \"private\": ${REPO_PRIVATE},
      \"auto_init\": false
    }")
  if [[ "$HTTP" == "201" ]]; then
    log "  ✓ Repository created: ${REPO_URL}"
  elif [[ "$HTTP" == "422" ]]; then
    REPO_EXISTS=true
    warn "  Repository already exists — will push to existing repo"
  else
    cat /tmp/gh_create.json
    err "Failed to create repository (HTTP ${HTTP})"
  fi
fi

# ── Configure remote ──────────────────────────
log "Configuring git remote..."
if git remote get-url origin &>/dev/null 2>&1; then
  git remote set-url origin "${REPO_URL}.git"
else
  if [[ "$AUTH_METHOD" == "token" ]]; then
    git remote add origin "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git"
  else
    git remote add origin "${REPO_URL}.git"
  fi
fi
log "  ✓ Remote: ${REPO_URL}"

# ── Stage and commit ──────────────────────────
log "Staging all files..."
git add -A

CHANGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
if [[ "$CHANGED" == "0" ]]; then
  warn "Nothing to commit — working tree is clean"
else
  log "  ${CHANGED} files staged"
  git -c user.email="deploy@estafeito.co.mz" \
      -c user.name="Esta Feito" \
      commit -m "🚀 Initial commit — Esta Feito marketplace

Full-stack on-demand services marketplace for Mozambique.

Stack:
- Backend: Node.js + Express + MongoDB + TypeScript
- Web:     Next.js 15 + Tailwind CSS v4
- Mobile:  React Native + Expo + NativeWind
- Deploy:  Google Cloud Run + Vercel + Expo EAS

Features:
- Phone OTP auth (Twilio)
- Job posting with geolocation
- Provider quotes and booking
- WhatsApp deep links
- M-Pesa + eMola payments
- Real-time chat (Socket.io)
- Push notifications (Expo)
- Admin panel
- Dummy seed data (21 users, 18 jobs, 7 reviews)"
  log "  ✓ Committed ${CHANGED} files"
fi

# ── Push ──────────────────────────────────────
log "Pushing to GitHub..."
git branch -M main

if [[ "$AUTH_METHOD" == "gh" ]]; then
  gh auth setup-git 2>/dev/null || true
fi

git push -u origin main --force

# ── Done ──────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Esta Feito pushed to GitHub! 🎉${NC}"
echo -e "${GREEN}════════════════════════════════════════════════${NC}"
echo ""
echo "  📁 Repository:  ${REPO_URL}"
echo "  🌿 Branch:      main"
echo "  📄 Files:       ${CHANGED}"
echo ""
echo "  Next steps:"
echo "    1. Deploy API:  GCP_PROJECT_ID=your-id ./deploy/deploy-cloud-run.sh"
echo "    2. Deploy web:  cd apps/web && vercel --prod"
echo "    3. Build app:   cd apps/mobile && eas build --platform android"
echo "    4. Auto-deploy: connect this repo to Cloud Build"
echo "       https://console.cloud.google.com/cloud-build/triggers"
echo ""
