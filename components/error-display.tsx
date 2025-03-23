"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ErrorDisplayProps {
  message: string
  details?: string
  onRetry?: () => void
}

export function ErrorDisplay({ message, details, onRetry }: ErrorDisplayProps) {
  // Try to parse JSON details if they exist
  let parsedDetails = details
  try {
    if (details && details.startsWith("{")) {
      const parsed = JSON.parse(details)
      parsedDetails = JSON.stringify(parsed, null, 2)
    }
  } catch (e) {
    // If parsing fails, use the original details
    console.error("Failed to parse error details:", e)
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {parsedDetails && (
          <details className="mt-2 text-xs">
            <summary>Technical details</summary>
            <pre className="mt-1 whitespace-pre-wrap overflow-auto max-h-40 p-2 bg-background/50 rounded">
              {parsedDetails}
            </pre>
          </details>
        )}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

