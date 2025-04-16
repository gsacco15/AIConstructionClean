// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// The Assistant ID to use
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || '';

export async function POST(request: Request) {
  // Add debug logs to help troubleshoot issues
  console.log('API route called with OpenAI API Key present:', !!process.env.OPENAI_API_KEY);
  console.log('API route called with Assistant ID:', process.env.OPENAI_ASSISTANT_ID);
  console.log('NEXT_PUBLIC_MOCK_MODE:', process.env.NEXT_PUBLIC_MOCK_MODE);
  
  try {
    const body = await request.json();
    const { action, threadId, message } = body;
    
    console.log('API request action:', action);
    console.log('API request threadId:', threadId);
    
    // Use mock mode if API key is missing or if explicitly enabled
    const useMockMode = !process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
    
    if (useMockMode) {
      console.log('Using mock mode for OpenAI response');
      return handleMockResponse(action, message);
    }
    
    // Verify the OpenAI API key and Assistant ID
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is missing');
      return NextResponse.json(
        { success: false, error: 'OpenAI API key is missing' },
        { status: 500 }
      );
    }
    
    if (!ASSISTANT_ID) {
      console.error('OpenAI Assistant ID is missing');
      return NextResponse.json(
        { success: false, error: 'OpenAI Assistant ID is missing' },
        { status: 500 }
      );
    }
    
    try {
      switch (action) {
        case 'createThread':
          return await handleCreateThread(message);
        case 'sendMessage':
          return await handleSendMessage(threadId, message);
        case 'generateRecommendations':
          return await handleGenerateRecommendations(threadId);
        default:
          return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
          );
      }
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API error', 
          details: openaiError instanceof Error ? openaiError.message : String(openaiError) 
        },
        { status: 500 }
      );
    }
  } catch (error) {
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

// Handler functions for each action
async function handleCreateThread(message: string) {
  console.log('Creating thread with message:', message);
  
  try {
    // Create a thread
    const thread = await openai.beta.threads.create();
    console.log('Thread created:', thread.id);
    
    if (message) {
      // Add the user's message to the thread
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: message,
      });
      console.log('Message added to thread');
      
      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: ASSISTANT_ID,
      });
      console.log('Run created:', run.id);
      
      // Wait for completion
      await waitForRunCompletion(thread.id, run.id);
      console.log('Run completed');
      
      // Get the response
      const response = await getLatestAssistantMessage(thread.id);
      console.log('Got response from assistant');
      
      return NextResponse.json({ 
        success: true, 
        threadId: thread.id,
        message: response
      });
    }
    
    return NextResponse.json({ success: true, threadId: thread.id });
  } catch (error) {
    console.error('Error in handleCreateThread:', error);
    throw error;
  }
}

async function handleSendMessage(threadId: string, message: string) {
  await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: message,
  });
  
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: ASSISTANT_ID,
  });
  
  await waitForRunCompletion(threadId, run.id);
  const response = await getLatestAssistantMessage(threadId);
  
  return NextResponse.json({ success: true, message: response });
}

async function handleGenerateRecommendations(threadId: string) {
  // Request recommendations in JSON format
  await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: "Please provide recommendations for my project in JSON format with \"materials\" and \"tools\" arrays. Each item should have a \"name\" property.",
  });
  
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: ASSISTANT_ID,
  });
  
  await waitForRunCompletion(threadId, run.id);
  
  // Get messages and extract JSON
  const messages = await openai.beta.threads.messages.list(threadId);
  let recommendations = null;
  
  for (const message of messages.data) {
    if (message.role === 'assistant' && message.content && message.content.length > 0) {
      const content = message.content[0];
      if (content.type === 'text') {
        recommendations = extractJsonFromMessage(content.text.value);
        if (recommendations) break;
      }
    }
  }
  
  if (!recommendations) {
    recommendations = getFallbackRecommendations();
  } else {
    // Add affiliate links
    const addAffiliateLink = (item: any) => ({
      ...item,
      affiliate_url: item.affiliate_url || createAffiliateLink(item.name)
    });
    
    recommendations.materials = recommendations.materials.map(addAffiliateLink);
    recommendations.tools = recommendations.tools.map(addAffiliateLink);
  }
  
  return NextResponse.json({ success: true, recommendations });
}

// Helper functions

async function waitForRunCompletion(threadId: string, runId: string, maxAttempts = 15) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    
    if (run.status === 'completed') {
      return;
    }
    
    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      throw new Error(`Run ended with status: ${run.status}`);
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  throw new Error('Run did not complete in the expected timeframe');
}

async function getLatestAssistantMessage(threadId: string) {
  const messages = await openai.beta.threads.messages.list(threadId);
  
  for (const message of messages.data) {
    if (message.role === 'assistant' && message.content && message.content.length > 0) {
      const content = message.content[0];
      if (content.type === 'text') {
        return content.text.value;
      }
    }
  }
  
  return 'I don\'t have a response at this time.';
}

function extractJsonFromMessage(message: string) {
  try {
    // Find JSON pattern in message
    const jsonRegex = /\{[\s\S]*"materials"[\s\S]*"tools"[\s\S]*\}/;
    const match = message.match(jsonRegex);
    
    if (match) {
      const jsonStr = match[0];
      const json = JSON.parse(jsonStr);
      
      // Validate the structure
      if (json && Array.isArray(json.materials) && Array.isArray(json.tools)) {
        return json;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting JSON from message:', error);
    return null;
  }
}

function createAffiliateLink(productName: string): string {
  const AFFILIATE_TAG = process.env.NEXT_PUBLIC_AFFILIATE_TAG || 'aiconstructio-20';
  const encodedName = encodeURIComponent(productName).replace(/%20/g, "+");
  return `https://www.amazon.com/s?k=${encodedName}&tag=${AFFILIATE_TAG}`;
}

function getFallbackRecommendations() {
  return {
    materials: [
      { name: 'Ceramic Tiles', affiliate_url: createAffiliateLink('Ceramic Tiles') },
      { name: 'Tile Adhesive', affiliate_url: createAffiliateLink('Tile Adhesive') },
      { name: 'Grout', affiliate_url: createAffiliateLink('Grout') },
      { name: 'Tile Spacers', affiliate_url: createAffiliateLink('Tile Spacers') },
      { name: 'Waterproofing Membrane', affiliate_url: createAffiliateLink('Waterproofing Membrane') }
    ],
    tools: [
      { name: 'Tile Cutter', affiliate_url: createAffiliateLink('Tile Cutter') },
      { name: 'Notched Trowel', affiliate_url: createAffiliateLink('Notched Trowel') },
      { name: 'Rubber Mallet', affiliate_url: createAffiliateLink('Rubber Mallet') },
      { name: 'Grout Float', affiliate_url: createAffiliateLink('Grout Float') },
      { name: 'Level', affiliate_url: createAffiliateLink('Level Tool') }
    ]
  };
}

function handleMockResponse(action: string, message: string) {
  switch (action) {
    case 'createThread': {
      const mockThreadId = 'mock-thread-' + Date.now();
      const mockResponse = getMockResponse(message);
      
      return NextResponse.json({ 
        success: true, 
        threadId: mockThreadId,
        message: mockResponse
      });
    }
    
    case 'sendMessage': {
      const mockResponse = getMockResponse(message);
      return NextResponse.json({ success: true, message: mockResponse });
    }
    
    case 'generateRecommendations': {
      return NextResponse.json({
        success: true,
        recommendations: getFallbackRecommendations()
      });
    }
    
    default:
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
  }
}

function getMockResponse(message: string) {
  // Convert to lowercase for easier matching
  const lowerMessage = message.toLowerCase();

  // Check for specific room mentions
  if (lowerMessage.includes('bathroom')) {
    return 'For a bathroom renovation, you\'ll want to consider waterproofing, proper ventilation, and moisture-resistant materials. What specific part of the bathroom are you working on?';
  } else if (lowerMessage.includes('kitchen')) {
    return 'Kitchen projects can range from simple updates to complete renovations. Are you focusing on cabinets, countertops, flooring, or something else?';
  } else if (lowerMessage.includes('bedroom')) {
    return 'Bedroom renovations can really improve your quality of life. Are you looking to install new flooring, add built-ins, update lighting, or something else?';
  } else if (lowerMessage.includes('living room')) {
    return 'Living room projects can transform your home\'s main gathering space. Are you interested in wall treatments, flooring updates, built-in shelving, or something else?';
  } else if (lowerMessage.includes('tile') || lowerMessage.includes('tiling')) {
    return 'Tiling projects require proper surface preparation, the right adhesives, and careful planning. What surface are you planning to tile?\n\n`json\n{\n  "materials": [\n    { "name": "Ceramic Tiles" },\n    { "name": "Tile Adhesive" },\n    { "name": "Grout" },\n    { "name": "Tile Spacers" }\n  ],\n  "tools": [\n    { "name": "Tile Cutter" },\n    { "name": "Notched Trowel" },\n    { "name": "Rubber Mallet" },\n    { "name": "Grout Float" }\n  ]\n}\n`';
  } else if (lowerMessage === 'l') {
    // Special case for the test input "L"
    return 'I\'m your DIY construction assistant. I can help with home improvement projects, material recommendations, and step-by-step instructions. What project are you working on? Try mentioning a specific room like "bathroom," "kitchen," "bedroom," or "living room."';
  } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return 'Hello! I\'m your DIY construction assistant. What type of home improvement project are you planning? I can provide advice on materials, tools, and techniques.';
  } else if (lowerMessage.includes('help')) {
    return 'I can help with various construction projects around your home. Just tell me what you\'re working on - like kitchen renovation, bathroom remodeling, flooring installation, or wall repairs. I\'ll provide advice on materials, tools, and step-by-step guidance.';
  } else if (lowerMessage.includes('cost') || lowerMessage.includes('budget') || lowerMessage.includes('price')) {
    return 'Construction project costs vary widely depending on materials, scope, and location. For accurate budgeting, I recommend getting quotes from local contractors and suppliers. Would you like some general cost-saving tips for your project?';
  } else {
    // Default response with a suggestion to be more specific
    return 'I\'m your DIY construction assistant. I can help with home improvement projects, material recommendations, and step-by-step instructions. Could you tell me more about your specific project? For example, which room are you working on?';
  }
}
