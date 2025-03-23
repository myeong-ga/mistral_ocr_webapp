import "server-only"
import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

// 이미지 저장 경로 설정
const ASSET_DIR = path.join(process.cwd(), "public", "assets", "ocr-images")

// 이미지 저장 타입 정의
interface SavedImageAsset {
  id: string
  originalId: string
  filePath: string
  publicPath: string
  mimeType: string
  width?: number
  height?: number
}

// 이미지 맵 타입 정의
type ImageMap = Record<string, string>

/**
 * 디렉토리가 존재하는지 확인하고 없으면 생성
 */
function ensureDirectoryExists(directory: string): void {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true })
  }
}

/**
 * Base64 데이터에서 MIME 타입 추출
 */
function getMimeTypeFromBase64(base64Data: string): string {
  // Base64 데이터에서 MIME 타입 추출 시도
  const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/)
  return matches && matches.length > 1 ? matches[1] : "image/png" // 기본값은 PNG
}

/**
 * Base64 데이터에서 실제 이미지 데이터만 추출
 */
function extractBase64Data(base64Data: string): string {
  const matches = base64Data.match(/^data:image\/[a-zA-Z0-9-.+]+;base64,(.+)$/)
  return matches && matches.length > 1 ? matches[1] : base64Data
}

/**
 * 이미지 맵을 사용하여 이미지를 파일 시스템에 저장
 */
export async function storeImagesFromMap(
  imageMap: ImageMap,
  sessionId?: string,
): Promise<Record<string, SavedImageAsset>> {
  // 세션 ID가 없으면 생성
  const session = sessionId || uuidv4()

  // 세션별 디렉토리 경로
  const sessionDir = path.join(ASSET_DIR, session)

  // 디렉토리 존재 확인
  ensureDirectoryExists(sessionDir)

  // 저장된 이미지 정보를 담을 객체
  const savedImages: Record<string, SavedImageAsset> = {}

  // 이미지 맵의 각 항목을 처리
  for (const [imageId, base64Data] of Object.entries(imageMap)) {
    try {
      // MIME 타입 추출
      const mimeType = getMimeTypeFromBase64(base64Data)

      // 파일 확장자 결정
      const extension = mimeType.split("/")[1] || "png"

      // 파일명 생성 (원본 ID + UUID)
      const fileName = `${imageId}-${uuidv4().slice(0, 8)}.${extension}`

      // 파일 경로 설정
      const filePath = path.join(sessionDir, fileName)

      // 공개 경로 설정 (클라이언트에서 접근 가능한 경로)
      const publicPath = `/assets/ocr-images/${session}/${fileName}`

      // Base64 데이터 추출
      const base64Content = extractBase64Data(base64Data)

      // 파일로 저장
      fs.writeFileSync(filePath, Buffer.from(base64Content, "base64"))

      // 저장된 이미지 정보 기록
      savedImages[imageId] = {
        id: fileName.split(".")[0],
        originalId: imageId,
        filePath,
        publicPath,
        mimeType,
      }

      console.log(`Image saved: ${publicPath}`)
    } catch (error) {
      console.error(`Failed to save image ${imageId}:`, error)
    }
  }

  // 세션 정보 저장 (나중에 정리를 위해)
  const sessionInfoPath = path.join(sessionDir, "session-info.json")
  fs.writeFileSync(
    sessionInfoPath,
    JSON.stringify({
      sessionId: session,
      createdAt: new Date().toISOString(),
      imageCount: Object.keys(savedImages).length,
    }),
  )

  return savedImages
}

/**
 * 세션 ID로 저장된 이미지 목록 가져오기
 */
export function getStoredImagesBySession(sessionId: string): SavedImageAsset[] {
  const sessionDir = path.join(ASSET_DIR, sessionId)

  if (!fs.existsSync(sessionDir)) {
    return []
  }

  // 세션 정보 파일 경로
  const sessionInfoPath = path.join(sessionDir, "session-info.json")

  // 세션 정보 파일이 없으면 빈 배열 반환
  if (!fs.existsSync(sessionInfoPath)) {
    return []
  }

  // 디렉토리 내 모든 파일 목록 가져오기
  const files = fs.readdirSync(sessionDir).filter((file) => file !== "session-info.json" && !file.startsWith("."))

  // 각 파일에 대한 정보 수집
  return files.map((fileName) => {
    const filePath = path.join(sessionDir, fileName)
    const publicPath = `/assets/ocr-images/${sessionId}/${fileName}`
    const fileNameParts = fileName.split(".")
    const extension = fileNameParts.pop() || "png"
    const id = fileNameParts.join(".")
    const originalIdParts = id.split("-")
    const originalId = originalIdParts.slice(0, -1).join("-") || id

    return {
      id,
      originalId,
      filePath,
      publicPath,
      mimeType: `image/${extension}`,
    }
  })
}

/**
 * 세션 ID로 저장된 이미지 삭제
 */
export function deleteStoredImagesBySession(sessionId: string): boolean {
  const sessionDir = path.join(ASSET_DIR, sessionId)

  if (!fs.existsSync(sessionDir)) {
    return false
  }

  try {
    // 디렉토리 내 모든 파일 삭제
    const files = fs.readdirSync(sessionDir)
    for (const file of files) {
      fs.unlinkSync(path.join(sessionDir, file))
    }

    // 디렉토리 삭제
    fs.rmdirSync(sessionDir)

    return true
  } catch (error) {
    console.error(`Failed to delete session ${sessionId}:`, error)
    return false
  }
}

