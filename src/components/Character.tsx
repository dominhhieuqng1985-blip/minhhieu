import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CharacterProps {
  isSpeaking: boolean;
  isConnected: boolean;
}

export const Character: React.FC<CharacterProps> = ({ isSpeaking, isConnected }) => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[320px]">
      {/* Glow effect when speaking */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1] }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute w-48 h-48 rounded-full bg-pink-400 blur-3xl z-0 top-10"
          />
        )}
      </AnimatePresence>

      {/* Girl Character Container */}
      <motion.div
        animate={{
          y: isSpeaking ? [0, -8, 0] : [0, -4, 0],
        }}
        transition={{
          duration: isSpeaking ? 0.6 : 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Head */}
        <div className="relative w-32 h-32 md:w-36 md:h-36 z-20">
          {/* Hair Back */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-36 bg-[#4a2c1d] rounded-full" />
          
          {/* Face */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-28 bg-[#ffe0bd] rounded-[3rem] border-4 border-[#e6c19a] overflow-hidden">
            {/* Eyes */}
            <div className="absolute top-10 left-0 w-full flex justify-center gap-8">
              <motion.div 
                animate={isSpeaking ? { scaleY: [1, 0.1, 1] } : { scaleY: [1, 1, 0.1, 1] }}
                transition={{ duration: isSpeaking ? 0.2 : 3, repeat: Infinity, times: [0, 0.1, 0.2, 1] }}
                className="w-3 h-3 bg-[#2d1b12] rounded-full"
              />
              <motion.div 
                animate={isSpeaking ? { scaleY: [1, 0.1, 1] } : { scaleY: [1, 1, 0.1, 1] }}
                transition={{ duration: isSpeaking ? 0.2 : 3, repeat: Infinity, times: [0, 0.1, 0.2, 1] }}
                className="w-3 h-3 bg-[#2d1b12] rounded-full"
              />
            </div>

            {/* Cheeks */}
            <div className="absolute top-14 left-0 w-full flex justify-center gap-12 opacity-30">
              <div className="w-4 h-2 bg-pink-400 rounded-full blur-[2px]" />
              <div className="w-4 h-2 bg-pink-400 rounded-full blur-[2px]" />
            </div>

            {/* Mouth */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <motion.div
                animate={isSpeaking ? {
                  height: [4, 12, 4],
                  width: [12, 16, 12],
                  borderRadius: ["2px", "8px", "2px"]
                } : {
                  height: [2, 2, 2],
                  width: [12, 12, 12],
                }}
                transition={{ duration: 0.2, repeat: Infinity }}
                className="bg-[#8b4513] rounded-full"
              />
            </div>
          </div>

          {/* Hair Front/Bangs */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-32 h-12 bg-[#4a2c1d] rounded-t-full" />
          
          {/* Hair Bow */}
          <div className="absolute -top-4 right-4 w-10 h-10 bg-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-4 h-4 bg-pink-300 rounded-full" />
          </div>
        </div>

        {/* Neck */}
        <div className="w-6 h-4 bg-[#ffe0bd] -mt-2 z-10 border-x-2 border-[#e6c19a]" />

        {/* Body (Dress) */}
        <div className="relative w-24 h-24 md:w-28 md:h-28 bg-pink-500 rounded-t-[2rem] rounded-b-lg border-4 border-pink-600 flex items-center justify-center -mt-1 z-10 shadow-xl">
          {/* Dress Pattern */}
          <div className="absolute inset-0 opacity-20 flex flex-wrap gap-2 p-4 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-white rounded-full" />
            ))}
          </div>

          {/* Arms */}
          <motion.div 
            animate={isSpeaking ? { rotate: [-20, -30, -20] } : { rotate: -20 }}
            className="absolute -left-6 top-4 origin-right w-8 h-3 bg-[#ffe0bd] rounded-full border-2 border-[#e6c19a]"
          />
          <motion.div 
            animate={isSpeaking ? { rotate: [20, 30, 20] } : { rotate: 20 }}
            className="absolute -right-6 top-4 origin-left w-8 h-3 bg-[#ffe0bd] rounded-full border-2 border-[#e6c19a]"
          />
        </div>

        {/* Legs */}
        <div className="flex gap-10 -mt-1">
          <div className="w-4 h-12 bg-[#ffe0bd] rounded-b-lg border-x-2 border-b-2 border-[#e6c19a]" />
          <div className="w-4 h-12 bg-[#ffe0bd] rounded-b-lg border-x-2 border-b-2 border-[#e6c19a]" />
        </div>
      </motion.div>

      {/* Name Label */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 px-8 py-3 bg-pink-500 text-white rounded-full text-lg font-black shadow-[0_10px_20px_rgba(236,72,153,0.3)] z-20 flex items-center gap-3 border-2 border-white/20"
      >
        <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
        BÉ NA
      </motion.div>
    </div>
  );
};
