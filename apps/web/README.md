# VoiceAI Platform - Frontend

A comprehensive Next.js 14+ frontend for the Universal Voice AI Platform, featuring both a public website and a feature-rich dashboard.

## 🚀 Features

### Public Website
- **Landing Page**: Hero section, use cases, features, how it works, testimonials, FAQ
- **Pricing**: Pay-as-you-go and enterprise pricing tiers
- **Documentation**: Quick start guides, API reference
- **Demo Call**: Interactive demo with phone verification (OTP flow)
- **Legal Pages**: Terms of Service, Privacy Policy, Acceptable Use Policy

### Dashboard
- **Overview**: Real-time stats, recent calls, quick actions
- **Assistants**: Create, edit, version, publish, and test AI voice agents
- **Phone Numbers**: Buy, import, assign, and manage phone numbers
- **Voice Library**: Browse and preview voices from multiple providers
- **Providers**: Configure telephony, STT, LLM, and TTS providers
- **Tools**: Predefined and custom tool builder
- **Integrations**: OAuth connections with CRMs and other services
- **Call Logs**: Recordings, transcripts, summaries, costs
- **API Keys**: Create, revoke, and manage API key scopes
- **Billing**: Wallet, top-ups, transactions, invoices
- **Team**: RBAC, invites, member management
- **Settings**: Compliance, webhooks, notifications

### Composer (Chat-to-Agent Builder)
- Conversational flow for building agents
- Template selection
- Provider/model/voice selection
- Real-time AgentSpec preview
- Test call functionality

## 🛠 Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📁 Project Structure

```
app/
├── (public)/              # Public website routes
│   ├── page.tsx           # Landing page
│   ├── pricing/page.tsx
│   ├── docs/page.tsx
│   ├── demo/page.tsx      # Demo call with OTP
│   ├── terms/page.tsx
│   ├── privacy/page.tsx
│   └── acceptable-use/page.tsx
├── (dashboard)/           # Dashboard routes (protected)
│   ├── layout.tsx         # Dashboard layout with sidebar
│   ├── page.tsx           # Overview
│   ├── assistants/
│   │   ├── page.tsx       # List assistants
│   │   ├── new/page.tsx   # Create assistant
│   │   └── [id]/page.tsx  # Edit/view assistant
│   ├── phone-numbers/page.tsx
│   ├── voice-library/page.tsx
│   ├── providers/page.tsx
│   ├── tools/page.tsx
│   ├── integrations/page.tsx
│   ├── calls/
│   │   ├── page.tsx       # Call logs list
│   │   └── [id]/page.tsx  # Call detail
│   ├── api-keys/page.tsx
│   ├── billing/page.tsx
│   ├── team/page.tsx
│   └── settings/page.tsx
├── layout.tsx             # Root layout
└── globals.css            # Global styles

components/
├── ui/                    # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Dialog.tsx
│   ├── Tabs.tsx
│   └── ...
├── layout/                # Layout components
│   ├── DashboardLayout.tsx
│   ├── Sidebar.tsx
│   └── Header.tsx
├── public/                # Public website components
│   ├── PublicHeader.tsx
│   └── PublicFooter.tsx
├── composer/              # Chat-to-agent builder
│   └── Composer.tsx
└── providers/
    └── QueryClientProvider.tsx

hooks/
├── useAuth.ts
├── useAssistants.ts
├── useCalls.ts
├── useBilling.ts
└── usePhoneNumbers.ts

stores/
├── authStore.ts
└── workspaceStore.ts

utils/
├── cn.ts                  # Tailwind class merging
├── api.ts                 # API client
└── format.ts              # Formatting utilities

types/
└── index.ts               # TypeScript types
```

## 🚀 Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open** [http://localhost:3000](http://localhost:3000)

## 📝 Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🎨 Design System

### Colors
- Primary: Indigo (#6366f1)
- Success: Emerald (#10b981)
- Warning: Amber (#f59e0b)
- Error: Rose (#f43f5e)
- Slate: Grayscale palette

### Typography
- Font: Inter (sans-serif)
- Mono: JetBrains Mono

### Components
All UI components follow a consistent design pattern with:
- Proper focus states
- Hover effects
- Loading states
- Error handling
- Accessibility support

## 🔐 Authentication

The app uses JWT-based authentication:
- Token stored in localStorage
- Automatic token refresh
- Protected routes with middleware
- Role-based access control (RBAC)

## 📊 State Management

### Zustand Stores
- **authStore**: User authentication state
- **workspaceStore**: Workspace data and UI state

### TanStack Query
- Server state management
- Caching and invalidation
- Optimistic updates

## 🔌 API Integration

The `api.ts` utility provides:
- Axios instance with interceptors
- Automatic token injection
- Error handling
- Type-safe requests

## 📱 Responsive Design

The app is fully responsive with breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## 🧪 Testing

Run tests with:
```bash
npm test
```

## 📦 Building

Build for production:
```bash
npm run build
```

## 🚢 Deployment

The app can be deployed to:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Any static hosting

## 📄 License

MIT License - see LICENSE file for details
