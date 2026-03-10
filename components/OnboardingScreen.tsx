import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

// Sample Lottie JSON URLs (using reliable public CDNs or placeholders)
// In a real app, these would be local assets
const ANIMATIONS = {
  fast: "https://lottie.host/56346896-7353-4328-9124-415518045556/K9Z2Q5Q2Q2.json", // Placeholder URL
  secure: "https://lottie.host/88888888-8888-8888-8888-888888888888/placeholder.json", // Placeholder
  cloud: "https://lottie.host/99999999-9999-9999-9999-999999999999/placeholder.json", // Placeholder
};

// Fallback component if Lottie fails to load or for placeholders
const LottiePlaceholder = ({ type }: { type: string }) => {
  const getIcon = () => {
    switch (type) {
      case 'fast': return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-32 h-32 text-blue-500 animate-bounce">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
      case 'secure': return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-32 h-32 text-green-500 animate-pulse">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
      case 'cloud': return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-32 h-32 text-sky-500 animate-pulse">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      );
      default: return null;
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-blue-50/50 rounded-full">
      {getIcon()}
    </div>
  );
};

const slides = [
  {
    id: 1,
    title: "Daddy",
    description: "The world's fastest messaging app. It is free and secure.",
    animationType: 'fast',
    lottieUrl: "https://assets9.lottiefiles.com/packages/lf20_x62chJ.json" // Rocket
  },
  {
    id: 2,
    title: "Fast",
    description: "Daddy delivers messages faster than any other application.",
    animationType: 'fast',
    lottieUrl: "https://assets2.lottiefiles.com/packages/lf20_msg4y2.json" // Speed
  },
  {
    id: 3,
    title: "Free",
    description: "Daddy is free forever. No subscription fees.",
    animationType: 'cloud',
    lottieUrl: "https://assets5.lottiefiles.com/packages/lf20_5w2kxc.json" // Gift/Free
  },
  {
    id: 4,
    title: "Secure",
    description: "Daddy keeps your messages safe from hacker attacks.",
    animationType: 'secure',
    lottieUrl: "https://assets8.lottiefiles.com/packages/lf20_sF7ugh.json" // Shield
  },
  {
    id: 5,
    title: "Cloud-Based",
    description: "Daddy lets you access your messages from multiple devices.",
    animationType: 'cloud',
    lottieUrl: "https://assets3.lottiefiles.com/packages/lf20_2Ld4Xm.json" // Cloud
  }
];

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

interface OnboardingScreenProps {
  onStart: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onStart }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Auto-advance slides every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleDotClick = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.8
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.8
    })
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent overflow-hidden relative">
      {/* Top Carousel Section (60% height) */}
      <div className="h-[65%] w-full relative flex flex-col items-center justify-center pt-10 pb-4">
        <div className="relative w-full max-w-md h-64 sm:h-80 flex items-center justify-center overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = swipePower(offset.x, velocity.x);

                if (swipe < -swipeConfidenceThreshold) {
                  setDirection(1);
                  setCurrentIndex((prev) => (prev + 1) % slides.length);
                } else if (swipe > swipeConfidenceThreshold) {
                  setDirection(-1);
                  setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
                }
              }}
              className="absolute w-full flex flex-col items-center justify-center px-8 text-center cursor-grab active:cursor-grabbing"
            >
              {/* Lottie Animation Container */}
              <div className="w-40 h-40 sm:w-56 sm:h-56 mb-6 relative">
                 {/* Using Placeholder for reliability in this environment, 
                     but structured to easily swap with <Lottie /> if URLs were guaranteed valid */}
                 <LottiePlaceholder type={slides[currentIndex].animationType} />
                 
                 {/* 
                 // Uncomment to use real Lottie if URLs are valid
                 <Lottie 
                    animationData={null} // Fetch logic would go here
                    path={slides[currentIndex].lottieUrl}
                    loop={true}
                    className="w-full h-full"
                 /> 
                 */}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                {slides[currentIndex].title}
              </h2>
              <p className="text-gray-500 text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
                {slides[currentIndex].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Section (Indicators + Button) */}
      <div className="flex-1 flex flex-col items-center justify-between pb-8 sm:pb-12 px-6 w-full max-w-md mx-auto">
        
        {/* Indicators */}
        <div className="flex gap-2 mb-8">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleDotClick(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex 
                  ? 'w-6 bg-blue-500' 
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Start Messaging Button */}
        <button
          onClick={onStart}
          className="w-full py-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
        >
          <span>Start Messaging</span>
          <ChevronRight size={20} className="opacity-80" />
        </button>
      </div>
    </div>
  );
};
