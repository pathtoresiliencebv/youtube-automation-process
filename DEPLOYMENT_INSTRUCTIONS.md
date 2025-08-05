# Deployment Instructions - YouTube Automation Process

## 1. GitHub Repository Setup

### Create GitHub Repository
1. Go to [GitHub.com](https://github.com/new)
2. Repository name: `youtube-automation-process`
3. Description: `🤖 Complete YouTube automation system with AI content generation, video creation, and scheduling`
4. Set to Public (or Private if preferred)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Push to GitHub
```bash
# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/youtube-automation-process.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## 2. Vercel Deployment

### Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your `youtube-automation-process` repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install`

### Environment Variables for Vercel

**CRITICAL**: Add these environment variables in Vercel dashboard:

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

# Application URLs (update after deployment)
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
NEXTAUTH_URL=https://your-vercel-app.vercel.app
```

### Steps in Vercel Dashboard:

1. **Project Settings** → **Environment Variables**
2. Add each variable one by one:
   - Name: `CONVEX_DEPLOYMENT`
   - Value: `your-deployment-name`
   - Environment: Production, Preview, Development
   - Click "Add"
3. Repeat for all variables above
4. **Deploy**

## 3. Convex Setup

### Initialize Convex (if not done)
```bash
# In your project directory
npx convex dev
```

### Deploy Convex Functions
```bash
npx convex deploy --prod
```

## 4. Post-Deployment Configuration

### Update OAuth Redirect URIs
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client
4. Add authorized redirect URIs:
   - `https://your-vercel-app.vercel.app/api/auth/callback`
5. Save changes

### Configure RevID Webhook
1. Update RevID webhook URL to:
   - `https://your-vercel-app.vercel.app/api/webhooks/revid`

### Update Environment Variables
After deployment, update these in Vercel:
- `NEXT_PUBLIC_APP_URL=https://your-actual-vercel-url.vercel.app`
- `NEXTAUTH_URL=https://your-actual-vercel-url.vercel.app`

## 5. Testing Deployment

### Verify Functionality
1. Visit your deployed app
2. Test authentication flow
3. Test YouTube connection
4. Verify API endpoints work
5. Check Convex functions deployment

### Monitor Logs
- **Vercel**: Functions tab for API logs
- **Convex**: Dashboard for backend logs
- **Browser**: Console for frontend errors

## 6. Production Checklist

- [ ] GitHub repository created and pushed
- [ ] Vercel deployment successful
- [ ] All environment variables configured
- [ ] Convex functions deployed
- [ ] OAuth redirect URIs updated
- [ ] RevID webhook configured
- [ ] SSL certificate active (automatic with Vercel)
- [ ] Custom domain configured (optional)
- [ ] Performance monitoring setup
- [ ] Error tracking configured

## Troubleshooting

### Common Issues
1. **Build Failures**: Check TypeScript errors and missing dependencies
2. **API Errors**: Verify environment variables are correctly set
3. **OAuth Issues**: Ensure redirect URIs match exactly
4. **Convex Errors**: Check function deployment and database connection

### Support Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Next.js Documentation](https://nextjs.org/docs)

---

## Repository Structure
```
youtube-automation-process/
├── src/                     # Next.js application
├── convex/                  # Convex backend functions
├── masterplan/              # Complete PRD documentation
├── package.json             # Dependencies and scripts
├── README.md                # Project documentation
└── DEPLOYMENT_INSTRUCTIONS.md # This file
```

**Ready for production! 🚀**