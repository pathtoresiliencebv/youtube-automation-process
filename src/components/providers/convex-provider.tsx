'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ReactNode } from 'react'

// Create Convex client only if URL is properly configured
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl && convexUrl !== 'https://your-deployment.convex.site' 
  ? new ConvexReactClient(convexUrl, {
      skipConvexDeploymentUrlCheck: true
    })
  : null

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    // Fallback: render children without Convex provider if not configured
    console.warn('Convex not configured, running in offline mode')
    return <>{children}</>
  }
  
  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}