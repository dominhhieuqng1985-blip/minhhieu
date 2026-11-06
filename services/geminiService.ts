import { DestinationInfo, AISuggestion, ExchangeRate } from '../types';

export const getDestinationInfo = async (cityName: string): Promise<DestinationInfo | null> => {
  try {
    const res = await fetch('/api/gemini/destination', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: cityName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    const data = await res.json();
    if (data && data.summary) {
      return data as DestinationInfo;
    }
    return null;
  } catch (error) {
    console.warn('getDestinationInfo error:', error);
    return null;
  }
};

export const getTravelSuggestions = async (departureId: string, promptText: string): Promise<AISuggestion[]> => {
  const res = await fetch('/api/gemini/planner', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ departureId, promptText }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('AI returned non-array data');
  }
  return data as AISuggestion[];
};

export interface ChatbotResponse {
  reply?: string;
  activate_flow?: boolean;
  reset_flow?: boolean;
  extracted?: {
    origin?: string;
    destination?: string;
    date?: string;
  };
  is_complete?: boolean;
}

export const sendChatbotMessage = async (
  message: string,
  flowActive: boolean,
  collectedInfo: any
): Promise<ChatbotResponse> => {
  const res = await fetch('/api/gemini/chatbot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, flowActive, collectedInfo }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return await res.json();
};

export const getChatbotConsultation = async (
  origin: string,
  destination: string,
  date: string
): Promise<string> => {
  const res = await fetch('/api/gemini/consultation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination, date }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.text || 'Không thể tải bảng giá tư vấn.';
};

export const parseVoiceFlightQuery = async (transcript: string): Promise<any> => {
  const res = await fetch('/api/gemini/voice-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return await res.json();
};

export const synthesizeSpeech = async (text: string, voice?: string): Promise<string | null> => {
  try {
    const res = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data.audio || null;
  } catch (error) {
    console.warn('TTS error:', error);
    return null;
  }
};

export const analyzeFlightPrice = async (params: {
  airline?: string;
  origin: string;
  destination: string;
  departureDate: string;
  price: string;
}): Promise<{ recommendation: 'buy' | 'wait'; reason: string }> => {
  const res = await fetch('/api/gemini/price-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return await res.json();
};

export const generateItinerary = async (destination: string): Promise<string> => {
  const res = await fetch('/api/gemini/itinerary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status}`);
  }
  const data = await res.json();
  return data.text || 'Không thể tạo lịch trình.';
};

export const getHolographicFortune = async (origin: string, destination: string): Promise<string> => {
  const res = await fetch('/api/gemini/fortune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination }),
  });
  if (!res.ok) {
    return 'Hành trình vạn dặm bắt đầu từ một bước chân.';
  }
  const data = await res.json();
  return data.text || 'Bay là thích, thích là bay!';
};

export const getDailyGreeting = async (): Promise<string> => {
  const res = await fetch('/api/gemini/greeting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    return 'Chúc bạn có những chuyến đi tuyệt vời!';
  }
  const data = await res.json();
  return data.text || 'Hành trình vạn dặm bắt đầu từ đây.';
};

export const getExchangeRatesAI = async (): Promise<ExchangeRate[]> => {
  try {
    const res = await fetch('/api/gemini/exchange-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('API failed');
    return await res.json();
  } catch {
    return [
      { currency: 'USD', rate: 25450, change_percent: 0.2, updated_at: new Date().toISOString() },
      { currency: 'EUR', rate: 27100, change_percent: -0.1, updated_at: new Date().toISOString() },
      { currency: 'JPY', rate: 165, change_percent: 0.5, updated_at: new Date().toISOString() },
      { currency: 'KRW', rate: 18.5, change_percent: -0.2, updated_at: new Date().toISOString() },
      { currency: 'THB', rate: 710, change_percent: 0.0, updated_at: new Date().toISOString() },
    ];
  }
};

export const streamGeminiResponse = async (
  prompt: string,
  onChunk: (text: string) => void,
  onDone?: () => void,
  onError?: (err: any) => void
): Promise<void> => {
  try {
    const res = await fetch('/api/gemini/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Failed to stream: ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') {
            onDone?.();
            return;
          }
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) onChunk(parsed.text);
            if (parsed.error) onError?.(new Error(parsed.error));
          } catch {}
        }
      }
    }
    onDone?.();
  } catch (err) {
    onError?.(err);
  }
};

export const connectGeminiLive = (callbacks: {
  onAudio?: (base64Audio: string) => void;
  onInterrupted?: () => void;
  onError?: (err: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
}): { ws: WebSocket; sendAudio: (b64: string) => void; sendText: (text: string) => void; close: () => void } => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/gemini/live`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    callbacks.onOpen?.();
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.audio) callbacks.onAudio?.(data.audio);
      if (data.interrupted) callbacks.onInterrupted?.();
      if (data.error) callbacks.onError?.(new Error(data.error));
    } catch (e) {
      console.error('Error parsing live WS message:', e);
    }
  };

  ws.onerror = (e) => callbacks.onError?.(e);
  ws.onclose = () => callbacks.onClose?.();

  return {
    ws,
    sendAudio: (base64Audio: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ audio: base64Audio }));
      }
    },
    sendText: (text: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ text }));
      }
    },
    close: () => {
      ws.close();
    },
  };
};
