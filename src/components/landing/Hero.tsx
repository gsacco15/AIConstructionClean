import React from "react";

interface HeroProps {
  onChatStart?: (query: string) => Promise<void>;
}

export default function Hero({ onChatStart }: HeroProps) {
  return (
    <section className="text-center relative mb-4 overflow-hidden">
      {/* Decorative gradient shapes - right side */}
      <div className="absolute w-[250px] md:w-[398px] h-[325px] opacity-30 transform rotate-[47deg] -top-20 right-0 md:right-10 pointer-events-none" style={{zIndex: -1}}>
        <div className="absolute w-full h-full rounded-full bg-gradient-to-b from-transparent to-[#6F00FF] blur-[100px]"></div>
        <div className="absolute w-[191px] h-[193px] bg-gradient-to-b from-[rgba(24,75,255,0.00)] to-[rgba(255,255,255,0.69)] blur-[100px] top-32 left-24 hidden md:block"></div>
      </div>
      
      {/* Decorative gradient shapes - left side */}
      <div className="absolute w-[250px] md:w-[350px] h-[325px] opacity-30 transform -rotate-[30deg] top-20 left-0 pointer-events-none" style={{zIndex: -1}}>
        <div className="absolute w-full h-full rounded-full bg-gradient-to-b from-transparent to-[#9747FF] blur-[100px]"></div>
        <div className="absolute w-[170px] h-[180px] bg-gradient-to-b from-[rgba(0,100,255,0.00)] to-[rgba(255,255,255,0.6)] blur-[100px] bottom-10 right-10 hidden md:block"></div>
      </div>
      
      <h1 className="mt-[80px] font-medium text-[32px] md:text-[38px] tracking-[-2.66px] max-md:max-w-full max-md:mt-10 relative font-['Inter']">
        <span className="bg-gradient-to-r from-black via-black to-[#9747FF] bg-clip-text text-transparent">
          Your AI-Powered Construction Assistant
        </span>
      </h1>
      <p className="text-[rgba(118,118,118,1)] text-lg md:text-xl font-normal tracking-[-1.4px] text-center w-full md:w-[515px] mt-6 max-md:max-w-full mx-auto relative font-['Inter'] px-4 md:px-0">
        Get expert guidance for your construction and DIY projects. Tell us what you're working on, and we'll recommend the perfect materials and tools to get the job done right.
      </p>
    </section>
  );
} 