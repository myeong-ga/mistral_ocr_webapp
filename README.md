# Mistral OCR PDF Parser

> A powerful document processing solution that combines OCR capabilities with interactive AI chat interface.

## 🚀 Features

- **PDF Processing**: Extract text and images from PDF documents with layout preservation
- **OCR Integration**: Leverage Mistral's OCR technology for accurate text recognition
- **ChatPDF**: Interact with your documents through a natural language interface
- **Asset Management**: View and manage extracted images with zoom functionality

Built with Next.js, AI SDK, and Mistral API, this application streamlines document analysis workflows by providing a seamless integration between document processing and conversational AI.

Get started by uploading a PDF or trying our sample document!

## 📹 Demo

https://github.com/user-attachments/assets/d29a6c28-0b1f-4dd7-8564-f217bedbf23e

## Getting Started

Configure the required API keys in the `.env.local` file:


```plaintext
# Required for OCR functionality
MISTRAL_API_KEY=your_mistral_api_key_here

# Required for ChatPDF functionality
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Maybe Required for Serverless deployment for Image Rendering during ChatPDF chatting session
BLOB_READ_WRITE_TOKEN="your_blob_read_write_token"
```

You need to obtain:

- A Mistral API key for the OCR functionality to process PDF documents
- An Anthropic API key for the ChatPDF feature to enable AI-powered document chat
- For image rendering, deployment to a host may be necessary. If the deployed host operates in a serverless environment without a filesystem, a separate blob storage service should be used. This project is designed to run locally without requiring a blob service.

Without these API keys, the respective features will not work properly.

Run the development server:

```bash

pnpm dev

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
