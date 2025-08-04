import type React from "react"
import type { Metadata } from "next"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const geistMono = GeistMono.className

export const metadata: Metadata = {
  title: "Mistral OCR PDF Parser",
  description: "Parse PDF documents using Mistral OCR and visualize the results",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geistMono} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

