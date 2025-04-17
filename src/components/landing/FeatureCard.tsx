import React from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  className?: string;
}

export default function FeatureCard({
  title,
  description,
  className = "",
}: FeatureCardProps) {
  return (
    <div
      className={`bg-white border flex flex-col justify-between text-[#666666] w-full p-[22px] rounded-[15px] border-[#E6E6E6] border-solid h-full min-h-[220px] text-left font-['Inter'] transition-all duration-300 hover:shadow-lg hover:border-[#9747FF] hover:-translate-y-1 hover:scale-[1.02] cursor-pointer relative group ${className}`}
      style={{ position: 'relative', zIndex: 1 }}
    >
      {/* Add radial gradient background that appears on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[15px] overflow-hidden" style={{ zIndex: -1 }}>
        <div className="absolute w-full h-full bg-gradient-to-tr from-[#FFFFFF] via-[#FFFFFF] to-[#F7F4FF] rounded-[15px]"></div>
      </div>

      {/* Arrow icon in top right corner with hover effect */}
      <div className="absolute top-4 right-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 text-[#666666] group-hover:text-[#9747FF]">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="27" 
          height="27" 
          viewBox="0 0 27 27" 
          fill="none" 
          className="transition-all duration-300"
          stroke="currentColor"
        >
          <path 
            d="M8.96072 18.1289L18.1288 8.96077M18.1288 8.96077H11.2527M18.1288 8.96077V15.8368" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <circle 
            cx="13.5" 
            cy="13.5" 
            r="13" 
          />
        </svg>
      </div>
      
      <div className="pt-2 pr-7 flex-1 flex flex-col">
        <h3 className="text-xl md:text-2xl font-medium tracking-[-1.2px] text-left mb-3 transition-colors duration-300 group-hover:text-[#9747FF]">{title}</h3>
        <p className="text-base font-normal tracking-[-0.5px] text-left text-[#666666]">
          {description}
        </p>
      </div>
    </div>
  );
} 