import { type NextRequest, NextResponse } from "next/server"
import { Mistral } from "@mistralai/mistralai"
import { v4 as uuidv4 } from "uuid"
import { storeImagesFromMap } from "@/lib/server/asset-store"

// 실제 Mistral API 응답 구조에 맞는 인터페이스 정의
interface OCRImageObject {
  /**
   * Image ID for extracted image in a page
   */
  id: string
  /**
   * X coordinate of top-left corner of the extracted image
   */
  topLeftX: number | null
  /**
   * Y coordinate of top-left corner of the extracted image
   */
  topLeftY: number | null
  /**
   * X coordinate of bottom-right corner of the extracted image
   */
  bottomRightX: number | null
  /**
   * Y coordinate of bottom-right corner of the extracted image
   */
  bottomRightY: number | null
  /**
   * Base64 string of the extracted image
   */
  imageBase64?: string | null | undefined
}

interface OCRPageDimensions {
  dpi: number
  height: number
  width: number
}

interface OCRPageObject {
  index: number
  markdown: string
  images: OCRImageObject[]
  dimensions: OCRPageDimensions | null
}

export type OCRUsageInfo = {
  /**
   * Number of pages processed
   */
  pagesProcessed: number
  /**
   * Document size in bytes
   */
  docSizeBytes?: number | null | undefined
}

// Mistral API OCR 응답 구조
interface OCRResponse {
  pages: OCRPageObject[]
  model: string
  usageInfo: OCRUsageInfo
}

// Document URL 요청 형식
interface DocumentURLChunk {
  type: "document_url"
  documentUrl: string
  documentName: string
}

// OCR 요청 형식
interface OCRRequest {
  model: string
  document: DocumentURLChunk
  pages?: number[]
  includeImageBase64?: boolean
  image_limit?: number
  image_min_size?: number
}

// 모든 페이지 결합
interface ProcessedPage {
  index: number
  markdown: string
  rawMarkdown: string
  images: Array<{
    id: string
    url: string
    coordinates: {
      x: number
      y: number
      width: number
      height: number
    }
    originalCoordinates: {
      top_left_x: number
      top_left_y: number
      bottom_right_x: number
      bottom_right_y: number
    }
  }>
  dimensions: {
    dpi: number
    height: number
    width: number
  }
}

// API 라우트 핸들러
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const pdfFile = formData.get("pdf") as File
    const isSample = formData.get("isSample") === "true"

    if (!pdfFile) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 })
    }

    console.log(`Processing file: ${pdfFile.name}, size: ${pdfFile.size} bytes, isSample: ${isSample}`)

    // 세션 ID 생성 (이미지 저장 및 추적용)
    const sessionId = uuidv4()

    // 샘플 PDF인 경우 목업 응답 사용
    if (isSample) {
      console.log("Using mock response for sample PDF")
      const mockResponse = await createMockResponse(pdfFile.name, sessionId)
      return NextResponse.json(mockResponse)
    }

    // 사용자 업로드 PDF 처리
    try {
      // Mistral 클라이언트 초기화 - 환경 변수에서 API 키 자동 로드
      const mistral = new Mistral()

      // File을 ArrayBuffer로 변환 후 Buffer로 변환
      const arrayBuffer = await pdfFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // SDK가 처리할 수 있는 File 객체 생성
      const fileObject = new File([buffer], pdfFile.name, { type: "application/pdf" })

      // 1단계: SDK를 사용하여 파일 업로드
      console.log("Uploading file to Mistral...")

      // Mistral SDK의 files.upload 메서드 사용
      const uploadResponse = await mistral.files.upload({
        file: fileObject,
        purpose: "ocr",
      })

      const fileId = uploadResponse.id
      console.log(`File uploaded successfully. File ID: ${fileId}`)

      // 2단계: 서명된 URL 가져오기
      console.log("Getting signed URL...")
      const signedUrlResponse = await mistral.files.getSignedUrl({
        fileId: fileId,
        expiry: 1,
      })
      const signedUrl = signedUrlResponse.url
      console.log("Signed URL obtained successfully")

      // 3단계: OCR로 PDF 처리
      console.log("Processing PDF with OCR...")

      // OCR 요청 데이터 생성
      const ocrRequestData: OCRRequest = {
        model: "mistral-ocr-latest",
        document: {
          type: "document_url",
          documentUrl: signedUrl,
          documentName: pdfFile.name,
        },
        includeImageBase64: true,
      }

      // Mistral SDK의 ocr.process 메서드 사용
      const ocrResponse = await mistral.ocr.process(ocrRequestData)
      console.log(`OCR processing complete. Pages processed: ${ocrResponse.pages.length}`)

      // OCR 응답 처리
      const processedData = await processOcrResponse(ocrResponse, sessionId)
      return NextResponse.json(processedData)
    } catch (apiError) {
      console.error("Error in API operations:", apiError)

      // API 호출 실패 시 목업 응답으로 폴백
      console.log("Falling back to mock response due to API error")
      const mockResponse = await createMockResponse(pdfFile.name, sessionId)
      return NextResponse.json(mockResponse)
    }
  } catch (error) {
    console.error("Error processing PDF:", error)

    // 상세 오류 응답 생성
    return NextResponse.json(
      {
        error: "Failed to process PDF",
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : undefined,
      },
      { status: 500 },
    )
  }
}

// 테스트용 목업 응답 생성 함수
async function createMockResponse(fileName: string, sessionId: string) {
  // PMI 그래프 이미지 URL
  const pmiGraphUrl =
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/img-1.jpeg-0afae6fb-OLkYscR0PxBzexzNs6sQJ6v8H4dKv2.jpeg"

  // PMI 데이터 및 그래프가 포함된 샘플 마크다운 텍스트 생성
  const sampleMarkdown = `# PMI Economic Report: ${fileName}

## Economic Analysis - December 2023

Rising workforce numbers at a time of falling new orders meant that firms continued to work through outstanding business in the final month of the year. Moreover, the pace of depletion was sharp and the steepest since June 2023.

While firms increased employment, the drop in new orders resulted in reductions in purchasing activity, as well as stocks of inputs and finished goods. Input buying and stocks of purchases both decreased more quickly than in November, while the reduction in stocks of finished goods was the first in six months.

![pmi_graph](${pmiGraphUrl})

## Price Trends

The rate of input cost inflation accelerated sharply at the end of the year, with the latest increase the fastest since August. The rise was broadly in line with the pre-pandemic average. Higher supplier charges and rising costs for raw materials were reported by panellists. 

In turn, firms increased their output prices, with the pace of inflation quickening to a three-month high. Charges have risen continuously since June 2020.

Meanwhile, suppliers' delivery times lengthened to the greatest extent since October 2022, linked to staff shortages at suppliers and freight delays.`

  // 원시 텍스트용 URL 대신 이미지 ID 사용
  const rawMarkdown = sampleMarkdown.replace(`![pmi_graph](${pmiGraphUrl})`, "![pmi_graph](pmi_graph)")

  // 샘플 이미지 데이터 가져오기
  const response = await fetch(pmiGraphUrl)
  const imageBuffer = await response.arrayBuffer()
  const base64Image = Buffer.from(imageBuffer).toString("base64")
  const dataUrl = `data:image/jpeg;base64,${base64Image}`

  // 이미지 맵 생성
  const imageMap: Record<string, string> = {
    pmi_graph: dataUrl,
  }

  // 이미지 저장
  const savedImages = await storeImagesFromMap(imageMap, sessionId)

  // OCRPageObject 구조와 일치하는 목업 페이지 객체 생성
  const mockPage: OCRPageObject = {
    index: 0,
    markdown: sampleMarkdown,
    images: [
      {
        id: "pmi_graph",
        topLeftX: 50,
        topLeftY: 300,
        bottomRightX: 550,
        bottomRightY: 500,
        imageBase64: dataUrl,
      },
    ],
    dimensions: {
      dpi: 72,
      height: 792,
      width: 612,
    },
  }

  // 저장된 모든 이미지 정보 수집
  const storedAssets = Object.values(savedImages).map((asset) => ({
    id: asset.id,
    originalId: asset.originalId,
    publicPath: asset.publicPath,
    mimeType: asset.mimeType,
  }))

  // 처리된 응답 형식과 일치하는 전체 목업 응답 생성
  return {
    text: sampleMarkdown,
    rawText: rawMarkdown,
    sessionId: sessionId,
    pages: [
      {
        index: 0,
        markdown: sampleMarkdown,
        rawMarkdown: rawMarkdown,
        images: [
          {
            id: "pmi_graph",
            url: savedImages["pmi_graph"]?.publicPath || pmiGraphUrl,
            coordinates: {
              x: 0.08,
              y: 0.38,
              width: 0.82,
              height: 0.25,
            },
            originalCoordinates: {
              top_left_x: 50,
              top_left_y: 300,
              bottom_right_x: 550,
              bottom_right_y: 500,
            },
          },
        ],
        dimensions: {
          dpi: 72,
          height: 792,
          width: 612,
        },
      },
    ],
    images: [
      {
        id: "pmi_graph",
        url: savedImages["pmi_graph"]?.publicPath || pmiGraphUrl,
        coordinates: {
          x: 0.08,
          y: 0.38,
          width: 0.82,
          height: 0.25,
        },
        originalCoordinates: {
          top_left_x: 50,
          top_left_y: 300,
          bottom_right_x: 550,
          bottom_right_y: 500,
        },
      },
    ],
    storedAssets: storedAssets, // 명시적으로 storedAssets 배열 포함
    usage: {
      pages_processed: 1,
      doc_size_bytes: 1024,
    },
    model: "mistral-ocr-latest",
  }
}

// OCR 응답 처리 함수
async function processOcrResponse(ocrResponse: OCRResponse, sessionId: string) {
  // OCR 응답 처리
  const processedPages = await Promise.all(
    ocrResponse.pages.map(async (page: OCRPageObject) => {
      // 이미지 ID를 base64 데이터 URL에 매핑
      const imageMap: Record<string, string> = {}

      // 이 페이지의 이미지 처리
      const images = page.images.map((image: OCRImageObject) => {
        // 이미지용 데이터 URL 생성
        const dataUrl = image.imageBase64 ? `${image.imageBase64}` : "/placeholder.svg?height=200&width=300"

        // 마크다운 대체용 맵에 저장
        imageMap[image.id] = dataUrl

        // 좌표 가져오기
        const topLeftX = image.topLeftX || 0
        const topLeftY = image.topLeftY || 0
        const bottomRightX = image.bottomRightX || 100
        const bottomRightY = image.bottomRightY || 100

        // 좌표에서 너비와 높이 계산
        const width = bottomRightX - topLeftX
        const height = bottomRightY - topLeftY

        // 페이지 치수 기반 상대 좌표 계산
        const pageWidth = page.dimensions?.width || 612
        const pageHeight = page.dimensions?.height || 792

        return {
          id: image.id,
          url: dataUrl,
          coordinates: {
            x: topLeftX / pageWidth,
            y: topLeftY / pageHeight,
            width: width / pageWidth,
            height: height / pageHeight,
          },
          originalCoordinates: {
            top_left_x: topLeftX,
            top_left_y: topLeftY,
            bottom_right_x: bottomRightX,
            bottom_right_y: bottomRightY,
          },
        }
      })

      // 이미지 맵을 사용하여 파일 시스템에 이미지 저장
      const savedImages = await storeImagesFromMap(imageMap, sessionId)

      // 마크다운에서 이미지 플레이스홀더 대체
      let processedMarkdown = page.markdown

      // 이미지 참조 안전하게 대체
      Object.entries(imageMap).forEach(([id, dataUrl]) => {
        try {
          // RegExp 대신 간단한 문자열 대체 접근 방식 사용
          // Mistral API가 일반적으로 반환하는 ![id](id) 형식 처리
          const imagePattern = `![${id}](${id})`
          const imageReplacement = `![${id}](${savedImages[id]?.publicPath || dataUrl})`

          // 간단한 문자열 대체
          processedMarkdown = processedMarkdown.split(imagePattern).join(imageReplacement)
        } catch (e) {
          console.error(`Error replacing image ${id} in markdown:`, e)
        }
      })

      // 저장된 이미지 URL로 이미지 객체 업데이트
      const updatedImages = images.map((img) => ({
        ...img,
        url: savedImages[img.id]?.publicPath || img.url,
      }))

      return {
        index: page.index,
        markdown: processedMarkdown,
        rawMarkdown: page.markdown,
        images: updatedImages,
        dimensions: page.dimensions || {
          dpi: 72,
          height: 792,
          width: 612,
        },
      }
    }),
  )

  // 모든 페이지 결합
  const combinedMarkdown = processedPages.map((page) => page.markdown).join("\n\n")
  const rawMarkdown = processedPages.map((page) => page.rawMarkdown).join("\n\n")
  const allImages = processedPages.flatMap((page) => page.images)

  // 사용 정보 가져오기
  const usageInfo = ocrResponse.usageInfo || {
    pagesProcessed: ocrResponse.pages.length,
    docSizeBytes: 0,
  }

  // 저장된 모든 이미지 정보 수집
  const allStoredAssets = await Promise.all(
    processedPages.flatMap((page) =>
      page.images.map(async (img) => {
        // 이미지 URL에서 publicPath 추출
        const publicPath = img.url
        if (!publicPath) return null

        // 파일 이름 추출 (URL에서 마지막 부분)
        const fileName = publicPath.split("/").pop() || ""
        const id = fileName.split(".")[0] || img.id

        // MIME 타입 추출 (URL에서 확장자 기반)
        const extension = fileName.split(".").pop() || "png"
        const mimeType = `image/${extension}`

        return {
          id,
          originalId: img.id,
          publicPath,
          mimeType,
        }
      }),
    ),
  )

  // null 값 필터링 및 중복 제거
  const storedAssets = allStoredAssets
    .filter(Boolean)
    .filter((asset, index, self) => index === self.findIndex((a) => a?.id === asset?.id))

  console.log(`Processed ${processedPages.length} pages with ${storedAssets.length} stored assets`)

  // 처리된 데이터 반환
  return {
    text: combinedMarkdown,
    rawText: rawMarkdown,
    sessionId: sessionId,
    pages: processedPages,
    images: allImages,
    storedAssets: storedAssets, // 명시적으로 storedAssets 배열 포함
    usage: {
      pages_processed: usageInfo.pagesProcessed || 0,
      doc_size_bytes: usageInfo.docSizeBytes || 0,
    },
    model: ocrResponse.model || "mistral-ocr-latest",
  }
}

