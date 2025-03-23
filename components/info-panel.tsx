"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface InfoPanelProps {
  onClose: () => void
}

export function InfoPanel({ onClose }: InfoPanelProps) {
  return (
    <Card className="mb-8 relative">
      <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
      <CardHeader>
        <CardTitle>About Mistral OCR PDF Parser</CardTitle>
        <CardDescription>Learn how to use this tool and understand the technology behind it</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="about">
          <TabsList className="mb-4">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="api">API Usage</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="about">
            <div className="space-y-4">
              <p>
                This application demonstrates the capabilities of Mistral AI's OCR model for parsing PDF documents. The
                tool extracts text in markdown format and identifies images with their positional coordinates.
              </p>
              <h3 className="text-lg font-medium">How it works:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Upload a PDF document using the file uploader</li>
                <li>The document is sent to Mistral's OCR API for processing</li>
                <li>The API extracts text content and identifies images with their positions</li>
                <li>Results are displayed in various formats for analysis</li>
              </ol>
              <p>
                This tool is particularly useful for developers working on LLM and RAG (Retrieval Augmented Generation)
                applications who need to extract structured content from PDF documents.
              </p>
              <div className="mt-4 p-3 border border-primary bg-primary/10 dark:bg-primary/5 rounded-md">
                <p className="text-sm flex items-start">
                  <strong className="mr-1">Note:</strong>
                  <span>
                    In the reconstructed view, images may appear to be rendered twice - once within the markdown text
                    flow and once with absolute positioning (indicated by dashed borders). This dual rendering allows
                    you to see both the content in a readable format and the precise original locations of images in the
                    source PDF.
                  </span>
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="api">
            <div className="space-y-4">
              <p>
                This application uses the Mistral API to process PDF documents and OpenAI API for chat functionality.
                Here's how you can integrate it into your own applications:
              </p>
              <h4 className="text-md font-medium mt-4">OCR Processing:</h4>
              <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                {`// Step 1: Upload the file
const formData = new FormData();
formData.append("file", pdfFile);
formData.append("purpose", "ocr");

const uploadResponse = await fetch("https://api.mistral.ai/v1/files", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${apiKey}\`
  },
  body: formData
});

const uploadData = await uploadResponse.json();
const fileId = uploadData.id;

// Step 2: Get a signed URL
const signedUrlResponse = await fetch(
  \`https://api.mistral.ai/v1/files/\${fileId}/signed-url\`, {
    method: "GET",
    headers: {
      "Authorization": \`Bearer \${apiKey}\`
    }
  }
);

const signedUrlData = await signedUrlResponse.json();
const signedUrl = signedUrlData.url;

// Step 3: Process the PDF with OCR
const ocrResponse = await fetch("https://api.mistral.ai/v1/ocr/process", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${apiKey}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "mistral-ocr-latest",
    document: {
      type: "document_url",
      documentUrl: signedUrl,
      documentName: pdfFile.name
    },
    includeImageBase64: true
  })
});

const ocrData = await ocrResponse.json();
console.log(ocrData);`}
              </pre>

              <h4 className="text-md font-medium mt-6">Chat with Document:</h4>
              <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                {`// Using AI SDK with OpenAI
import { openai } from "@ai-sdk/openai"
import { createDataStreamResponse, streamText, tool } from "ai"
import { z } from "zod"

export async function POST(req: Request) {
  const { messages, documentContent } = await req.json()
  
  // Create system message with document content
  const systemMessage = documentContent
    ? \`You are a helpful assistant that answers questions about the following document content. 
       Use this content to provide accurate answers:
       
       \${documentContent}
       
       Ensure that the 'ExtractSubject' tool is used for the user's first message.\`
    : "You are a helpful assistant."

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const result = streamText({
        model: openai("gpt-4o-mini", { structuredOutputs: true }),
        system: systemMessage,
        messages,
        toolCallStreaming: true,
        tools: {
          ExtractSubject: tool({
            description: "Extract the subject from this context.",
            parameters: z.object({ subject: z.string() }),
            execute: async ({ subject }) => subject,
          }),
        },
        maxSteps: 3,
      })

      result.mergeIntoDataStream(dataStream)
    },
  })
}`}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="features">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Key Features:</h3>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>Text Extraction:</strong> Converts PDF text to markdown format, preserving structure and
                  formatting
                </li>
                <li>
                  <strong>Image Recognition:</strong> Identifies and extracts images from PDFs with their exact
                  coordinates
                </li>
                <li>
                  <strong>Layout Preservation:</strong> Maintains the original document layout in the extracted content
                </li>
                <li>
                  <strong>Multiple Views:</strong> View parsed content, reconstructed layout, or raw markdown
                </li>
                <li>
                  <strong>Zoom Controls:</strong> Examine document details with zoom in/out functionality
                </li>
                <li>
                  <strong>Image Information:</strong> View detailed information about extracted images including
                  coordinates and dimensions
                </li>
                <li>
                  <strong>ChatPDF:</strong> Interact with your document content using AI-powered chat interface
                </li>
                <li>
                  <strong>Subject Extraction:</strong> Automatically identifies the main subject of your document
                </li>
                <li>
                  <strong>Download Results:</strong> Export the parsed data as JSON for use in other applications
                </li>
              </ul>
              <p className="mt-4">
                This application is now using a live connection to the Mistral OCR API to process your documents and
                OpenAI's API for the chat functionality. The results you see are the actual output from these models.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

