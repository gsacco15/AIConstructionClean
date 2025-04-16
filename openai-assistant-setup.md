# Setting Up Your OpenAI Assistant for AI Construction

This document provides instructions for setting up an OpenAI Assistant to work with the AI Construction application.

## Prerequisites

- An OpenAI account with API access
- Access to the OpenAI Assistants API

## Step 1: Create a New Assistant

1. Go to the [OpenAI platform](https://platform.openai.com/assistants)
2. Click "Create new assistant"
3. Give your assistant a name (e.g., "AI Construction Assistant")

## Step 2: Configure the Assistant

1. Select the model: `gpt-4-turbo` or the latest available model
2. Set the instructions to define the assistant's behavior. Use the following as a starting point:

```
You are an AI Construction Assistant that helps users with their DIY construction and renovation projects. Your primary role is to provide expert advice on construction methods, materials selection, tool recommendations, and step-by-step guidance.

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

Keep your responses concise, practical, and focused on helping the user complete their project successfully.
```

3. Enable Knowledge Retrieval: Toggle on if you want to allow the assistant to search for information online
4. Enable Code Interpreter: Toggle on if you want to allow the assistant to write and execute code (recommended for calculating measurements, etc.)

## Step 3: Get Your Assistant ID

1. After creating the assistant, you'll be taken to its details page
2. Copy the Assistant ID from the URL or from the assistant's settings
3. This ID will look something like `asst_abc123...`

## Step 4: Configure Your Environment Variables

1. Open the `.env.local` file in your project
2. Add your OpenAI API key to the `OPENAI_API_KEY` variable
3. Add your Assistant ID to the `OPENAI_ASSISTANT_ID` variable

```
OPENAI_API_KEY=your_api_key_here
OPENAI_ASSISTANT_ID=your_assistant_id_here
```

## Step 5: Testing Your Assistant

1. Start your application
2. Try asking construction-related questions, such as:
   - "I'm renovating my bathroom. What materials do I need?"
   - "What tools should I have for a kitchen remodel?"
   - "How do I install drywall?"
3. Verify that the assistant responds appropriately and provides recommendations when requested

## Troubleshooting

- If the assistant isn't responding correctly, check your API key and Assistant ID
- If recommendations aren't appearing, make sure your assistant's instructions include the JSON format requirements
- For local development without an OpenAI API key, set `NEXT_PUBLIC_MOCK_MODE=true` in your `.env.local` file 