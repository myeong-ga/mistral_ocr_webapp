"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, X, User, Bot, Maximize2, Minimize2 } from "lucide-react"
import { useChat } from "@ai-sdk/react"
import { Markdown } from "@/components/markdown"

interface ChatInterfaceProps {
  onClose: () => void
  documentTitle?: string
  rawText?: string
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export function ChatInterface({ 
  onClose, 
  documentTitle, 
  rawText, 
  isFullscreen = false, 
  onToggleFullscreen 
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  //console.log("ChatInterface", rawText)
  // useChat 훅 사용
  const { messages, input, handleInputChange, handleSubmit, status, isLoading } = useChat({
    api: "/api/chat",
    body: {
      documentContent: rawText,
    },
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: `Hello! I'm your PDF assistant. Ask me anything about ${documentTitle || "this document"}.`,
      },
    ],
  })

  // 새 메시지가 추가될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 폼 제출 핸들러
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    handleSubmit(e)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <h2 className="text-base font-semibold">Chat with PDF</h2>
        <div className="flex items-center gap-1">
          {onToggleFullscreen && (
            <Button variant="ghost" size="icon" onClick={onToggleFullscreen} aria-label="Toggle fullscreen">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close chat">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-background" style={{ maxHeight: "calc(100% - 100px)" }}>
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`flex items-start gap-2 max-w-[80%] ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div className={`p-1.5 rounded-full ${message.role === "user" ? "bg-primary" : "bg-muted"}`}>
                {message.role === "user" ? (
                  <User className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={`p-2.5 rounded-lg text-sm ${
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {/* 메시지 파트 렌더링 */}
                {message.parts && message.parts.length > 0 ? (
                  <div className="whitespace-pre-wrap">
                    {message.parts.map((part, index) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <div key={index} className="text-xs leading-relaxed">
                              <Markdown>{part.text}</Markdown>
                            </div>
                          )
                        case "tool-invocation": {
                          const toolInvocation = part.toolInvocation
                          const toolCallId = toolInvocation.toolCallId
                          const toolName = toolInvocation.toolName
                          const args = toolInvocation.args
                          return (
                            <div
                              key={toolCallId}
                              className="p-2 my-2 border border-primary/20 bg-primary/5 dark:bg-primary/10 rounded text-xs"
                            >
                              <h4 className="mb-1 text-primary font-medium">Tool: {toolName || ""}</h4>
                              <div className="flex flex-col gap-1 text-foreground">
                                {args?.subject && <div>Subject: {args.subject}</div>}
                              </div>
                            </div>
                          )
                        }
                        default:
                          return null
                      }
                    })}
                  </div>
                ) : (
                  // 기존 메시지 형식 지원 (parts가 없는 경우)
                  <div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    <p className="text-[10px] opacity-70 mt-1">{new Date().toLocaleTimeString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2 max-w-[80%]">
              <div className="p-1.5 rounded-full bg-muted">
                <Bot className="h-4 w-4" />
              </div>
              <div className="p-2.5 rounded-lg bg-muted">
                <div className="flex space-x-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleFormSubmit} className="p-3 border-t bg-card">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question about the document..."
            disabled={isLoading}
            className="flex-1 text-sm"
          />
          <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </form>
    </div>
  )
}

