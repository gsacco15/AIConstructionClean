# Netlify Environment Variables Setup

To ensure the OpenAI API works correctly in production, you need to set these environment variables in the Netlify dashboard:

## Required Environment Variables

1. **OPENAI_API_KEY** - Your OpenAI API key
   - Value: Use the key from your local .env file

2. **OPENAI_ASSISTANT_ID** - Your OpenAI Assistant ID
   - Value: Use the ID from your local .env file

3. **NEXT_PUBLIC_AFFILIATE_TAG** - Your Amazon affiliate tag
   - Value: `aiconstructio-20`

4. **NEXT_PUBLIC_MOCK_MODE** - Set to 'false' to use the real OpenAI API
   - Value: `false`

## How to Set Environment Variables in Netlify

1. Go to your Netlify dashboard
2. Select your site (aiconstruction)
3. Go to **Site settings**
4. In the left sidebar, click on **Environment variables**
5. Click **Add a variable**
6. Add each of the variables listed above with their respective values
7. Click **Save** after adding each variable

## After Setting Variables

After setting these variables, you need to trigger a new deployment:

1. Go to the **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**

This will ensure your site uses the real OpenAI API instead of mock data. 