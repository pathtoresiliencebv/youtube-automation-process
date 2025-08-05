# Vercel Deployment Setup

## Quick Deploy via GitHub

1. **Import Project on Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select "Import Git Repository"
   - Choose: `pathtoresiliencebv/youtube-automation-process`

2. **Configure Project Settings**
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install`

3. **Environment Variables** 
   Add these in Vercel Dashboard → Settings → Environment Variables:

   ```env
   # Convex Configuration
   CONVEX_DEPLOYMENT=your-deployment-name
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment-name.convex.cloud

   # Database
   DATABASE_URL=postgresql://neondb_owner:your-password@ep-billowing-meadow-aeydp78q-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

   # YouTube API
   YOUTUBE_CLIENT_ID=your-actual-youtube-client-id
   YOUTUBE_CLIENT_SECRET=your-actual-youtube-client-secret

   # Google AI (Gemini)
   GEMINI_API_KEY=your-actual-gemini-api-key

   # RevID API
   REVID_API_KEY=your-actual-revid-api-key

   # App Configuration
   NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
   NEXTAUTH_URL=https://your-vercel-app.vercel.app
   NEXTAUTH_SECRET=your-generated-nextauth-secret
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build completion
   - Get your app URL (e.g., `https://youtube-automation-process.vercel.app`)

## Post-Deployment Setup

1. **Update App URLs**
   - Update `NEXT_PUBLIC_APP_URL` and `NEXTAUTH_URL` with actual Vercel URL
   - Redeploy to apply changes

2. **Configure OAuth Redirect URIs**
   - Google Cloud Console → APIs & Services → Credentials
   - Add: `https://your-vercel-app.vercel.app/api/auth/callback`

3. **Set up Convex Production**
   - Run: `npx convex deploy --prod`
   - Update `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`

4. **Configure RevID Webhook**
   - RevID Dashboard → Webhooks
   - Add: `https://your-vercel-app.vercel.app/api/webhooks/revid`

## Repository URL
**GitHub**: https://github.com/pathtoresiliencebv/youtube-automation-process

## Environment Variables Template
Copy from `.env.example` and fill with actual values.

## Support
- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment