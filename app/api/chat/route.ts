import { openai } from "@ai-sdk/openai"
import { createDataStreamResponse, streamText, tool } from "ai"
import { z } from "zod"

export async function POST(req: Request) {
  const { messages, documentContent } = await req.json()
  let stepCounter = 0

  // 시스템 메시지 생성
  const systemMessage = documentContent
    ? `You are a helpful assistant that answers questions about the following document content. 
       Use this content to provide accurate answers:
       
       ${documentContent}
       
       Ensure that the 'ExtractSubject' tool is used for the user's first message.`
    : "You are a helpful assistant."

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const result = streamText({
        model: openai("gpt-4o-mini", { structuredOutputs: true }),
        system: systemMessage,
        messages,
        // toolChoice: 'required', // force the model to call a tool
        toolCallStreaming: true,
        tools: {
          ExtractSubject: tool({
            description: "Extracts a subject from the context injected into the system prompt.",
            parameters: z.object({ subject: z.string() }),
            execute: async ({ subject }) => subject, // no-op extract tool
          }),
        },
        maxSteps: 3,
        onStepFinish: ({ toolCalls, toolResults, finishReason, usage, text }) => {
          stepCounter++
          console.log(`
📊 Step ${stepCounter} Finished:`)
          console.log("🏁 Finish Reason:", finishReason)
          console.log("💬 Model Response:", text)

          if (toolCalls && toolCalls.length > 0) {
            console.log("🛠️ Tool Calls:")
            toolCalls.forEach((call, index) => {
              console.log(`  [${index + 1}] Tool: ${call.toolName}, Arguments:`, call.args)
            })
          }

          if (toolResults && toolResults.length > 0) {
            console.log("🔧 Tool Results:")
            toolResults.forEach((result, index) => {
              console.log(`  [${index + 1}] Result:`, typeof result === "object" ? JSON.stringify(result) : result)
            })
          }

          if (usage) {
            console.log("📈 Usage:", usage)
          }

          console.log("------------------------")
        },
      })

      result.mergeIntoDataStream(dataStream)
    },
  })
}

