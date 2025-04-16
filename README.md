# AI Construction Assistant (Clean Version)

A Next.js application that provides AI-powered recommendations for construction and DIY projects.

## Setup

1. Clone this repository
2. Install dependencies:
   `
   npm install
   `
3. Copy .env.example to .env.local and add your OpenAI API key:
   `
   OPENAI_API_KEY=your_api_key_here
   OPENAI_ASSISTANT_ID=your_assistant_id_here
   `
4. Run the development server:
   `
   npm run dev
   `
5. Open [http://localhost:3500](http://localhost:3500) in your browser

## Features

- Chat interface for interacting with AI
- Product recommendations for DIY and construction projects
- Amazon affiliate links for recommended products

## Project Structure

- /src/app - Next.js App Router pages
- /src/components - Reusable React components
- /src/lib - Core functionality and services
- /src/utils - Helper functions and utilities
- /src/types - TypeScript type definitions

## Environment Variables

- OPENAI_API_KEY - Your OpenAI API key
- OPENAI_ASSISTANT_ID - Your OpenAI Assistant ID
- NEXT_PUBLIC_AFFILIATE_TAG - Amazon affiliate tag
- NEXT_PUBLIC_MOCK_MODE - Enable mock mode (true/false)
