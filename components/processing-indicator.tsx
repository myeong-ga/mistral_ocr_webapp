"use client"

import { Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useState, useEffect } from "react"

interface ProcessingIndicatorProps {
  stage?: "uploading" | "processing" | "extracting"
}

export function ProcessingIndicator({ stage = "uploading" }: ProcessingIndicatorProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Reset progress when stage changes
    setProgress(0)

    // Simulate progress for better UX
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        // Different progress caps based on stage
        const cap = stage === "uploading" ? 90 : stage === "processing" ? 80 : 90

        // Slow down as we approach the cap
        if (prevProgress >= cap) {
          return prevProgress
        }

        // Different increment speeds based on stage
        const increment =
          stage === "uploading" ? Math.random() * 10 : stage === "processing" ? Math.random() * 3 : Math.random() * 5

        return Math.min(prevProgress + increment, cap)
      })
    }, 500)

    return () => clearInterval(interval)
  }, [stage])

  const stageMessages = {
    uploading: "Uploading PDF to Mistral API...",
    processing: "Processing PDF with OCR model...",
    extracting: "Extracting text and images...",
  }

  const stageDetails = {
    uploading: "Preparing and uploading your document",
    processing: "The OCR model is analyzing your document structure and content",
    extracting: "Extracting text in markdown format and identifying images with coordinates",
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm font-medium">{stageMessages[stage]}</p>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="text-xs text-muted-foreground text-center">
        <p>{stageDetails[stage]}</p>
        <p className="mt-2">This may take a moment depending on the file size and complexity</p>
      </div>
    </div>
  )
}

