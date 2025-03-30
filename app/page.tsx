"use client"

import { useState } from "react"
import { FileUploader } from "@/components/file-uploader"
import { ProcessingIndicator } from "@/components/processing-indicator"
import { ResultsViewer } from "@/components/results-viewer"
import { InfoPanel } from "@/components/info-panel"
import { ErrorDisplay } from "@/components/error-display"
import { SamplePdfOption } from "@/components/sample-pdf-option"
import { Button } from "@/components/ui/button"
import { School } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

// ResultsViewer props와 일치하는 인터페이스 정의
interface ImageData {
  id: string
  url: string
  coordinates: { x: number; y: number; width: number; height: number }
  originalCoordinates: {
    top_left_x: number
    top_left_y: number
    bottom_right_x: number
    bottom_right_y: number
  }
}

interface PageData {
  index: number
  markdown: string
  rawMarkdown: string
  images: ImageData[]
  dimensions: {
    dpi: number
    height: number
    width: number
  }
}

interface ResultsData {
  text: string
  rawText: string
  pages: PageData[]
  images: ImageData[]
  usage?: {
    pages_processed: number
    doc_size_bytes: number
  }
  model?: string
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [isSample, setIsSample] = useState(false)
  const [processingStage, setProcessingStage] = useState<"uploading" | "processing" | "extracting" | null>(null)
  const [results, setResults] = useState<ResultsData | null>(null)
  const [error, setError] = useState<{ message: string; details?: string } | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  const handleFileSelected = (selectedFile: File, fileIsSample = false) => {
    setFile(selectedFile)
    setIsSample(fileIsSample)
    setResults(null)
    setError(null)
  }

  const handleProcessFile = async () => {
    if (!file) return

    setError(null)
    setProcessingStage("uploading")

    const formData = new FormData()
    formData.append("pdf", file)
    formData.append("isSample", isSample.toString())

    try {
      // 업로드 단계 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setProcessingStage("processing")

      // 처리 단계 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setProcessingStage("extracting")

      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to process PDF")
      }

      setResults(data)
    } catch (error) {
      console.error("Error processing PDF:", error)

      // 더 자세한 오류 정보 추출
      let errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      let errorDetails = error instanceof Error ? error.stack : undefined

      // 오류가 API에서 발생했고 세부 정보가 있는 경우
      if (error instanceof Error && error.message.includes("Failed to process PDF")) {
        try {
          // 수정: 정규식에서 줄바꿈 문제 해결
          const errorStack = error.stack || ""
          const bodyMatch = errorStack.match(/body: (.+?)(?:\n|$)/)

          if (bodyMatch && bodyMatch[1]) {
            const errorBody = JSON.parse(bodyMatch[1])
            errorMessage = errorBody.message || errorBody.error || errorMessage
            errorDetails = errorBody.details || errorBody.stack || JSON.stringify(errorBody)
          }
        } catch (e) {
          console.error("Failed to parse error details:", e)
        }
      }

      setError({
        message: errorMessage,
        details: errorDetails,
      })
    } finally {
      setProcessingStage(null)
    }
  }

  const toggleInfoPanel = () => {
    setShowInfo(!showInfo)
  }

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes"

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Mistral OCR PDF Parser</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleInfoPanel}
              aria-label="Show information"
              className={showInfo ? "bg-accent" : ""}
            >
              <School className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {showInfo && <InfoPanel onClose={toggleInfoPanel} />}

        <div className="grid grid-cols-1 lg:grid-cols-9 gap-8">
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Upload PDF</h2>
              <FileUploader onFileSelected={(file) => handleFileSelected(file, false)} />

              <SamplePdfOption onSelect={handleFileSelected} />

              {file && !processingStage && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Selected file: {file.name}
                    {isSample && " (Sample)"}
                  </p>
                  <Button onClick={handleProcessFile} className="w-full">
                    Process PDF
                  </Button>
                </div>
              )}

              {results && results.usage && (
                <div className="mt-4 bg-muted/30 p-3 rounded-md text-xs text-muted-foreground">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Model:</span>
                      <span>{results.model || "mistral-ocr-latest"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pages processed:</span>
                      <span>{results.usage.pages_processed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Document size:</span>
                      <span>{formatBytes(results.usage.doc_size_bytes)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {processingStage && (
              <div className="bg-card rounded-lg p-6 shadow-sm">
                <ProcessingIndicator stage={processingStage} />
              </div>
            )}

            {error && (
              <div className="bg-card rounded-lg p-6 shadow-sm">
                <ErrorDisplay message={error.message} details={error.details} onRetry={handleProcessFile} />
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg p-6 shadow-sm lg:col-span-7">
            {results ? (
              <ResultsViewer results={results} originalFile={file} />
            ) : (
              <div>
                <h2 className="text-xl font-semibold mb-4">Results</h2>
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <p className="text-muted-foreground">Upload and process a PDF to see the parsed results</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

