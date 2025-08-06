import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('nl-NL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatNumber(num: number | undefined | null): string {
  const safeNum = num || 0
  if (safeNum >= 1000000) {
    return (safeNum / 1000000).toFixed(1) + 'M'
  }
  if (safeNum >= 1000) {
    return (safeNum / 1000).toFixed(1) + 'K'
  }
  return safeNum.toString()
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending_approval':
      return 'bg-yellow-100 text-yellow-800'
    case 'approved':
      return 'bg-blue-100 text-blue-800'
    case 'script_generated':
      return 'bg-purple-100 text-purple-800'
    case 'video_creating':
      return 'bg-orange-100 text-orange-800'
    case 'video_completed':
      return 'bg-indigo-100 text-indigo-800'
    case 'uploading':
      return 'bg-cyan-100 text-cyan-800'
    case 'scheduled':
      return 'bg-green-100 text-green-800'
    case 'published':
      return 'bg-emerald-100 text-emerald-800'
    case 'failed':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case 'pending_approval':
      return 'Wacht op goedkeuring'
    case 'approved':
      return 'Goedgekeurd'
    case 'script_generated':
      return 'Script gegenereerd'
    case 'video_creating':
      return 'Video wordt gemaakt'
    case 'video_completed':
      return 'Video voltooid'
    case 'uploading':
      return 'Uploaden naar YouTube'
    case 'scheduled':
      return 'Ingepland'
    case 'published':
      return 'Gepubliceerd'
    case 'failed':
      return 'Mislukt'
    default:
      return status
  }
}