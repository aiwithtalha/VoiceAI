# Railway Deployment Guide - Voice AI Platform

## Prerequisites

1. GitHub repository with your code pushed
2. Railway account connected to GitHub
3. API keys for: Twilio, Deepgram, ElevenLabs, OpenAI, Stripe

---

## Step 1: Create New Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your **voice-ai-platform** repository
5. Railway will auto-detect services

---

## Step 2: Deploy API Service

### 2.1 Add API Service
1. In your project, click **"New"**
2. Select **"GitHub Repo"**
3. Choose your repository
4. Configure:
   - **Service Name**: `api`
   - **Root Directory**: `apps/api`
   - **Start Command**: `npx prisma migrate deploy && npm start`

### 2.2 Add Environment Variables

Go to the API service → **Variables** tab → Add these:

```
# Database (will be auto-populated after adding PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (will be auto-populated after adding Redis)
REDIS_URL=${{Redis.REDIS_URL}}

# Secrets (generate at https://generate-secret.vercel.app/32)
JWT_SECRET=your-random-32-character-secret
NEXTAUTH_SECRET=your-random-32-character-secret

# Twilio (from https://www.twilio.com/console)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Deepgram (from https://console.deepgram.com)
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ElevenLabs (from https://elevenlabs.io/subscription)
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI (from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe (from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# App URLs (update after deployment)
APP_URL=https://your-web-service.up.railway.app
API_URL=https://your-api-service.up.railway.app
VOICE_ENGINE_URL=https://your-voice-engine.up.railway.app
```

---

## Step 3: Add PostgreSQL Database

1. Click **"New"** in your project
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway creates it automatically
4. The `DATABASE_URL` variable will be automatically available to your API service

---

## Step 4: Add Redis Cache

1. Click **"New"** in your project
2. Select **"Database"** → **"Add Redis"**
3. Railway creates it automatically
4. The `REDIS_URL` variable will be automatically available

---

## Step 5: Deploy Voice Engine Service

### 5.1 Add Voice Engine Service
1. Click **"New"**
2. Select **"GitHub Repo"**
3. Configure:
   - **Service Name**: `voice-engine`
   - **Root Directory**: `apps/voice-engine`
   - **Start Command**: `npm start`

### 5.2 Add Environment Variables

```
# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis
REDIS_URL=${{Redis.REDIS_URL}}

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AI Providers
DEEPGRAM_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# API URL
API_URL=https://your-api-service.up.railway.app
```

---

## Step 6: Deploy Web Frontend

### 6.1 Add Web Service
1. Click **"New"**
2. Select **"GitHub Repo"**
3. Configure:
   - **Service Name**: `web`
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`

### 6.2 Add Environment Variables

```
NEXT_PUBLIC_API_URL=https://your-api-service.up.railway.app
NEXT_PUBLIC_VOICE_ENGINE_URL=https://your-voice-engine.up.railway.app
```

---

## Step 7: Deploy All Services

1. Go to each service
2. Click **"Deploy"**
3. Wait for deployment to complete
4. Check logs for any errors

---

## Step 8: Update Environment Variables

After all services are deployed, update the URLs:

1. Go to **API service** → **Variables**
2. Update:
   - `APP_URL` = your web service URL
   - `API_URL` = your API service URL
   - `VOICE_ENGINE_URL` = your voice-engine service URL

3. Redeploy the API service

---

## Step 9: Run Database Migrations

1. Go to **API service**
2. Click **"Deploy"** tab
3. Click the **three dots** (⋯) → **"Shell"**
4. Run:
```bash
npx prisma migrate deploy
npx prisma db seed
```

---

## Step 10: Configure Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter your API URL: `https://your-api.up.railway.app/v1/billing/webhook`
4. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret**
6. Add to Railway API variables as `STRIPE_WEBHOOK_SECRET`

---

## Step 11: Configure Twilio Webhook

1. Go to https://www.twilio.com/console/phone-numbers/incoming
2. Click on your phone number
3. Set **Webhook** for incoming calls:
   - `https://your-api.up.railway.app/v1/webhooks/twilio/voice`
4. Set **Webhook** for status callbacks:
   - `https://your-api.up.railway.app/v1/webhooks/twilio/status`

---

## Testing Your Deployment

### Health Check
```bash
curl https://your-api.up.railway.app/health
```

### Create Assistant
```bash
curl -X POST https://your-api.up.railway.app/v1/assistants \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Assistant","goal":"support"}'
```

### Check Wallet
```bash
curl https://your-api.up.railway.app/v1/billing/wallet
```

---

## Troubleshooting

### Service Won't Start
- Check logs in Railway dashboard
- Verify all environment variables are set
- Ensure DATABASE_URL and REDIS_URL are correct

### Database Connection Failed
- Verify PostgreSQL service is running
- Check DATABASE_URL format

### Calls Not Working
- Verify Twilio credentials
- Check webhook URLs are configured in Twilio
- Ensure voice-engine service is running

---

## Your Live URLs

After deployment, you'll have:

| Service | URL |
|---------|-----|
| Frontend | `https://web-production-XXXX.up.railway.app` |
| API | `https://api-production-XXXX.up.railway.app` |
| Voice Engine | `https://voice-engine-production-XXXX.up.railway.app` |

---

## Next Steps

1. Open your **frontend URL**
2. Sign up for an account
3. Add credits (Stripe test card: `4242 4242 4242 4242`)
4. Create an assistant
5. Buy a phone number on Twilio
6. **Make a real phone call!**
