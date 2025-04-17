"use client";

import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import FeatureGrid from "@/components/landing/FeatureGrid";
import ChatInput from "@/components/landing/ChatInput";
import { ProductItem, Recommendations } from "@/utils/affiliateUtils";
import { ChatMessage, filterJsonFromMessage } from "@/lib/api";
import { getItemIcon } from "@/utils/materialIcons";

export default function HomePage() {
  const [showContent, setShowContent] = useState(true);
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [selectedItems, setSelectedItems] = useState<ProductItem[]>([]);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [activeModule, setActiveModule] = useState<'chat' | 'recommendations' | 'shoppingList'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const shoppingListRef = useRef<HTMLDivElement>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [showInput, setShowInput] = useState(true);
  
  // Scroll to bottom of chat when messages change (disabled)
  useEffect(() => {
    // Auto-scrolling disabled as requested
  }, [messages]);

  // Handle the transition animations
  useEffect(() => {
    if (!showContent) {
      // Only apply fade-in after content has faded out
      setTimeout(() => {
        setFadeIn(true);
      }, 600); // Start fade-in after content fade-out is mostly complete
    } else {
      setFadeIn(false);
    }
  }, [showContent]);

  // Process the conversation to check for JSON recommendations
  useEffect(() => {
    if (messages.length === 0 || !threadId) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;
    
    // Check if the last message content might indicate recommendations
    const hasRecommendationIndicators = 
      lastMessage.content.toLowerCase().includes('recommend') || 
      lastMessage.content.toLowerCase().includes('suggest') || 
      lastMessage.content.toLowerCase().includes('materials') || 
      lastMessage.content.toLowerCase().includes('tools') ||
      lastMessage.content.toLowerCase().includes('items');
    
    // If the message contains recommendation indicators and we don't have recommendations yet
    if (hasRecommendationIndicators && !recommendations && !generatingRecommendations) {
      // Generate recommendations using the API
      setGeneratingRecommendations(true);
      
      (async () => {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'generateRecommendations',
              threadId,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.recommendations) {
            console.log('Recommendations received:', data.recommendations);
            
            // Update recommendations data
            setRecommendations(data.recommendations);
            setShowRecommendations(true);
            
            // Auto-scroll to recommendations section
            setTimeout(() => {
              const recommendationsTitle = document.getElementById('recommendations-title');
              if (recommendationsTitle) {
                recommendationsTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 500);
          }
        } catch (error) {
          console.error('Error generating recommendations:', error);
        } finally {
          setGeneratingRecommendations(false);
        }
      })();
    }
  }, [messages, threadId, recommendations, generatingRecommendations]);

  const handleChatStart = async (query: string) => {
    // Start the fade-out effect first
    setFadeOut(true);
    
    // Give time for the fade-out animation
    setTimeout(async () => {
      // Switch to chat view after fade out is complete
      setShowContent(false);
      setFadeOut(false); // Reset fade-out state
      setFadeIn(false); // Will be set to true by the useEffect
      setLoading(true);
      // Ensure input is visible in chat mode
      setShowInput(true);
      setActiveModule('chat');
      
      // Add user message
      const updatedMessages = [...messages, { role: 'user', content: query }];
      setMessages(updatedMessages);
      
      try {
        console.log('Creating thread with query:', query);
        
        // Create a thread and send the first message
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'createThread',
            message: query
          }),
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error('API error:', errorData);
          throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API response data:', data);
        
        // Save thread ID
        if (data.threadId) {
          console.log('Thread created:', data.threadId);
          setThreadId(data.threadId);
        }
        
        // Add assistant response
        if (data.message) {
          console.log('Assistant response:', data.message);
          
          // Check if message contains JSON for recommendations
          const jsonMatch = data.message.match(/\{[\s\S]*"materials"[\s\S]*"tools"[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const jsonData = JSON.parse(jsonMatch[0]);
              if (jsonData.materials && jsonData.tools && 
                  Array.isArray(jsonData.materials) && Array.isArray(jsonData.tools)) {
                console.log('Found recommendations in response:', jsonData);
                
                // Update message first so it appears immediately
                const filteredMessage = filterJsonFromMessage(data.message);
                setMessages([...updatedMessages, { role: 'assistant', content: filteredMessage }]);
                
                // Then update recommendations data
                setRecommendations(jsonData);
                setShowRecommendations(true);
                
                // Auto-scroll to recommendations section after a short delay
                setTimeout(() => {
                  const recommendationsTitle = document.getElementById('recommendations-title');
                  if (recommendationsTitle) {
                    recommendationsTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 500);
                
                // Exit early since we've handled everything
                return;
              }
            } catch (e) {
              console.error('Error parsing JSON from message:', e);
            }
          }
          
          // Normal message processing for non-JSON responses
          const filteredMessage = filterJsonFromMessage(data.message);
          setMessages([...updatedMessages, { role: 'assistant', content: filteredMessage }]);
        } else {
          console.warn('No message in response');
          setMessages([
            ...updatedMessages, 
            { role: 'assistant', content: 'I received your request but have no immediate response. How can I help with your construction project?' }
          ]);
        }
      } catch (error) {
        console.error('Error starting chat:', error);
        setMessages([
          ...updatedMessages, 
          { role: 'assistant', content: 'Sorry, I encountered an error connecting to the AI service. Please try again or check your connection.' }
        ]);
      } finally {
        setLoading(false);
      }
    }, 500); // Wait for the fade-out animation
  };
  
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || loading) return;
    
    // Add user message
    const updatedMessages = [...messages, { role: 'user', content: message }];
    setMessages(updatedMessages);
    setLoading(true);
    
    try {
      console.log('Sending message to thread:', threadId || 'No thread ID');
      
      if (!threadId) {
        console.warn('No thread ID available, creating a new thread');
        // If no thread ID, create a new thread with this message
        await handleChatStart(message);
        return;
      }
      
      // Send message to existing thread
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sendMessage',
          threadId,
          message,
        }),
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('API error:', errorData);
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API response data:', data);
      
      // Add assistant response
      if (data.message) {
        console.log('Assistant response:', data.message);
        
        // Check if message contains JSON for recommendations
        const jsonMatch = data.message.match(/\{[\s\S]*"materials"[\s\S]*"tools"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const jsonData = JSON.parse(jsonMatch[0]);
            if (jsonData.materials && jsonData.tools && 
                Array.isArray(jsonData.materials) && Array.isArray(jsonData.tools)) {
              console.log('Found recommendations in response:', jsonData);
              
              // Update message first so it appears immediately
              const filteredMessage = filterJsonFromMessage(data.message);
              setMessages([...updatedMessages, { role: 'assistant', content: filteredMessage }]);
              
              // Then update recommendations data
              setRecommendations(jsonData);
              setShowRecommendations(true);
              
              // Auto-scroll to recommendations section after a short delay
              setTimeout(() => {
                const recommendationsTitle = document.getElementById('recommendations-title');
                if (recommendationsTitle) {
                  recommendationsTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 500);
              
              // Exit early since we've handled everything
              return;
            }
          } catch (e) {
            console.error('Error parsing JSON from message:', e);
          }
        }
        
        // Normal message processing for non-JSON responses
        const filteredMessage = filterJsonFromMessage(data.message);
        setMessages([...updatedMessages, { role: 'assistant', content: filteredMessage }]);
      } else {
        console.warn('No message in response');
        setMessages([
          ...updatedMessages, 
          { role: 'assistant', content: 'I received your message but have no immediate response. Is there anything else you\'d like to know?' }
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([
        ...updatedMessages, 
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again or check your connection.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSelectItem = (item: ProductItem) => {
    console.log("Selected item:", item);
    setSelectedItems(prev => {
      // Check if item is already selected
      const exists = prev.some(i => i.name === item.name);
      if (exists) {
        // Remove if already selected
        return prev.filter(i => i.name !== item.name);
      } else {
        // Add if not selected
        return [...prev, item];
      }
    });
  };

  const toggleAllItems = (items: ProductItem[], add: boolean) => {
    if (add) {
      // Add all items that aren't already selected
      setSelectedItems(prev => {
        const newItems = [...prev];
        items.forEach(item => {
          if (!newItems.some(i => i.name === item.name)) {
            newItems.push(item);
          }
        });
        return newItems;
      });
    } else {
      // Remove all items of this type
      setSelectedItems(prev => 
        prev.filter(item => !items.some(i => i.name === item.name))
      );
    }
  };

  const toggleShoppingList = () => {
    setShowShoppingList(prev => !prev);
  };

  const toggleRecommendations = () => {
    setShowRecommendations(prev => !prev);
  };

  const handleCreateShoppingList = () => {
    setShowShoppingList(true);
    setActiveModule('shoppingList');
    setShowInput(false);
    
    // Auto-scroll to shopping list section after a short delay
    setTimeout(() => {
      const shoppingListTitle = shoppingListRef.current?.querySelector('h2');
      if (shoppingListTitle) {
        shoppingListTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  const handleBackToChat = () => {
    setShowShoppingList(false);
    setActiveModule('chat');
    setShowInput(true);
  };

  // Handle the email capture
  const onEmailCapture = () => {
    // In a real application, this would save the email to a database
    alert("Feature not implemented in demo version");
  };

  // Show input bar when scrolling to top, hide when scrolled down
  const handleScroll = () => {
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    
    // Only hide input when not in chat mode
    if (scrollPosition < 200 || activeModule === 'chat') {
      setShowInput(true);
    } 
    // Hide input when scrolled further down and not in chat mode
    else {
      setShowInput(false);
    }
  };

  // Add scroll event listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update scrollToChat function to scroll to the top of the page
  const scrollToChat = () => {
    setActiveModule('chat');
    setShowInput(true);
    // Auto-scroll to top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Update scrollToRecommendations function to scroll to recommendations section
  const scrollToRecommendations = () => {
    setActiveModule('recommendations');
    setShowInput(false);
    // Auto-scroll to recommendations section
    setTimeout(() => {
      const recommendationsTitle = document.getElementById('recommendations-title');
      if (recommendationsTitle) {
        recommendationsTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  };

  // Update scrollToShoppingList with no scrolling
  const scrollToShoppingList = () => {
    setActiveModule('shoppingList');
    setShowInput(false);
    // Auto-scrolling removed
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900">
      <Header />
      
      {/* Fixed background gradients that stay in place regardless of content */}
      <div className="fixed w-[250px] md:w-[350px] h-[250px] opacity-20 transform -rotate-[20deg] bottom-[50px] right-0 md:right-[10%] pointer-events-none overflow-hidden" style={{zIndex: -5}}>
        <div className="absolute w-full h-full rounded-full bg-gradient-to-b from-transparent to-[#9747FF] blur-[100px]"></div>
      </div>
      
      <div className="fixed w-[200px] md:w-[300px] h-[200px] opacity-20 transform rotate-[30deg] bottom-[20px] left-0 md:left-[20%] pointer-events-none overflow-hidden" style={{zIndex: -5}}>
        <div className="absolute w-full h-full bg-gradient-to-b from-[rgba(0,100,255,0.00)] to-[rgba(151,71,255,0.6)] blur-[100px]"></div>
      </div>
      
      {/* Combined layout with conditional content */}
      <div className="container mx-auto px-4">
        {/* Landing content with fade-out effect */}
        {showContent && (
          <div className={`transition-opacity duration-500 ease-in-out ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
            <Hero />
            <div className="py-4">
              <FeatureGrid />
            </div>
          </div>
        )}
        
        {/* Main content area with all modules */}
        {!showContent && (
          <div className="space-y-16 pb-32">
            {/* Chat Module */}
            <div 
              ref={chatRef} 
              className={`transition-opacity duration-500 ease-in-out pt-6 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
            >
              {/* Chat messages container */}
              <div className={`h-[500px] overflow-y-auto px-4 mb-4 pb-[80px] transition-all duration-300 ${activeModule === 'chat' ? 'opacity-100' : 'opacity-70'}`}>
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 font-['Inter']">
                    <p>Ask a question to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg, index) => (
                      <div 
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === 'user' 
                              ? 'bg-[rgba(151,71,255,1)] text-white rounded-br-none' 
                              : 'bg-gray-100 text-gray-800 rounded-bl-none'
                          }`}
                        >
                          <div className="whitespace-pre-wrap font-['Inter']">{msg.content}</div>
                        </div>
                      </div>
                    ))}
                    
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-800 rounded-lg rounded-bl-none max-w-[80%] p-3">
                          <div className="flex space-x-2">
                            <div className="w-2 h-2 bg-[rgba(151,71,255,0.6)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-[rgba(151,71,255,0.6)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-[rgba(151,71,255,0.6)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Recommendations generation indicator */}
                    {generatingRecommendations && (
                      <div className="flex justify-center my-4">
                        <div className="bg-[rgba(151,71,255,0.1)] text-[rgba(151,71,255,1)] rounded-full px-4 py-2 font-['Inter']">
                          Generating your recommendations...
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>
            
            {/* Recommendations Module */}
            {recommendations && (
              <div 
                ref={recommendationsRef} 
                className="pt-48"
              >
                <div className="mx-auto max-w-3xl">
                  <div className="mb-8">
                    <h2 id="recommendations-title" className="text-xl font-semibold font-['Inter'] flex items-center text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[rgba(151,71,255,1)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Recommended Items
                    </h2>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6">
                      <p className="text-sm text-gray-600 mb-6 font-['Inter']">
                        Based on your project, we recommend the following materials and tools. 
                        Select items you're interested in to create a shopping list.
                      </p>
                      
                      {/* Materials */}
                      <div className="mb-8">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-800 mb-4 pb-1 border-b border-[rgba(151,71,255,0.1)] flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[rgba(151,71,255,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            Materials
                          </h3>
                          <div className="flex space-x-2 mb-4">
                            {selectedItems.some(item => recommendations?.materials.some(m => m.name === item.name)) ? (
                              <button
                                onClick={() => toggleAllItems(recommendations?.materials || [], false)}
                                className="text-sm px-2 py-1 border border-[rgba(151,71,255,0.3)] text-[rgba(151,71,255,1)] rounded hover:bg-[rgba(151,71,255,0.05)]"
                              >
                                Remove All
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleAllItems(recommendations?.materials || [], true)}
                                className="text-sm px-2 py-1 border border-[rgba(151,71,255,0.3)] text-[rgba(151,71,255,1)] rounded hover:bg-[rgba(151,71,255,0.05)]"
                              >
                                Add All
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {recommendations.materials.map((item, idx) => (
                            <div 
                              key={idx}
                              className={`
                                p-3 rounded-lg border flex items-center gap-2 cursor-pointer transition-all duration-200
                                ${selectedItems.some(i => i.name === item.name) 
                                  ? 'bg-[rgba(151,71,255,0.1)] border-[rgba(151,71,255,0.3)] shadow-sm' 
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                                }
                              `}
                              onClick={() => onSelectItem(item)}
                            >
                              <div className="text-gray-600 bg-gray-100 p-2 rounded-full">
                                {getItemIcon(item.name, true, "h-5 w-5")}
                              </div>
                              <span className="text-sm font-medium">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Tools */}
                      <div className="mb-8">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium text-gray-800 mb-4 pb-1 border-b border-[rgba(151,71,255,0.1)] flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[rgba(151,71,255,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Tools
                          </h3>
                          <div className="flex space-x-2 mb-4">
                            {selectedItems.some(item => recommendations?.tools.some(t => t.name === item.name)) ? (
                              <button
                                onClick={() => toggleAllItems(recommendations?.tools || [], false)}
                                className="text-sm px-2 py-1 border border-[rgba(151,71,255,0.3)] text-[rgba(151,71,255,1)] rounded hover:bg-[rgba(151,71,255,0.05)]"
                              >
                                Remove All
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleAllItems(recommendations?.tools || [], true)}
                                className="text-sm px-2 py-1 border border-[rgba(151,71,255,0.3)] text-[rgba(151,71,255,1)] rounded hover:bg-[rgba(151,71,255,0.05)]"
                              >
                                Add All
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {recommendations.tools.map((item, idx) => (
                            <div 
                              key={idx}
                              className={`
                                p-3 rounded-lg border flex items-center gap-2 cursor-pointer transition-all duration-200
                                ${selectedItems.some(i => i.name === item.name) 
                                  ? 'bg-[rgba(151,71,255,0.1)] border-[rgba(151,71,255,0.3)] shadow-sm' 
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                                }
                              `}
                              onClick={() => onSelectItem(item)}
                            >
                              <div className="text-gray-600 bg-gray-100 p-2 rounded-full">
                                {getItemIcon(item.name, false, "h-5 w-5")}
                              </div>
                              <span className="text-sm font-medium">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-4 border-t border-gray-100">
                      <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="text-sm text-gray-600 font-['Inter']">
                          {selectedItems.length > 0 ? (
                            <span>{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected</span>
                          ) : (
                            <span>Select items to add to your shopping list</span>
                          )}
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-2 md:gap-3 w-full md:w-auto mt-4 md:mt-0">
                          <button
                            onClick={() => scrollToChat()}
                            className="px-3 py-2 md:px-4 md:py-2 border border-[rgba(151,71,255,0.3)] text-[rgba(151,71,255,1)] rounded-lg hover:bg-[rgba(151,71,255,0.05)] transition-colors text-sm md:text-base w-full md:w-auto"
                          >
                            Return to Chat
                          </button>
                          <button
                            onClick={handleCreateShoppingList}
                            disabled={selectedItems.length === 0}
                            className={`px-3 py-2 md:px-4 md:py-2 rounded-lg flex items-center justify-center md:justify-start gap-2 shadow-sm text-sm md:text-base w-full md:w-auto ${
                              selectedItems.length > 0 
                                ? 'bg-[rgba(151,71,255,1)] text-white hover:bg-[rgba(151,71,255,0.9)]' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            } transition-colors`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Create Shopping List
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Shopping List Module */}
            {showShoppingList && (
              <div 
                ref={shoppingListRef} 
                className={`pt-16 transition-opacity duration-500 ${activeModule === 'shoppingList' ? 'opacity-100' : 'opacity-100'}`}
              >
                <div className="mx-auto max-w-3xl">
                  <div className="mb-8 flex justify-between items-center">
                    <h2 className="text-xl font-semibold font-['Inter'] flex items-center text-gray-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-[rgba(151,71,255,1)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Your Shopping List
                    </h2>
                    <button 
                      onClick={() => scrollToRecommendations()}
                      className="px-3 py-2 border border-[rgba(151,71,255,0.3)] text-[rgba(151,71,255,1)] rounded-lg hover:bg-[rgba(151,71,255,0.05)] transition-colors text-sm"
                    >
                      Back to Recommendations
                    </button>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6">
                      <div className="flex-1 overflow-y-auto">
                        {/* Materials */}
                        {selectedItems.filter(item => recommendations?.materials.some(m => m.name === item.name)).length > 0 && (
                          <div className="mb-8">
                            <h3 className="font-medium text-gray-800 mb-4 pb-1 border-b border-[rgba(151,71,255,0.1)] flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[rgba(151,71,255,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                              Materials
                            </h3>
                            <ul className="space-y-3">
                              {selectedItems
                                .filter(item => recommendations?.materials.some(m => m.name === item.name))
                                .map((item, idx) => (
                                  <li key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 mb-3 sm:mb-0">
                                      <div className="text-gray-600 bg-gray-100 p-2 rounded-full min-w-[40px] flex justify-center">
                                        {getItemIcon(item.name, true, "h-6 w-6")}
                                      </div>
                                      <span className="font-medium break-words">{item.name}</span>
                                    </div>
                                    <a 
                                      href={item.affiliate_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-[rgba(151,71,255,1)] hover:text-[rgba(151,71,255,0.8)] flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-lg border border-[rgba(151,71,255,0.3)] hover:bg-[rgba(151,71,255,0.05)] transition-colors w-full sm:w-auto text-sm md:text-base"
                                    >
                                      <span>Buy on Amazon</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Tools */}
                        {selectedItems.filter(item => recommendations?.tools.some(t => t.name === item.name)).length > 0 && (
                          <div>
                            <h3 className="font-medium text-gray-800 mb-4 pb-1 border-b border-[rgba(151,71,255,0.1)] flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[rgba(151,71,255,0.8)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Tools
                            </h3>
                            <ul className="space-y-3">
                              {selectedItems
                                .filter(item => recommendations?.tools.some(t => t.name === item.name))
                                .map((item, idx) => (
                                  <li key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 mb-3 sm:mb-0">
                                      <div className="text-gray-600 bg-gray-100 p-2 rounded-full min-w-[40px] flex justify-center">
                                        {getItemIcon(item.name, false, "h-6 w-6")}
                                      </div>
                                      <span className="font-medium break-words">{item.name}</span>
                                    </div>
                                    <a 
                                      href={item.affiliate_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-[rgba(151,71,255,1)] hover:text-[rgba(151,71,255,0.8)] flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-lg border border-[rgba(151,71,255,0.3)] hover:bg-[rgba(151,71,255,0.05)] transition-colors w-full sm:w-auto text-sm md:text-base"
                                    >
                                      <span>Buy on Amazon</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-6 border-t border-gray-100">
                      <div className="flex items-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[rgba(151,71,255,1)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l-4-4m4 4l4-4" />
                        </svg>
                        <h4 className="font-medium">Save your shopping list</h4>
                      </div>
                      <p className="text-gray-700 mb-4 text-sm">Save your shopping list for later or share it with your team.</p>
                      <div className="flex flex-col md:flex-row gap-2">
                        <input 
                          type="email" 
                          placeholder="Enter your email" 
                          className="flex-1 px-4 py-2 md:py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(151,71,255,0.5)]"
                        />
                        <button
                          onClick={onEmailCapture}
                          className="px-4 py-2 md:px-6 md:py-3 bg-[rgba(151,71,255,1)] text-white rounded-lg hover:bg-[rgba(151,71,255,0.9)] transition-colors shadow-sm flex items-center justify-center md:justify-start gap-2 text-sm md:text-base"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save List
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Chat input that stays in the same position during transition - fixed at bottom */}
        {(showContent || (showInput && (!showContent || activeModule === 'chat'))) && (
          <div className="fixed bottom-8 left-0 right-0 px-4 z-50">
            <div className="max-w-3xl mx-auto">
              <ChatInput 
                onSubmit={showContent ? handleChatStart : undefined}
                onSendMessage={!showContent ? handleSendMessage : undefined}
                isLoading={loading}
                placeholder={showContent ? "What's your construction project?" : "Type your question here..."}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 