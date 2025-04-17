import React from "react";
import FeatureCard from "./FeatureCard";

const features = [
  {
    title: "Bathroom",
    description:
      "Expert advice for bathroom renovations, including tile installation, plumbing, and fixtures.",
  },
  {
    title: "Kitchen",
    description: "Guidance for kitchen remodels with countertop, cabinet, and appliance recommendations.",
  },
  {
    title: "Bedroom",
    description:
      "Design ideas and product suggestions for bedroom renovation projects and furniture installation.",
  },
  {
    title: "Living Room",
    description:
      "Recommendations for flooring, wall treatments, and furniture placement in your living spaces.",
  },
];

export default function FeatureGrid() {
  return (
    <div className="w-full max-w-6xl mt-[50px] mb-24 max-md:mt-8 mx-auto px-4 relative" style={{ paddingTop: '10px', paddingBottom: '20px' }}>
      {/* Subtle background gradient behind the grid */}
      <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ zIndex: -2 }}>
        <div className="absolute w-[90%] md:w-[800px] h-[500px] opacity-10 top-[10%] left-[50%] transform -translate-x-1/2 pointer-events-none">
          <div className="w-full h-full rounded-[500px] bg-gradient-to-tr from-[#F0EBFF] via-[#F8F5FF] to-[#9747FF] blur-[70px]"></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 relative">
        {features.map((feature, index) => (
          <div key={feature.title} className="flex p-1">
            <FeatureCard
              title={feature.title}
              description={feature.description}
              className="flex-1"
            />
          </div>
        ))}
      </div>
    </div>
  );
} 