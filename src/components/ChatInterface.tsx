"use client";

import { useState, useEffect, useRef } from "react";
import { ChatMessage, isGeneratingRecommendations, filterJsonFromMessage } from "@/lib/api";
import { Recommendations } from "@/utils/affiliateUtils";

interface ChatInterfaceProps {
  onRecommendationsGenerated?: (recommendations: Recommendations) => void;
  initialPrompt?: string;
  onStart?: (query: string) => void;
  hideMessages?: boolean;
  inputOnly?: boolean;
}

export default function ChatInterface({ 
  onRecommendationsGenerated,
  initialPrompt = "",
  onStart,
  hideMessages = false,
  inputOnly = false
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'You are a DIY construction assistant that provides helpful advice on construction projects, renovation tips, and material recommendations. Be concise and practical in your responses.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [useMockMode, setUseMockMode] = useState(typeof window !== 'undefined' && window.localStorage.getItem('useMockMode') === 'true');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0 && !loading) {
      // Add a delay to ensure the DOM has fully updated
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end' 
          });
        }
      }, 100);
    }
  }, [messages, loading]);

  // Process the conversation to check if we should generate recommendations
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && isGeneratingRecommendations(lastMessage.content)) {
      setGeneratingRecommendations(true);
      generateRecommendations();
    }
  }, [messages]);

  // Check for initial prompt from props or localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && !loading) {
      const storedPrompt = localStorage.getItem("initialPrompt");
      const promptToUse = initialPrompt || storedPrompt;
      
      if (promptToUse) {
        // Set the input value
        setInput(promptToUse);
        
        // Submit the form programmatically after a delay
        setTimeout(() => {
          const userMessage: ChatMessage = { role: 'user', content: promptToUse };
          setMessages(prev => [...prev, userMessage]);
          setInput('');
          setLoading(true);
          
          // Call the API to get a response
          fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: threadId ? 'sendMessage' : 'createThread',
              threadId,
              message: promptToUse,
              messages: [...messages, userMessage],
            }),
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`API responded with status: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            // If this was a thread creation, save the threadId
            if (data.threadId && !threadId) {
              setThreadId(data.threadId);
            }
            
            // Add the assistant's response to the chat
            if (data.message) {
              // Check if message contains JSON and extract recommendations
              const jsonMatch = data.message.match(/\{[\s\S]*"materials"[\s\S]*"tools"[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const jsonData = JSON.parse(jsonMatch[0]);
                  if (jsonData.materials && jsonData.tools && 
                      Array.isArray(jsonData.materials) && Array.isArray(jsonData.tools)) {
                    console.log('Found recommendations in message:', jsonData);
                    
                    // If we have recommendations and a callback to handle them
                    if (onRecommendationsGenerated) {
                      onRecommendationsGenerated(jsonData);
                    }
                  }
                } catch (e) {
                  console.error('Error parsing JSON from message:', e);
                }
              }
              
              // Filter the JSON from the message for display
              const filteredMessage = filterJsonFromMessage(data.message);
              
              setMessages(prev => [...prev, { role: 'assistant', content: filteredMessage }]);
            } else {
              throw new Error('No message in response');
            }
          })
          .catch(error => {
            console.error('Error sending initial message:', error);
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: 'Sorry, I encountered an error processing your initial request. Please try again.' 
            }]);
          })
          .finally(() => {
            setLoading(false);
            // Clear the initialPrompt from localStorage
            localStorage.removeItem("initialPrompt");
          });
        }, 1000);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
    };
    
    // Add user message to UI immediately
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setLoading(true);
    
    // If onStart expects a parameter, use an empty string or some default value
    // If it doesn't expect parameters, just call it without arguments
    if (onStart && messages.length <= 1) {
      if (onStart.length > 0) {
        onStart(userMessage.content);
      } else {
        onStart();
      }
    }
    
    try {
      console.log('Sending message to thread:', threadId || 'No thread ID');
      
      // If we don't have a thread ID, create one
      if (!threadId) {
        console.log('No thread ID available, creating a new thread');
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: threadId ? 'sendMessage' : 'createThread',
          threadId,
          message: userMessage.content,
        }),
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response data:', data);
      
      if (data.inProgress && data.runId && threadId) {
        // Add a typing indicator message
        const typingMessage: ChatMessage = {
          role: 'assistant',
          content: '...',
          isTyping: true
        };
        setMessages(prevMessages => [...prevMessages, typingMessage]);
        
        // Wait a bit and then try to get the response again
        setTimeout(() => {
          pollForCompletion(threadId, data.runId, 5);
        }, 2000);
        
        return;
      }
      
      if (threadId === null && data.threadId) {
        setThreadId(data.threadId);
        console.log('Thread created:', data.threadId);
      }
      
      if (data.message) {
        console.log('Assistant response:', data.message);
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.message,
        };
        
        // If there's a typing message, replace it
        if (messages.some(m => m.isTyping)) {
          setMessages(prevMessages => [
            ...prevMessages.filter(m => !m.isTyping),
            assistantMessage
          ]);
        } else {
          setMessages(prevMessages => [...prevMessages, assistantMessage]);
        }
        
        // Check if the response contains recommendations
        if (!isGeneratingRecommendations) {
          const jsonData = filterJsonFromMessage(data.message);
          if (jsonData && typeof jsonData === 'object' && 'materials' in jsonData && 'tools' in jsonData) {
            setGeneratingRecommendations(true);
            
            // Generate recommendations if we have onRecommendationsGenerated handler
            if (onRecommendationsGenerated) {
              generateRecommendations(messages);
            }
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: 'system',
        content: `There was an error communicating with the assistant. Please try again. (${error})`
      };
      
      // Remove typing indicator if any
      setMessages(prevMessages => [
        ...prevMessages.filter(m => !m.isTyping),
        errorMessage
      ]);
      
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      // Give a slight delay for better UX
      setTimeout(async () => {
        // Add a message to show we're generating recommendations
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'm analyzing your project details to create personalized recommendations..." 
        }]);
        
        // Call the API route to generate recommendations
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'generateRecommendations',
            threadId,
            messages,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.recommendations && onRecommendationsGenerated) {
          // Call the callback with the recommendations
          onRecommendationsGenerated(data.recommendations);
          
          // Add a message to inform the user that recommendations are ready
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Your personalized recommendations are ready! You can view them in the recommendations panel." 
          }]);
        } else if (!data.recommendations) {
          throw new Error('No recommendations in response');
        }
        
        setGeneratingRecommendations(false);
      }, 1500);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      setGeneratingRecommendations(false);
      
      // Inform the user about the error
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I couldn't generate recommendations at this time. Please try again." 
      }]);
    }
  };

  // Toggle mock mode
  const toggleMockMode = () => {
    const newValue = !useMockMode;
    setUseMockMode(newValue);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('useMockMode', String(newValue));
    }
  };

  // Add a new function to poll for completion
  async function pollForCompletion(threadId: string, runId: string, maxAttempts: number) {
    let attempts = 0;
    
    const checkCompletion = async () => {
      attempts++;
      console.log(`Polling for completion (attempt ${attempts}/${maxAttempts})...`);
      
      try {
        const response = await fetch('/api/chat/poll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            threadId,
            runId
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Polling failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.completed) {
          // Run completed, update the typing message
          if (data.message) {
            console.log('Assistant response received from polling:', data.message);
            
            const assistantMessage: ChatMessage = {
              role: 'assistant',
              content: data.message,
            };
            
            // Replace typing indicator
            setMessages(prevMessages => [
              ...prevMessages.filter(m => !m.isTyping),
              assistantMessage
            ]);
            
            setLoading(false);
            return true;
          }
        } else if (attempts < maxAttempts) {
          // Not completed yet, try again after a delay
          setTimeout(checkCompletion, 2000);
          return false;
        } else {
          // Max attempts reached
          throw new Error('Max polling attempts reached');
        }
      } catch (error) {
        console.error('Error polling for completion:', error);
        
        // Replace typing indicator with error message
        const errorMessage: ChatMessage = {
          role: 'system',
          content: 'The assistant is taking too long to respond. Please try sending your message again.'
        };
        
        setMessages(prevMessages => [
          ...prevMessages.filter(m => !m.isTyping),
          errorMessage
        ]);
        
        setLoading(false);
        return false;
      }
    };
    
    await checkCompletion();
  }

  return (
    <div className={`flex flex-col ${!inputOnly ? 'h-[500px]' : ''}`}>
      {!hideMessages && !inputOnly && (
        <div className="flex-1 overflow-y-auto p-4 pb-6 space-y-4 custom-scrollbar scroll-smooth overscroll-contain">
          {messages.filter(m => m.role !== 'system').map((message, index) => (
            <div 
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user' 
                    ? 'bg-[rgba(151,71,255,1)] text-white rounded-tr-none' 
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 rounded-lg rounded-tl-none max-w-[80%] p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          {generatingRecommendations && (
            <div className="flex justify-center my-4">
              <div className="bg-[rgba(151,71,255,0.1)] text-[rgba(151,71,255,1)] rounded-full px-4 py-2">
                Generating your recommendations...
              </div>
            </div>
          )}
          
          {/* Development mode toggle for mock mode */}
          {process.env.NODE_ENV === 'development' && (
            <div className="fixed bottom-20 right-4 bg-white p-2 rounded-lg shadow-md z-50">
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={useMockMode} 
                  onChange={toggleMockMode}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span>Mock Mode {useMockMode ? 'ON' : 'OFF'}</span>
              </label>
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-4">
        <div className="bg-[rgba(140,140,140,0.24)] border flex items-stretch gap-5 flex-wrap justify-between px-4 py-[7px] rounded-[39px] border-[rgba(140,140,140,0.1)] border-solid">
          <div className="flex items-stretch text-xl text-[rgba(66,66,66,1)] font-normal tracking-[-1.4px] flex-grow">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || generatingRecommendations}
              placeholder="Describe your construction project..."
              className="w-full my-auto bg-transparent outline-none overflow-visible min-w-[250px] pl-4"
              autoComplete="off"
            />
          </div>
          <div className="flex items-stretch">
            <button 
              type="submit" 
              disabled={loading || generatingRecommendations} 
              aria-label="Send message"
              className="aspect-[1] w-16 bg-[rgba(151,71,255,1)] shrink-0 h-16 rounded-[32px] flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 