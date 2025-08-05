'use client'

import { ReactNode } from 'react'

// Mock ConvexProvider for build
const MockConvexProvider = ({ children }: { children: ReactNode }) => {
  return <div>{children}</div>
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <MockConvexProvider>{children}</MockConvexProvider>
}