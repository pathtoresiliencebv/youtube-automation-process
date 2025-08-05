# YouTube OAuth Setup Guide

## 1. Google Cloud Console Setup

### Create OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client IDs**
5. Choose **Web application**
6. Set **Authorized JavaScript origins**:
   ```
   https://youtube-automation-ijrmzz15h-jasons-projects-3108a48b.vercel.app
   ```
7. Set **Authorized redirect URIs**:
   ```
   https://youtube-automation-ijrmzz15h-jasons-projects-3108a48b.vercel.app/auth/callback
   ```

### Enable Required APIs
Go to **APIs & Services** → **Library** and enable:
- ✅ YouTube Data API v3
- ✅ YouTube Analytics API  
- ✅ YouTube Reporting API

## 2. Vercel Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables for **Production**, **Preview**, and **Development**:

```env
NEXT_PUBLIC_YOUTUBE_CLIENT_ID=your-google-oauth-client-id
YOUTUBE_CLIENT_SECRET=your-google-oauth-client-secret
NEXT_PUBLIC_APP_URL=https://youtube-automation-ijrmzz15h-jasons-projects-3108a48b.vercel.app
```

### Additional Required Variables
```env
GEMINI_API_KEY=your-gemini-api-key
REVID_API_KEY=your-revid-api-key
NEXT_PUBLIC_CONVEX_URL=https://wonderful-hare-319.convex.site
DATABASE_URL=your-neon-database-url
CRON_SECRET=generate-random-secret-for-cron-jobs
```

## 3. Test the Setup

1. Deploy the changes to Vercel
2. Visit your app URL
3. Click "Inloggen met Google"
4. Should redirect to Google OAuth
5. After authorization, should redirect back to dashboard

## 4. Troubleshooting

### Common Issues:
- **"OAuth configuratie ontbreekt"**: Environment variables not set in Vercel
- **"redirect_uri_mismatch"**: Redirect URI not added to Google Cloud Console
- **"access_denied"**: User cancelled OAuth or insufficient permissions
- **"invalid_client"**: Wrong Client ID or Client Secret

### Debug Steps:
1. Check Vercel Function logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure redirect URI matches exactly (with https://)
4. Confirm APIs are enabled in Google Cloud Console

## 5. Security Notes

- Never commit Client Secret to version control
- Use environment variables for all sensitive data
- Regularly rotate OAuth credentials
- Monitor API usage in Google Cloud Console

---

**Current App URL**: https://youtube-automation-ijrmzz15h-jasons-projects-3108a48b.vercel.app
**Callback URL**: https://youtube-automation-ijrmzz15h-jasons-projects-3108a48b.vercel.app/auth/callback