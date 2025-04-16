import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// The Assistant ID to use - directly use the one from environment variables
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { threadId, runId } = body;
    
    if (!threadId || !runId) {
      return NextResponse.json(
        { success: false, error: 'Missing threadId or runId' },
        { status: 400 }
      );
    }
    
    console.log('Polling run status for thread:', threadId, 'run:', runId);
    
    try {
      // Check the status of the run
      const run = await openai.beta.threads.runs.retrieve(threadId, runId);
      console.log('Run status:', run.status);
      
      if (run.status === 'completed') {
        // Get the assistant's response
        const response = await getLatestAssistantMessage(threadId);
        console.log('Got response from assistant');
        
        return NextResponse.json({
          success: true,
          completed: true,
          message: response
        });
      } else if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
        return NextResponse.json({
          success: false,
          completed: true,
          error: `Run ended with status: ${run.status}`,
          message: "I'm sorry, I couldn't process your request. Please try again."
        });
      } else {
        // Still in progress
        return NextResponse.json({
          success: true,
          completed: false,
          status: run.status
        });
      }
    } catch (error: any) {
      console.error('Error polling run:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error polling run', 
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('API route error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error processing request',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}

// Helper function to get the latest assistant message
async function getLatestAssistantMessage(threadId: string) {
  const messages = await openai.beta.threads.messages.list(threadId, {
    order: 'desc',
    limit: 1,
  });
  
  if (messages.data.length === 0 || messages.data[0].role !== 'assistant') {
    return "I apologize, but I couldn't generate a response at this time.";
  }
  
  let responseText = '';
  
  // Concatenate all content parts from the message
  for (const contentPart of messages.data[0].content) {
    if (contentPart.type === 'text') {
      responseText += contentPart.text.value;
    }
  }
  
  return responseText;
} 