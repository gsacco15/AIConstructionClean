// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// The Assistant ID to use
let ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || '';

// Function to get or create an assistant
async function getOrCreateAssistant() {
  // If we already have a valid ID stored in memory, return it
  if (ASSISTANT_ID && ASSISTANT_ID !== 'asst_Vyg9xBn8t8QZtdYwdJRTZAr1') {
    try {
      const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
      console.log('Using existing assistant:', assistant.id);
      return assistant.id;
    } catch (error) {
      console.log('Stored assistant ID invalid, creating new one');
      // Continue to create a new assistant below
    }
  }

  console.log('Creating a new assistant...');
  
  // Create a new assistant
  try {
    const assistant = await openai.beta.assistants.create({
      name: "AI Construction Assistant",
      description: "A helpful AI assistant for construction and DIY projects",
      instructions: `You are an AI Construction Assistant that helps users with their DIY construction and renovation projects. Your primary role is to provide expert advice on construction methods, materials selection, tool recommendations, and step-by-step guidance.

KEY RESPONSIBILITIES:
1. Provide clear, practical advice for home renovation and construction projects
2. Recommend specific tools and materials appropriate for the user's project
3. Explain construction techniques and best practices
4. Answer questions about building codes and safety considerations
5. Help troubleshoot common construction problems

WHEN PROVIDING RECOMMENDATIONS:
When asked directly for recommendations or when a project description clearly requires specific materials and tools, provide your recommendations in both prose AND in a structured JSON format that includes materials and tools arrays. This format will be used by the application to display a shopping list to the user.

Use this JSON format:
{
  "materials": [
    { "name": "Material 1" },
    { "name": "Material 2" }
  ],
  "tools": [
    { "name": "Tool 1" },
    { "name": "Tool 2" }
  ]
}

Always tailor your recommendations to the specific project, considering factors like skill level, budget, and project scope. Be specific with your material and tool recommendations (e.g., "1/2-inch PVC pipe" rather than just "PVC pipe").

Keep your responses concise, practical, and focused on helping the user complete their project successfully.`,
      model: "gpt-4o",
    });
    
    console.log('Created new assistant:', assistant.id);
    
    // Update the assistant ID for future use
    ASSISTANT_ID = assistant.id;
    
    return assistant.id;
  } catch (error) {
    console.error('Failed to create assistant:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  // Add debug logs to help troubleshoot issues
  console.log('API route called with OpenAI API Key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);
  console.log('API route called with Assistant ID:', process.env.OPENAI_ASSISTANT_ID);
  
  try {
    const body = await request.json();
    const { action, threadId, message } = body;
    
    console.log('API request action:', action);
    console.log('API request threadId:', threadId);
    
    // Verify the OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is missing');
      return NextResponse.json(
        { success: false, error: 'OpenAI API key is missing' },
        { status: 500 }
      );
    }
    
    // Get or create an assistant
    try {
      console.log('Getting or creating assistant...');
      ASSISTANT_ID = await getOrCreateAssistant();
      console.log('Using assistant ID:', ASSISTANT_ID);
    } catch (assistantError) {
      console.error('Failed to get or create assistant:', assistantError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to get or create assistant', 
          details: assistantError instanceof Error ? assistantError.message : String(assistantError)
        },
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
  console.log('Sending message to thread:', threadId, 'Message:', message);
  
  try {
    // Add the user's message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });
    console.log('Message added to thread');
    
    // Run the assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
    });
    console.log('Run created:', run.id);
    
    // Wait for completion
    await waitForRunCompletion(threadId, run.id);
    console.log('Run completed');
    
    // Get the response
    const response = await getLatestAssistantMessage(threadId);
    console.log('Got response from assistant');
    
    return NextResponse.json({ success: true, message: response });
  } catch (error) {
    console.error('Error in handleSendMessage:', error);
    throw error;
  }
}

async function handleGenerateRecommendations(threadId: string) {
  console.log('Generating recommendations for thread:', threadId);
  
  try {
    // Run the assistant with a specific instruction to generate recommendations in JSON format
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
      instructions: "Based on the conversation history, generate specific material and tool recommendations in JSON format. Use this format: ```json\n{\n  \"materials\": [\n    { \"name\": \"Item Name\" },\n    { \"name\": \"Item Name\" }\n  ],\n  \"tools\": [\n    { \"name\": \"Tool Name\" },\n    { \"name\": \"Tool Name\" }\n  ]\n}\n```"
    });
    console.log('Run created:', run.id);
    
    // Wait for completion
    await waitForRunCompletion(threadId, run.id);
    console.log('Run completed');
    
    // Get the response
    const response = await getLatestAssistantMessage(threadId);
    console.log('Got JSON response from assistant');
    
    // Extract JSON data
    const jsonData = extractJsonFromMessage(response);
    console.log('Extracted JSON data:', jsonData);
    
    if (jsonData) {
      // Process the recommendations to add affiliate links if needed
      const processedRecommendations = {
        materials: jsonData.materials.map((material: { name: string }) => ({
          name: material.name,
          affiliateLink: createAffiliateLink(material.name)
        })),
        tools: jsonData.tools.map((tool: { name: string }) => ({
          name: tool.name,
          affiliateLink: createAffiliateLink(tool.name)
        }))
      };
      
      return NextResponse.json({
        success: true,
        recommendations: processedRecommendations
      });
    } else {
      console.error('Failed to parse JSON recommendations from response');
      return NextResponse.json({
        success: false,
        error: 'Failed to generate recommendations',
        recommendations: getFallbackRecommendations()
      });
    }
  } catch (error) {
    console.error('Error in handleGenerateRecommendations:', error);
    console.log('Falling back to default recommendations');
    return NextResponse.json({
      success: false,
      error: String(error),
      recommendations: getFallbackRecommendations()
    });
  }
}

// Helper functions

async function waitForRunCompletion(threadId: string, runId: string) {
  let run;
  
  // Poll for status every 1 second
  do {
    run = await openai.beta.threads.runs.retrieve(threadId, runId);
    
    console.log('Run status:', run.status);
    
    if (run.status === 'requires_action') {
      // Handle if function calling is required (not used in this basic example)
      console.log('Run requires action:', run.required_action);
      
      // In a more complex scenario, we would handle tool calls here
      break;
    }
    
    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      console.error('Run failed with status:', run.status);
      if (run.last_error) {
        console.error('Error:', run.last_error);
      }
      break;
    }
    
    if (run.status !== 'completed') {
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (run.status !== 'completed');
  
  return run;
}

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

// Helper function to extract JSON data from a message
function extractJsonFromMessage(message: string): { materials: Array<{ name: string }>, tools: Array<{ name: string }> } | null {
  try {
    // Try to find JSON code block in the response
    const jsonMatch = message.match(/```(?:json)?([\s\S]+?)```/);
    
    if (jsonMatch && jsonMatch[1]) {
      // Parse the JSON part
      const jsonStr = jsonMatch[1].trim();
      const jsonData = JSON.parse(jsonStr);
      
      // Validate basic structure
      if (jsonData && jsonData.materials && jsonData.tools &&
          Array.isArray(jsonData.materials) && Array.isArray(jsonData.tools)) {
        return jsonData;
      }
    }
    
    // If no JSON block found or invalid structure, check if entire message is JSON
    const jsonData = JSON.parse(message);
    if (jsonData && jsonData.materials && jsonData.tools &&
        Array.isArray(jsonData.materials) && Array.isArray(jsonData.tools)) {
      return jsonData;
    }
  } catch (error) {
    console.error('Error parsing JSON from message:', error);
  }
  
  return null;
}

function createAffiliateLink(itemName: string): string {
  const affiliateTag = process.env.NEXT_PUBLIC_AFFILIATE_TAG || 'diyassistant-20';
  const searchQuery = encodeURIComponent(itemName);
  return `https://www.amazon.com/s?k=${searchQuery}&tag=${affiliateTag}`;
}

function getFallbackRecommendations() {
  return {
    materials: [
      { name: "Drywall Sheets", affiliateLink: createAffiliateLink("Drywall Sheets") },
      { name: "Wood Studs", affiliateLink: createAffiliateLink("Wood Studs") },
      { name: "Joint Compound", affiliateLink: createAffiliateLink("Joint Compound") },
      { name: "Primer", affiliateLink: createAffiliateLink("Wall Primer") },
      { name: "Paint", affiliateLink: createAffiliateLink("Interior Wall Paint") }
    ],
    tools: [
      { name: "Hammer", affiliateLink: createAffiliateLink("Hammer") },
      { name: "Screwdriver Set", affiliateLink: createAffiliateLink("Screwdriver Set") },
      { name: "Measuring Tape", affiliateLink: createAffiliateLink("Measuring Tape") },
      { name: "Utility Knife", affiliateLink: createAffiliateLink("Utility Knife") },
      { name: "Level", affiliateLink: createAffiliateLink("Level Tool") }
    ]
  };
}
