"use client"

import { useState, useEffect } from "react"

interface WindowSize {
  width: number | undefined
  height: number | undefined
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: undefined,
    height: undefined,
  })

  useEffect(() => {
    // 윈도우 크기를 가져오는 핸들러 함수
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // 이벤트 리스너 추가
    window.addEventListener("resize", handleResize)

    // 초기 윈도우 크기 설정
    handleResize()

    // 클린업 함수
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return windowSize
}

