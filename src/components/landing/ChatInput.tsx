import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface ChatInputProps {
  onSubmit?: (query: string) => void;
  onSendMessage?: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function ChatInput({ 
  onSubmit, 
  onSendMessage,
  placeholder = "Describe your construction project...",
  disabled = false,
  isLoading = false
}: ChatInputProps) {
  const [prompt, setPrompt] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || disabled || isLoading) return;
    
    // Call the appropriate handler
    if (onSubmit) {
      onSubmit(prompt);
    } else if (onSendMessage) {
      onSendMessage(prompt);
    }
    
    setPrompt(""); // Clear input after submission
  };

  return (
    <div className="relative w-full max-w-full px-2 md:px-0 my-2">
      <form
        onSubmit={handleSubmit}
        className="bg-[rgba(140,140,140,0.24)] border flex items-center gap-2 md:gap-5 justify-between px-3 md:px-6 py-2 md:py-3 rounded-[39px] border-[rgba(140,140,140,0.1)] border-solid w-full max-w-[95%] md:max-w-[90%] mx-auto relative"
        style={{ zIndex: 50 }}
      >
        <div className="flex-grow flex items-center w-full min-h-[44px]">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={`w-full bg-transparent outline-none overflow-visible min-w-0 md:min-w-[250px] py-2 pl-2 md:pl-4 text-base md:text-xl ${
              disabled || isLoading ? 'opacity-50' : ''
            }`}
            aria-label="Chat prompt input"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>
        <div className="flex-shrink-0">
          <button
            type="submit"
            aria-label="Send message"
            disabled={disabled || isLoading || !prompt.trim()}
            className={`aspect-square w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full md:rounded-[32px] flex items-center justify-center ${
              disabled || isLoading || !prompt.trim() 
                ? 'bg-[rgba(151,71,255,0.5)]' 
                : 'bg-[rgba(151,71,255,1)] hover:bg-[rgba(151,71,255,0.9)]'
            }`}
          >
            {isLoading ? (
              <div className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 border-3 md:border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 