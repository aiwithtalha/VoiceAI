# Voice AI Platform - Deployment Guide

## Quick Deploy Options

### Option 1: Railway (Easiest - Free Tier)

Railway offers free hosting for small projects with automatic deployments from GitHub.

**Steps:**

1. **Fork/Upload the code to GitHub**
   - Create a new GitHub repository
   - Upload the `voice-ai-platform` folder

2. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

3. **Deploy the API Service**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Set root directory to `apps/api`
   - Add environment variables (see below)

4. **Deploy the Voice Engine**
   - Add another service
   - Same repo, root directory `apps/voice-engine`
   - Add environment variables

5. **Add PostgreSQL**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway provides the connection string automatically

6. **Add Redis**
   - Click "New" → "Database" → "Add Redis"

---

### Option 2: Render (Free Tier)

Render offers free web services and databases.

**Steps:**

1. **Create Render Account**
   - Go to https://render.com
   - Sign up with GitHub

2. **Create Web Service for API**
   - Click "New Web Service"
   - Connect your GitHub repo
   - Set:
     - Name: `voiceai-api`
     - Root Directory: `apps/api`
     - Build Command: `npm install`
     - Start Command: `npm start`
   - Add environment variables

3. **Create Web Service for Voice Engine**
   - Same process, root directory: `apps/voice-engine`
   - Name: `voiceai-engine`

4. **Create PostgreSQL Database**
   - Click "New PostgreSQL"
   - Copy the connection string

---

### Option 3: Docker Compose (Your Own Server)

If you have a VPS or want to run locally:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd voice-ai-platform

# 2. Create environment file
cp .env.example .env

# 3. Edit .env with your API keys (see below)
nano .env

# 4. Start all services
docker-compose up -d

# 5. Run database migrations
docker-compose exec api npx prisma migrate dev

# 6. Seed the database
docker-compose exec api npx prisma db seed
```

---

## Required Environment Variables

Create a `.env` file with these variables:

```env
# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://username:password@host:5432/voiceai"

# ============================================
# REDIS
# ============================================
REDIS_URL="redis://localhost:6379"

# ============================================
# AUTHENTICATION
# ============================================
JWT_SECRET="your-super-secret-jwt-key-min-32-characters"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# ============================================
# TWILIO (Telephony)
# Get from: https://www.twilio.com/console
# ============================================
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_API_KEY="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_API_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ============================================
# DEEPGRAM (Speech-to-Text)
# Get from: https://console.deepgram.com
# ============================================
DEEPGRAM_API_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ============================================
# ELEVENLABS (Text-to-Speech)
# Get from: https://elevenlabs.io/subscription
# ============================================
ELEVENLABS_API_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ============================================
# OPENAI (LLM)
# Get from: https://platform.openai.com/api-keys
# ============================================
OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ============================================
# ANTHROPIC (Optional - Alternative LLM)
# Get from: https://console.anthropic.com
# ============================================
ANTHROPIC_API_KEY="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ============================================
# STRIPE (Billing)
# Get from: https://dashboard.stripe.com/apikeys
# ============================================
STRIPE_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
STRIPE_PRICE_ID="price_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ============================================
# OAUTH (Optional - for Google/LinkedIn login)
# Get from: https://console.cloud.google.com
# ============================================
GOOGLE_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
LINKEDIN_CLIENT_ID="xxxxxxxxxxxxxxxx"
LINKEDIN_CLIENT_SECRET="xxxxxxxxxxxxxxxx"

# ============================================
# APP URLs
# ============================================
APP_URL="https://your-frontend-url.com"
API_URL="https://your-api-url.com"
VOICE_ENGINE_URL="https://your-voice-engine-url.com"
```

---

## Getting API Keys

### 1. Twilio (Required for Phone Calls)

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free account (get $15.50 credit)
3. Verify your phone number
4. Get your Account SID and Auth Token from the console
5. Create an API Key: Settings → API Keys → Create API Key

### 2. Deepgram (Required for Speech-to-Text)

1. Go to https://console.deepgram.com/signup
2. Sign up for free (get $200 credit)
3. Create a new project
4. Copy your API Key

### 3. ElevenLabs (Required for Text-to-Speech)

1. Go to https://elevenlabs.io
2. Sign up for free tier
3. Go to your Profile → API Keys
4. Copy your API Key

### 4. OpenAI (Required for AI Responses)

1. Go to https://platform.openai.com/signup
2. Sign up and add payment method
3. Go to API Keys → Create new secret key
4. Copy your API Key

### 5. Stripe (Required for Billing)

1. Go to https://dashboard.stripe.com/register
2. Create an account
3. Get your API keys from Developers → API Keys
4. Create a product and price in Products
5. Copy the Price ID

---

## Estimated Costs

### Development/Testing (Free Tier)

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Twilio | $15.50 credit | Good for testing |
| Deepgram | $200 credit | Very generous |
| ElevenLabs | 10k chars/month | Enough for testing |
| OpenAI | Pay as you go | ~$0.002 per call |
| Railway/Render | $5 credit/month | Free tier available |

### Production (Estimated Monthly)

| Usage | Estimated Cost |
|-------|----------------|
| 1,000 calls/month (~50 hours) | ~$150-200 |
| 5,000 calls/month (~250 hours) | ~$750-1,000 |
| 10,000 calls/month (~500 hours) | ~$1,500-2,000 |

---

## Testing Your Deployment

Once deployed, test these endpoints:

```bash
# Health check
curl https://your-api-url.com/health

# Create an assistant
curl -X POST https://your-api-url.com/v1/assistants \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Assistant","goal":"support"}'

# Check wallet balance
curl https://your-api-url.com/v1/billing/wallet
```

---

## Troubleshooting

### Issue: Database connection failed
- Check DATABASE_URL format
- Ensure database is running
- Verify network access

### Issue: Calls not working
- Verify Twilio credentials
- Check webhook URL is configured in Twilio
- Ensure voice engine is running

### Issue: AI not responding
- Verify OpenAI API key
- Check API key has credits
- Review API logs

---

## Next Steps

1. Choose your deployment option
2. Get your API keys
3. Deploy the backend
4. Connect the frontend
5. Start making real calls!

Need help? The full codebase is ready - just add your keys and deploy!
