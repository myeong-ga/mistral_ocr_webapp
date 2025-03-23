"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { FileIcon as FilePdf } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploaderProps {
  onFileSelected: (file: File) => void
}

export function FileUploader({ onFileSelected }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        if (file.type === "application/pdf") {
          onFileSelected(file)
        }
      }
    },
    [onFileSelected],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        isDragging || isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/50",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2">
        <FilePdf className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">Drag & drop a PDF file here, or click to select</p>
        <p className="text-xs text-muted-foreground">Only PDF files are supported</p>
      </div>
    </div>
  )
}

