# Esta Feito 🛠️
**Serviços ao seu alcance — Moçambique (Tete & Maputo)**

A full-stack on-demand home services marketplace for Mozambique, inspired by TaskRabbit.

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Backend    | Node.js + Express + MongoDB + TypeScript |
| Web        | Next.js 15 + Tailwind CSS v4 + TypeScript |
| Mobile     | React Native + Expo + NativeWind + TypeScript |
| Monorepo   | Yarn Workspaces |
| Real-time  | Socket.io |
| Auth       | Twilio OTP (SMS) |
| Payments   | M-Pesa (Daraja) + eMola deep links |
| Storage    | Cloudinary (photos) |
| State      | Zustand |

---

## Monorepo Structure

```
esta-feito/
├── packages/
│   └── shared/               ← Shared TypeScript types, utils, constants
│       ├── types/index.ts    ← All types: User, Job, Payment, etc.
│       ├── utils/index.ts    ← WhatsApp links, M-Pesa/eMola deep links, currency
│       └── constants/        ← Cities, categories, socket events
│
├── apps/
│   ├── backend/              ← Express API + Socket.io
│   │   ├── src/
│   │   │   ├── models/       ← Mongoose: User, Job, Payment
│   │   │   ├── controllers/  ← Auth (OTP flow)
│   │   │   ├── routes/       ← jobs, payments, providers, reviews, chat, admin
│   │   │   ├── services/     ← paymentService, socketService, twilioService
│   │   │   └── middleware/   ← JWT auth, error handler
│   │   └── .env.example
│   │
│   ├── web/                  ← Next.js 15 App Router
│   │   └── app/
│   │       ├── page.tsx              ← Landing page
│   │       ├── auth/page.tsx         ← OTP login/register
│   │       └── dashboard/
│   │           ├── page.tsx          ← Dashboard home + stats
│   │           ├── jobs/new/page.tsx ← Post job (2-step form)
│   │           └── jobs/[id]/page.tsx← Job detail + quotes + payment
│   │
│   └── mobile/               ← React Native + Expo
│       └── app/
│           ├── _layout.tsx           ← Root layout + auth guard + fonts
│           ├── tabs/
│           │   ├── _layout.tsx       ← Bottom tab navigation
│           │   ├── login.tsx         ← OTP auth screen
│           │   └── home.tsx          ← Dashboard home screen
│           └── job/[id].tsx          ← Job detail + payment + WhatsApp
```

---

## Quick Start

### 1. Install dependencies
```bash
yarn install
```

### 2. Set up backend environment
```bash
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your credentials
```

### 3. Start MongoDB
```bash
mongod --dbpath ./data
```

### 4. Run all services
```bash
# Terminal 1 — Backend API
yarn dev:backend

# Terminal 2 — Web app
yarn dev:web

# Terminal 3 — Mobile app
yarn dev:mobile
```

---

## Payment Integration

### M-Pesa (Vodacom Mozambique)
- **Sandbox**: Uses Safaricom Kenya Daraja sandbox — https://sandbox.safaricom.co.ke
- **Production**: Apply via Vodacom MZ partner portal — https://developer.vodacom.co.mz
- STK Push flow: customer receives PIN prompt on phone
- Deep link: `mpesa://pay?amount=X&msisdn=258XX&reference=EF-XXXXXX`

### eMola (Movitel Mozambique)
- **Production API**: Contact Movitel — https://www.movitel.co.mz/emola
- MVP uses deep link: `emola://transfer?to=258XX&amount=X&ref=EF-XXXXXX`
- Replace stub in `paymentService.ts → initiateEmolaPayment()` once API keys received

### WhatsApp Deep Link
- Auto-generated on quote acceptance
- Format: `https://wa.me/258XX?text=<pre-filled message with job details>`
- Works on web (WhatsApp Web) and mobile (WhatsApp app)

---

## Deployment

### Web → Vercel
```bash
cd apps/web
npx vercel --prod
```

### Mobile → Expo EAS
```bash
cd apps/mobile
npx eas build --platform android   # APK for Google Play
npx eas build --platform ios       # IPA for App Store
npx eas submit                     # Submit to stores
```

### Backend → Any Node.js host (Railway, Render, VPS)
```bash
cd apps/backend
yarn build
yarn start
```

---

## Key Features Implemented

- ✅ Phone OTP authentication (Twilio SMS)
- ✅ User roles: Customer, Provider, Admin
- ✅ Job posting with photos (Cloudinary), geolocation, budget in MT
- ✅ Provider quote system + customer acceptance
- ✅ WhatsApp deep link generator (auto-filled with job details)
- ✅ M-Pesa STK Push (Daraja API) + deep links
- ✅ eMola deep links + API stub (ready for Movitel credentials)
- ✅ Real-time chat (Socket.io)
- ✅ Star ratings + reviews
- ✅ Geospatial search (MongoDB 2dsphere)
- ✅ Push notifications (Expo)
- ✅ Admin panel (approve providers, view stats)
- ✅ Matching web + mobile UI (Tailwind / NativeWind)
- ✅ Portuguese UI throughout

---

## Adding Production Payment Keys

In `apps/backend/.env`:
```env
# M-Pesa production (Vodacom MZ)
MPESA_ENV=production
MPESA_CONSUMER_KEY=your_key
MPESA_CONSUMER_SECRET=your_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey

# eMola (Movitel) — after signing merchant agreement
EMOLA_MERCHANT_ID=your_id
EMOLA_API_KEY=your_key
EMOLA_API_URL=https://api.emola.co.mz
```
