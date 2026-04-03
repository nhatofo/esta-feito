# Esta Feito — Google Cloud Run Deployment Guide

## Overview

```
Internet → Cloud Run (API) ← MongoDB Atlas (free M0)
                ↑
         Next.js on Vercel
```

| Service        | Platform         | Cost (MVP)     |
|----------------|------------------|----------------|
| API backend    | Google Cloud Run | ~$0 (free tier)|
| Database       | MongoDB Atlas M0 | Free forever   |
| Web frontend   | Vercel           | Free tier      |
| File storage   | Cloudinary       | Free tier      |
| SMS OTP        | Twilio           | ~$0.05/SMS     |

---

## Step 1 — MongoDB Atlas (database)

1. Go to https://cloud.mongodb.com → **Create a free M0 cluster**
2. Choose region: **AWS / Cape Town (af-south-1)** (closest to Mozambique)
3. Create database user: `esta-feito-user` / strong password
4. Network access → **Allow from anywhere** (0.0.0.0/0) for Cloud Run
5. Connect → **Drivers** → copy connection string:
   ```
   mongodb+srv://esta-feito-user:PASSWORD@cluster0.xxxxx.mongodb.net/esta-feito
   ```
6. Save this — it's your `MONGODB_URI`

---

## Step 2 — Google Cloud Project

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Create project (or use existing)
gcloud projects create esta-feito-prod --name="Esta Feito"
gcloud config set project esta-feito-prod

# Enable billing (required for Cloud Run)
# https://console.cloud.google.com/billing

# Bootstrap IAM, APIs, service account
GCP_PROJECT_ID=esta-feito-prod ./deploy/setup-gcp.sh
```

---

## Step 3 — Get API credentials

### Twilio (SMS OTP)
1. https://twilio.com → Sign up (free trial gives $15 credit)
2. Get: Account SID, Auth Token, Phone Number
3. Upgrade to paid for Mozambique SMS (+258)

### Cloudinary (photo uploads)
1. https://cloudinary.com → Free account
2. Dashboard → get: Cloud Name, API Key, API Secret

### M-Pesa Daraja (payments — sandbox first)
1. https://developer.safaricom.co.ke → Create account
2. Create app → get: Consumer Key, Consumer Secret
3. Use test credentials for sandbox:
   - Shortcode: `174379`
   - Passkey: (from developer portal)

---

## Step 4 — Deploy to Cloud Run

```bash
# Clone and enter repo
git clone https://github.com/YOUR_USER/esta-feito.git
cd esta-feito

# Run the deploy script (prompts for secrets)
GCP_PROJECT_ID=esta-feito-prod \
GCP_REGION=africa-south1 \
  ./deploy/deploy-cloud-run.sh
```

The script will:
1. Enable GCP APIs
2. Store secrets in Secret Manager
3. Build Docker image and push to GCR
4. Deploy to Cloud Run
5. Seed the database with dummy data
6. Run a health check

Expected output:
```
════════════════════════════════════════════════
  Esta Feito — Deployed Successfully! 🚀
════════════════════════════════════════════════

  API URL:    https://esta-feito-api-xxxx-ew.a.run.app
  Health:     https://esta-feito-api-xxxx-ew.a.run.app/health
```

---

## Step 5 — Seed database with dummy data

The deploy script seeds automatically. If you need to re-seed:

**Option A — Via seed script (local):**
```bash
MONGODB_URI="mongodb+srv://..." \
  npx ts-node apps/backend/src/seeds/seed.ts --reset
```

**Option B — Via API endpoint (no local setup needed):**
```bash
# First add SEED_SECRET to Cloud Run env vars
gcloud run services update esta-feito-api \
  --region=africa-south1 \
  --update-env-vars="SEED_SECRET=your-random-secret-here"

# Then call the endpoint
curl -X POST https://YOUR_API_URL/api/seed \
     -H "x-seed-secret: your-random-secret-here"

# With reset (clears all data first)
curl -X POST "https://YOUR_API_URL/api/seed?reset=true" \
     -H "x-seed-secret: your-random-secret-here"
```

Response:
```json
{
  "success": true,
  "message": "✅ Database seeded successfully!",
  "counts": { "users": 21, "jobs": 18, "reviews": 7, "payments": 7 },
  "testAccounts": {
    "admin":     { "phone": "+258840000001" },
    "customers": ["+258841111001 (Ana)", "+258841111004 (João)"],
    "providers": ["+258842222001 (António)", "+258842222003 (David)"]
  }
}
```

### Dummy data included:
- **1 admin** — full platform access
- **8 customers** — 5 in Tete, 3 in Maputo  
- **12 providers** — all approved, various categories, real ratings
- **18 jobs** — open (7), booked (4), completed (7)
- **7 reviews** — with star ratings and Portuguese comments
- **7 payments** — M-Pesa and eMola, all completed
- All with realistic Mozambican names, coordinates, and MZN amounts

---

## Step 6 — Deploy web to Vercel

```bash
cd apps/web

# Install Vercel CLI
npm i -g vercel

# Deploy (set API URL from Cloud Run output)
NEXT_PUBLIC_API_URL=https://YOUR_API_URL/api vercel --prod
```

Or connect GitHub repo to Vercel and set env var in dashboard.

---

## Step 7 — Build mobile app

```bash
cd apps/mobile

# Install EAS CLI
npm i -g eas-cli

# Login to Expo
eas login

# Configure project
eas init

# Build Android APK (for testing)
eas build --platform android --profile preview

# Build for stores
eas build --platform android --profile production
eas build --platform ios --profile production

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## CI/CD (auto-deploy on git push)

```bash
# Connect GitHub repo to Cloud Build
gcloud builds triggers create github \
  --repo-name=esta-feito \
  --repo-owner=YOUR_GITHUB_USER \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml
```

Every push to `main` will:
1. Build Docker image
2. Push to GCR
3. Deploy new revision to Cloud Run
4. Run health check

---

## Monitoring & Logs

```bash
# Stream logs
gcloud run services logs tail esta-feito-api --region=africa-south1

# View metrics
# https://console.cloud.google.com/run → esta-feito-api → Metrics

# View requests
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | 64-char random string |
| `JWT_REFRESH_SECRET` | ✅ | Different 64-char random string |
| `TWILIO_ACCOUNT_SID` | ✅ | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | ✅ | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | ✅ | Twilio sender number |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret |
| `MPESA_CONSUMER_KEY` | ⚠️ | M-Pesa key (sandbox: use test key) |
| `MPESA_CONSUMER_SECRET` | ⚠️ | M-Pesa secret |
| `MPESA_SHORTCODE` | ⚠️ | M-Pesa shortcode (sandbox: 174379) |
| `MPESA_PASSKEY` | ⚠️ | M-Pesa passkey |
| `MPESA_ENV` | ✅ | `sandbox` or `production` |
| `SEED_SECRET` | 🔧 | Random string to protect /api/seed |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated allowed CORS origins |

---

## Test Login (no real SMS in dev mode)

When `NODE_ENV=development`, OTPs are logged to console instead of sent via SMS:

```
[INFO] [DEV] OTP for +258841111001: 123456
```

In production (Cloud Run), real SMS is sent via Twilio.

To get OTP in production during testing:
```bash
gcloud run services logs tail esta-feito-api --region=africa-south1 | grep OTP
```

---

## Costs (Mozambique MVP scale)

| Service | Usage | Monthly Cost |
|---------|-------|-------------|
| Cloud Run | 100k requests, 512MB | ~$0 (free tier) |
| MongoDB Atlas M0 | 512MB storage | $0 forever |
| Vercel Hobby | Next.js site | $0 |
| Cloudinary Free | 10GB storage | $0 |
| Twilio SMS | 500 OTPs | ~$25 |
| **Total** | | **~$25/month** |
