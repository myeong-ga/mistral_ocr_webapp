"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Info,
  Image,
  MessageSquare,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Markdown, type ImageRendererProps } from "@/components/markdown"
import { ChatInterface } from "@/components/chat-interface"
import { useWindowSize } from "@/hooks/use-window-size"

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

interface StoredAsset {
  id: string
  originalId: string
  publicPath: string
  mimeType: string
  width?: number
  height?: number
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

interface ResultsViewerProps {
  results: {
    text: string
    rawText: string
    sessionId?: string
    pages: PageData[]
    images: ImageData[]
    storedAssets?: StoredAsset[]
    usage?: {
      pages_processed: number
      doc_size_bytes: number
    }
    model?: string
  }
  originalFile: File | null
}

export function ResultsViewer({ results, originalFile }: ResultsViewerProps) {
  const [activeTab, setActiveTab] = useState("reconstructed")
  const [copied, setCopied] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [assetZoomLevel, setAssetZoomLevel] = useState(1)
  const [currentPage, setCurrentPage] = useState(0)
  const [showImageInfo, setShowImageInfo] = useState<string | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<StoredAsset | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatWidth, setChatWidth] = useState(42) // 기본값: 42% (3/7 비율)
  const [isResizing, setIsResizing] = useState(false)
  const { height } = useWindowSize()
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef(0)

  // 선택된 에셋이 변경될 때 확대/축소 수준 초기화
  useEffect(() => {
    if (selectedAsset) {
      setAssetZoomLevel(1)
    }
  }, [selectedAsset])

  // 채팅창이 열리면 스크롤 방지 및 위치 저장
  useEffect(() => {
    if (isChatOpen) {
      // 현재 스크롤 위치 저장
      scrollPositionRef.current = window.scrollY

      // 스크롤 방지 코드 제거 - 페이지 스크롤을 허용하도록 함
    } else {
      // 스크롤 복원 코드도 제거 - 페이지 스크롤이 항상 가능하도록 함

      // 저장된 스크롤 위치로 복원 (이 부분은 유지)
      window.scrollTo(0, scrollPositionRef.current)
    }

    return () => {
      // 클린업 함수에서도 스크롤 관련 스타일 제거
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.width = ""
    }
  }, [isChatOpen])

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(results.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadResults = () => {
    const dataStr = JSON.stringify(results, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = `${originalFile?.name.replace(".pdf", "") || "parsed"}_results.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2))
  }

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5))
  }

  const nextPage = () => {
    if (currentPage < results.pages.length - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const currentPageData = results.pages[currentPage]

  // Custom renderer for images to handle missing or invalid URLs
  const imageRenderer = (props: ImageRendererProps) => {
    const { src, alt } = props
    // If src is empty or just an ID (not a URL), use a placeholder
    if (!src || (!src.includes("/") && !src.includes(":"))) {
      return <img src="/placeholder.svg?height=200&width=300" alt={alt || "Image placeholder"} />
    }
    return <img src={src || "/placeholder.svg"} alt={alt || "Extracted image"} />
  }

  // 채팅 토글 핸들러
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen)
  }

  // 전체화면 토글 핸들러
  const toggleChatFullscreen = () => {
    if (chatWidth < 70) {
      // 현재 폭이 최대값보다 작으면 최대값으로 확장
      setChatWidth(70)
    } else {
      // 이미 최대값이면 기본값으로 되돌리기
      setChatWidth(42)
    }
  }

  // 리사이즈 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return
    
    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
    
    // 최소 25%, 최대 70%로 제한
    const clampedWidth = Math.min(Math.max(newWidth, 25), 70)
    setChatWidth(clampedWidth)
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  // 마우스 이벤트 리스너 등록
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  return (
    <div className="space-y-4" ref={containerRef}>
      <h2 className="text-xl font-semibold mb-4">Results</h2>
      
      <div className="flex gap-4">
        {/* 채팅 인터페이스 */}
        {isChatOpen && (
          <>
            <div
              className="bg-card rounded-lg shadow-sm overflow-hidden flex-shrink-0"
              style={{
                width: `${chatWidth}%`,
                height: height ? `calc(${height}px - 200px)` : "calc(100vh - 200px)",
                position: "sticky",
                top: "1rem",
                zIndex: 10,
              }}
            >
              <ChatInterface 
                onClose={toggleChat} 
                documentTitle={originalFile?.name} 
                rawText={results.text}
                isFullscreen={chatWidth >= 70}
                onToggleFullscreen={toggleChatFullscreen}
              />
            </div>
            
            {/* 리사이즈 핸들 */}
            <div
              className="w-1 bg-border hover:bg-primary cursor-col-resize flex-shrink-0 rounded-full transition-colors duration-200"
              onMouseDown={handleMouseDown}
              style={{
                height: height ? `calc(${height}px - 200px)` : "calc(100vh - 200px)",
                position: "sticky",
                top: "1rem",
                zIndex: 11,
              }}
            />
          </>
        )}

        {/* 메인 콘텐츠 */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="reconstructed" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="reconstructed">Reconstructed View</TabsTrigger>
                {results.storedAssets && results.storedAssets.length > 0 && (
                  <TabsTrigger value="assets">Asset View</TabsTrigger>
                )}
              </TabsList>

              <div className="flex gap-2">
                <Button
                  variant={isChatOpen ? "default" : "outline"}
                  size="sm"
                  onClick={toggleChat}
                  className="flex items-center gap-1"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">ChatPDF</span>
                </Button>
                {activeTab === "reconstructed" && (
                  <>
                    <Button variant="outline" size="sm" onClick={zoomIn} className="flex items-center gap-1">
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={zoomOut} className="flex items-center gap-1">
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="flex items-center gap-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadResults} className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              </div>
            </div>

            {results.pages.length > 1 && activeTab !== "assets" && (
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous Page
                </Button>
                <span className="text-sm">
                  Page {currentPage + 1} of {results.pages.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={currentPage === results.pages.length - 1}
                  className="flex items-center gap-1"
                >
                  Next Page
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <TabsContent value="reconstructed" className="mt-0">
              {currentPageData && (
                <div className="mb-2 text-xs text-muted-foreground">
                  <span>
                    Page dimensions: {currentPageData.dimensions.width} × {currentPageData.dimensions.height} pixels
                  </span>
                  {currentPageData.dimensions.dpi > 0 && (
                    <span className="ml-2">({currentPageData.dimensions.dpi} DPI)</span>
                  )}
                </div>
              )}

              <div
                className="relative bg-white dark:bg-gray-900 border rounded-md p-4 min-h-[400px] overflow-auto"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "top left",
                  height: "600px",
                }}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown imageRenderer={imageRenderer}>{currentPageData?.markdown || ""}</Markdown>
                </div>

                <TooltipProvider>
                  {currentPageData?.images.map((image, index) => (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <div
                          className="absolute border border-dashed border-primary/50 cursor-help"
                          style={{
                            left: `${image.coordinates.x * 100}%`,
                            top: `${image.coordinates.y * 100}%`,
                            width: `${image.coordinates.width * 100}%`,
                            height: `${image.coordinates.height * 100}%`,
                          }}
                          onMouseEnter={() => setShowImageInfo(image.id)}
                          onMouseLeave={() => setShowImageInfo(null)}
                        >
                          <img
                            src={image.url || "/placeholder.svg?height=200&width=300"}
                            alt={`Extracted image ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                          {showImageInfo === image.id && (
                            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs p-1 rounded-bl">
                              <Info className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <p>Image ID: {image.id}</p>
                          <p>
                            Top Left: ({image.originalCoordinates.top_left_x}, {image.originalCoordinates.top_left_y})
                          </p>
                          <p>
                            Bottom Right: ({image.originalCoordinates.bottom_right_x},{" "}
                            {image.originalCoordinates.bottom_right_y})
                          </p>
                          <p>
                            Size: {image.originalCoordinates.bottom_right_x - image.originalCoordinates.top_left_x} ×{" "}
                            {image.originalCoordinates.bottom_right_y - image.originalCoordinates.top_left_y} px
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </TabsContent>

            <TabsContent value="assets" className="mt-0">
              {results.storedAssets && results.storedAssets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.storedAssets.map((asset, index) => (
                    <div
                      key={index}
                      className={`border rounded-md p-2 cursor-pointer transition-all ${selectedAsset?.id === asset.id ? "ring-2 ring-primary" : "hover:bg-muted/50"}`}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <div className="aspect-video bg-muted/30 rounded-md flex items-center justify-center overflow-hidden mb-2">
                        <img
                          src={asset.publicPath || "/placeholder.svg"}
                          alt={`Asset ${asset.originalId}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        <p className="font-medium text-foreground">{asset.originalId}</p>
                        <p>{asset.mimeType}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Image className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No assets found</h3>
                  <p className="text-sm text-muted-foreground mt-1">No extracted images were found in this document</p>
                </div>
              )}

              {selectedAsset && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">Selected Asset</h3>
                  <div className="bg-muted/30 rounded-md p-4">
                    <div className="flex flex-col items-center mb-4">
                      <div className="overflow-auto border rounded-md p-1 mb-2" style={{ maxHeight: "400px" }}>
                        <div
                          style={{
                            transform: `scale(${assetZoomLevel})`,
                            transformOrigin: "top left",
                            transition: "transform 0.2s ease",
                          }}
                        >
                          <img
                            src={selectedAsset.publicPath || "/placeholder.svg"}
                            alt={`Asset ${selectedAsset.originalId}`}
                            className="object-contain"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAssetZoomLevel((prev) => Math.max(prev - 0.2, 0.5))}
                          disabled={assetZoomLevel <= 0.5}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">{Math.round(assetZoomLevel * 100)}%</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAssetZoomLevel((prev) => Math.min(prev + 0.2, 3))}
                          disabled={assetZoomLevel >= 3}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAssetZoomLevel(1)}
                          disabled={assetZoomLevel === 1}
                        >
                          Reset
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">ID:</p>
                        <p>{selectedAsset.id}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Original ID:</p>
                        <p>{selectedAsset.originalId}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">MIME Type:</p>
                        <p>{selectedAsset.mimeType}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Path:</p>
                        <p className="truncate">{selectedAsset.publicPath}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement("a")
                          link.href = selectedAsset.publicPath
                          link.download = `${selectedAsset.originalId}.${selectedAsset.mimeType.split("/")[1]}`
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Asset
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

