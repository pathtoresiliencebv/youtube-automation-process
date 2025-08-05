# Content Catalyst Engine

Een geavanceerd YouTube automatiseringssysteem dat gebruik maakt van AI om inspirerende content te genereren, video's te maken en automatisch te uploaden naar YouTube.

## 🚀 Features

- **AI Content Generatie**: Gebruik Gemini 2.5 Pro om video titels en scripts te genereren
- **Video Analyse**: Analyseer je top presterende YouTube video's van de afgelopen 30 dagen
- **Automatische Video Creatie**: RevID API integratie voor PIXAR-style video generatie
- **YouTube Integratie**: Automatisch uploaden en inplannen van video's
- **Real-time Dashboard**: Live tracking van je content productie pipeline
- **SEO Optimalisatie**: Automatisch gegenereerde titels, beschrijvingen en tags

## 🛠 Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Convex (real-time database & serverless functions)  
- **Database**: Neon PostgreSQL
- **AI**: Google Gemini 2.5 Pro
- **Video**: RevID API
- **APIs**: YouTube Data API v3, YouTube Analytics API

## 📦 Installatie

1. **Clone het project**
   ```bash
   git clone <repository-url>
   cd content-catalyst-engine
   ```

2. **Installeer dependencies**
   ```bash
   npm install
   ```

3. **Configureer environment variabelen**
   
   Kopieer `.env.local.example` naar `.env.local` en vul de volgende variabelen in:
   
   ```env
   # Convex
   CONVEX_DEPLOYMENT=your-deployment-name
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud

   # Neon Database  
   DATABASE_URL=postgresql://neondb_owner:npg_ThNue72ifvPW@ep-billowing-meadow-aeydp78q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

   # YouTube API  
   YOUTUBE_CLIENT_ID=your-actual-youtube-client-id
   YOUTUBE_CLIENT_SECRET=your-actual-youtube-client-secret

   # Google AI (Gemini)
   GEMINI_API_KEY=your-gemini-api-key

   # RevID API
   REVID_API_KEY=your-revid-api-key
   ```

4. **Start Convex development server**
   ```bash
   npx convex dev
   ```

5. **Start de applicatie**
   ```bash
   npm run dev
   ```

## 🔧 Development

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── youtube/       # YouTube API endpoints  
│   │   ├── gemini/        # Gemini AI endpoints
│   │   └── webhooks/      # Webhook handlers
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard widgets
│   ├── providers/        # Context providers
│   └── ui/               # Reusable UI components
└── lib/                  # Utility functions
    ├── utils.ts          # General utilities
    └── revid.ts          # RevID API client

convex/                   # Convex backend
├── schema.ts            # Database schema
├── users.ts             # User management
├── content.ts           # Content generation
├── youtube.ts           # YouTube integration
├── revid.ts             # RevID integration
└── systemLogs.ts        # System logging
```

### Workflow Overview

1. **Analyse**: Het systeem haalt je top 10 YouTube video's van de afgelopen 30 dagen op
2. **Genereren**: Gemini AI genereert nieuwe video titels gebaseerd op succesvolle patronen
3. **Goedkeuren**: Je keurt handmatig titels goed via het dashboard
4. **Script**: Automatisch gegenereerde 2-minuten scripts voor goedgekeurde titels
5. **Video**: RevID maakt PIXAR-style video's van de scripts
6. **SEO**: Automatisch gegenereerde geoptimaliseerde titels, beschrijvingen en tags
7. **Upload**: Automatisch uploaden en inplannen op YouTube (dagelijks om 00:00)

## 🔐 API Configuratie

### YouTube API Setup

1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)
2. Maak een nieuw project of selecteer bestaande
3. Activeer YouTube Data API v3 en YouTube Analytics API  
4. Maak OAuth 2.0 credentials
5. Voeg je domain toe aan geautoriseerde origins

### RevID API Setup

1. Registreer op [RevID](https://revid.ai)
2. Verkrijg je API key
3. Configureer webhook URL: `https://jouw-domain.com/api/webhooks/revid`

### Gemini API Setup

1. Ga naar [Google AI Studio](https://makersuite.google.com/)
2. Genereer een API key
3. Zorg dat je toegang hebt tot Gemini 1.5 Pro model

## 📊 Dashboard Features

### 1. Nieuwe Ideeën Widget
- Toont AI-gegenereerde video titels
- Handmatige goedkeuring/afwijzing
- Gebaseerd op analyse van succesvolle content

### 2. Productie Pijplijn Widget  
- Real-time tracking van video productie
- Status indicatoren en voortgangsbalk
- Error handling en retry mechanismen

### 3. Publicatiekalender Widget
- Overzicht van ingeplande video's
- Kalender view voor komende publicaties
- Direct links naar YouTube video's

### 4. Analytics Widget
- Performance metrics en grafieken
- Top presterende video's
- Engagement en viewership data

## 🚀 Deployment

### Vercel Deployment

1. **Deploy naar Vercel**
   ```bash
   npx vercel --prod
   ```

2. **Configureer environment variables in Vercel dashboard**

3. **Deploy Convex functions**
   ```bash
   npx convex deploy --prod
   ```

### Environment Setup

Zorg ervoor dat alle API keys en secrets correct zijn geconfigureerd in je productie environment.

## 🔍 Monitoring & Debugging

- **System Logs**: Alle acties worden gelogd in de database
- **Error Handling**: Automatische retry logic voor failed jobs
- **Webhook Monitoring**: Status tracking via RevID webhooks
- **Real-time Updates**: Live dashboard updates via Convex

## 📝 Scripts Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build production bundle
npm run start        # Start production server

# Linting & Type Checking
npm run lint         # ESLint check
npm run type-check   # TypeScript check

# Convex
npx convex dev       # Start Convex development
npx convex deploy    # Deploy Convex functions
```

## 🤝 Contributing

1. Fork het project
2. Maak een feature branch (`git checkout -b feature/nieuwe-feature`)
3. Commit je changes (`git commit -am 'Voeg nieuwe feature toe'`)
4. Push naar de branch (`git push origin feature/nieuwe-feature`)
5. Maak een Pull Request

## 📄 License

Dit project is gelicenseerd onder de MIT License - zie het [LICENSE](LICENSE) bestand voor details.

## 🆘 Support

Voor vragen of ondersteuning, open een issue op GitHub of neem contact op via:

- **Email**: [support@contentcatalyst.nl](mailto:support@contentcatalyst.nl)
- **Documentation**: [docs.contentcatalyst.nl](https://docs.contentcatalyst.nl)
- **Discord**: [Content Catalyst Community](https://discord.gg/contentcatalyst)

---

**Content Catalyst Engine** - Transformeer je YouTube strategie met AI-gedreven automatisering. 🚀✨