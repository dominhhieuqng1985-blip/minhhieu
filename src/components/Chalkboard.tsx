import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface ChalkboardProps {
  content: string;
}

export const Chalkboard: React.FC<ChalkboardProps> = ({ content }) => {
  return (
    <div className="w-full h-full bg-[#1e3526] border-[12px] md:border-[20px] border-[#3a2318] rounded-[2rem] p-6 md:p-12 shadow-[inset_0_0_100px_rgba(0,0,0,0.8),0_30px_60px_rgba(0,0,0,0.6)] overflow-y-auto relative group">
      {/* Chalk Dust Texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]" />
      
      {/* Wood Grain Detail */}
      <div className="absolute -inset-[20px] border-[4px] border-white/5 rounded-[2.5rem] pointer-events-none" />
      
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.07] pointer-events-none" 
           style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}>
      </div>
      <style>
        {`
          .katex-display {
            margin: 1.5em 0;
            padding: 1em;
            background: rgba(0,0,0,0.15);
            border-radius: 12px;
            overflow-x: auto;
            text-align: center;
          }
          .katex {
            font-size: 1.25em;
          }
          /* Tùy chỉnh thanh cuộn cho bảng */
          ::-webkit-scrollbar {
            width: 12px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.2);
            border-radius: 8px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.3);
          }
          /* Tùy chỉnh hình ảnh hiển thị trên bảng */
          .prose img {
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            margin: 2rem auto;
            max-height: 400px;
            object-fit: cover;
            border: 4px solid rgba(255,255,255,0.1);
          }
        `}
      </style>
      <div className="prose prose-invert prose-2xl max-w-none font-sans text-white/95 leading-relaxed" style={{ textShadow: '0 0 3px rgba(255,255,255,0.4)' }}>
        <ReactMarkdown 
          remarkPlugins={[remarkMath]} 
          rehypePlugins={[rehypeRaw, [rehypeKatex, { strict: false }]]}
        >
          {content || "Bé Na sẵn sàng rồi nè! Hôm nay tụi mình cùng học bài gì đây ta?"}
        </ReactMarkdown>
      </div>
    </div>
  );
};
