import React from 'react';
import { DestinationInfo } from '../types';
import { Map, CloudSun, Wallet, Star } from 'lucide-react';

interface Props {
  info: DestinationInfo | null;
  cityName: string;
  loading: boolean;
}

const DestinationAssistant: React.FC<Props> = ({ info, cityName, loading }) => {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg animate-pulse h-64">
        <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
            <div className="h-4 bg-white/10 rounded w-full"></div>
            <div className="h-4 bg-white/10 rounded w-5/6"></div>
            <div className="h-4 bg-white/10 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-purple-500/30 rounded-full blur-2xl"></div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
          <h3 className="font-bold text-lg">Khám phá {cityName}</h3>
        </div>
        
        <p className="text-indigo-50 text-sm leading-relaxed mb-6">
          {info.summary}
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="bg-white/20 p-2 rounded-lg mt-0.5">
                <Map className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-indigo-200 font-semibold uppercase tracking-wider">Điểm đến nổi bật</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {info.topAttractions.map((attr, idx) => (
                    <span key={idx} className="text-xs bg-white/10 border border-white/20 px-2 py-1 rounded-full text-white">
                        {attr}
                    </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
                <CloudSun className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-indigo-200 font-semibold uppercase tracking-wider">Thời tiết</p>
              <p className="text-sm font-medium">{info.weatherForecast}</p>
            </div>
          </div>
          
           <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
                <Wallet className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-indigo-200 font-semibold uppercase tracking-wider">Tiền tệ</p>
              <p className="text-sm font-medium">{info.currency}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationAssistant;
