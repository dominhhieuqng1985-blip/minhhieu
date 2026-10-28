import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Sparkles,
  CheckCircle2,
  Compass,
  Sliders,
  Loader2,
} from 'lucide-react';
import { SchoolTier } from '../data/kidsCurriculumData';

interface KidsVisualSandboxProps {
  activeTier: SchoolTier;
  onSpeakText: (text: string) => void;
  isSpeaking: boolean;
  voiceLabel: string;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export const KidsVisualSandbox: React.FC<KidsVisualSandboxProps> = ({
  activeTier,
  onSpeakText,
  isSpeaking,
  voiceLabel,
}) => {
  const [selectedLab, setSelectedLab] = useState<SchoolTier>(activeTier);

  // Sync lab tab when parent tier changes
  useEffect(() => {
    setSelectedLab(activeTier);
  }, [activeTier]);

  // --- Lab 1 (Tiểu học): Visual Fraction Explorer ---
  const [denominator, setDenominator] = useState<number>(6);
  const [numerator, setNumerator] = useState<number>(4);

  useEffect(() => {
    if (numerator > denominator) {
      setNumerator(denominator);
    }
  }, [denominator, numerator]);

  const commonDivisor = gcd(numerator, denominator);
  const simpNum = numerator / commonDivisor;
  const simpDen = denominator / commonDivisor;
  const percentage = ((numerator / denominator) * 100).toFixed(1).replace(/\.0$/, '');
  const decimalVal = (numerator / denominator).toFixed(2).replace(/\.?0+$/, '') || '0';

  // --- Lab 2 (THCS): Pythagoras & Right Triangle Visualizer ---
  const [sideA, setSideA] = useState<number>(6);
  const [sideB, setSideB] = useState<number>(8);
  const hypotenuse = Math.sqrt(sideA * sideA + sideB * sideB);
  const isExactTriple = Number.isInteger(hypotenuse);
  const triArea = (sideA * sideB) / 2;
  const triPerimeter = sideA + sideB + hypotenuse;
  const angleB = (Math.atan2(sideB, sideA) * 180) / Math.PI;

  // --- Lab 3 (THPT): Projectile Motion & Parabola Physics ---
  const [v0, setV0] = useState<number>(24);
  const [angleDeg, setAngleDeg] = useState<number>(45);
  const [gravity, setGravity] = useState<number>(9.8);
  const [simRunning, setSimRunning] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0.55); // 0..1 of flight time
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);

  const angleRad = (angleDeg * Math.PI) / 180;
  const flightTime = (2 * v0 * Math.sin(angleRad)) / gravity;
  const maxHeight = (v0 * v0 * Math.pow(Math.sin(angleRad), 2)) / (2 * gravity);
  const maxRange = (v0 * v0 * Math.sin(2 * angleRad)) / gravity;

  useEffect(() => {
    if (!simRunning) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastFrameRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastFrameRef.current) / 1000;
      lastFrameRef.current = now;
      const durationSec = Math.max(1.8, Math.min(5, flightTime));
      setSimProgress((prev) => {
        const next = prev + dt / durationSec;
        if (next >= 1) {
          setSimRunning(false);
          return 1;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [simRunning, flightTime]);

  const handleNarrateCurrentLab = () => {
    if (selectedLab === 'tieu-hoc') {
      const simplifyPart =
        commonDivisor > 1
          ? `Khi chia cả tử số và mẫu số cho ${commonDivisor}, ta rút gọn được phân số tối giản là ${simpNum} phần ${simpDen}.`
          : `Phân số ${numerator} phần ${denominator} đã là phân số tối giản.`;
      onSpeakText(
        `Mô hình phân số trực quan: Hình tròn được chia đều thành ${denominator} phần bằng nhau, bé đã tô màu ${numerator} phần. Ta có phân số ${numerator} phần ${denominator}, tương ứng với ${percentage} phần trăm. ${simplifyPart}`
      );
    } else if (selectedLab === 'thcs') {
      const cText = isExactTriple ? `${hypotenuse}` : `xấp xỉ ${hypotenuse.toFixed(2)}`;
      onSpeakText(
        `Thí nghiệm Định lý Pi ta go: Tam giác vuông có hai cạnh góc vuông dài ${sideA} xen ti mét và ${sideB} xen ti mét. Tổng bình phương hai cạnh góc vuông là ${sideA * sideA} cộng ${sideB * sideB} bằng ${
          sideA * sideA + sideB * sideB
        }. Vậy cạnh huyền c dài ${cText} xen ti mét, và diện tích tam giác là ${triArea} xen ti mét vuông.`
      );
    } else {
      const planetName =
        gravity === 9.8 ? 'Trái Đất' : gravity === 1.62 ? 'Mặt Trăng' : 'Sao Hỏa';
      onSpeakText(
        `Mô phỏng Vật lý ném xiên trên ${planetName}: Với vận tốc đầu ${v0} mét trên giây và góc ném ${angleDeg} độ, vật đạt độ cao cực đại ${maxHeight.toFixed(
          1
        )} mét và tầm bay xa ${maxRange.toFixed(
          1
        )} mét trong tổng thời gian ${flightTime.toFixed(
          2
        )} giây. Lưu ý trên cùng mặt phẳng ngang, góc ném 45 độ luôn cho tầm bay xa lớn nhất.`
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Lab Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedLab('tieu-hoc')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedLab === 'tieu-hoc'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            🍕 Tiểu Học: Phân Số &amp; Tỉ Số
          </button>
          <button
            type="button"
            onClick={() => setSelectedLab('thcs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedLab === 'thcs'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            📐 THCS: Định Lý Pythagore
          </button>
          <button
            type="button"
            onClick={() => setSelectedLab('thpt')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedLab === 'thpt'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            🚀 THPT: Vật Lý Ném Xiên &amp; Parabol
          </button>
        </div>

        <button
          type="button"
          onClick={handleNarrateCurrentLab}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all active:scale-95"
        >
          {isSpeaking ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
          ) : (
            <Volume2 className="w-4 h-4 text-amber-300" />
          )}
          <span>Nghe giảng trực tiếp ({voiceLabel})</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* LAB 1: TIỂU HỌC - VISUAL FRACTION EXPLORER                          */}
      {/* =================================================================== */}
      {selectedLab === 'tieu-hoc' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Stage (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Xưởng Bánh Phân Số Trực Quan
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chạm trực tiếp vào từng miếng bánh để thêm hoặc bớt phần tô màu!
                </p>
              </div>
              <div className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold tabular-nums">
                ● Trạng thái: {numerator === denominator ? 'Đầy nguyên 1 chiếc (100%)' : `${numerator}/${denominator} chiếc bánh`}
              </div>
            </div>

            {/* Interactive SVG Pie Sectors */}
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
              <svg
                viewBox="-120 -120 240 240"
                className="w-56 h-56 sm:w-64 sm:h-64 drop-shadow-xl select-none"
                role="img"
                aria-label={`Mô hình phân số ${numerator} phần ${denominator}`}
              >
                <circle cx="0" cy="0" r="106" fill="#0f172a" stroke="#334155" strokeWidth="3" />
                {Array.from({ length: denominator }).map((_, idx) => {
                  const startAngle = (idx * 2 * Math.PI) / denominator - Math.PI / 2;
                  const endAngle = ((idx + 1) * 2 * Math.PI) / denominator - Math.PI / 2;
                  const r = 98;
                  const x1 = r * Math.cos(startAngle);
                  const y1 = r * Math.sin(startAngle);
                  const x2 = r * Math.cos(endAngle);
                  const y2 = r * Math.sin(endAngle);
                  const largeArc = 2 * Math.PI / denominator > Math.PI ? 1 : 0;
                  const isFilled = idx < numerator;
                  const pathData =
                    denominator === 1
                      ? `M 0 -${r} A ${r} ${r} 0 1 1 -0.01 -${r} Z`
                      : `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;

                  const midAngle = (startAngle + endAngle) / 2;
                  const labelR = r * 0.62;
                  const lx = labelR * Math.cos(midAngle);
                  const ly = labelR * Math.sin(midAngle);

                  return (
                    <g
                      key={idx}
                      onClick={() => {
                        if (idx + 1 === numerator) {
                          setNumerator(Math.max(0, numerator - 1));
                        } else {
                          setNumerator(idx + 1);
                        }
                      }}
                      className="cursor-pointer transition-transform hover:scale-[1.03]"
                    >
                      <path
                        d={pathData}
                        fill={isFilled ? '#10b981' : '#1e293b'}
                        stroke="#0f172a"
                        strokeWidth="3.5"
                      />
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={isFilled ? '#022c22' : '#94a3b8'}
                        fontSize="12"
                        fontWeight="800"
                      >
                        {idx + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Big Fraction Readout Card */}
              <div className="flex flex-col items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 min-w-[180px]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Phân số hiện tại
                </span>
                <div className="flex items-center gap-4 tabular-nums">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl font-black text-emerald-400">{numerator}</span>
                    <div className="w-10 h-1 bg-slate-400 rounded-full my-1" />
                    <span className="text-3xl font-black text-sky-400">{denominator}</span>
                  </div>
                  {commonDivisor > 1 && numerator > 0 && (
                    <>
                      <span className="text-xl font-bold text-slate-500">=</span>
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-extrabold text-amber-300">{simpNum}</span>
                        <div className="w-8 h-0.5 bg-amber-400/70 rounded-full my-1" />
                        <span className="text-2xl font-extrabold text-amber-300">{simpDen}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-xs text-slate-300 tabular-nums font-mono bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                  = {decimalVal} ({percentage}%)
                </div>
              </div>
            </div>

            {/* Comparative Linear Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400 tabular-nums">
                <span>Thanh tỉ lệ trực quan ({numerator} / {denominator} phần)</span>
                <span className="text-emerald-400 font-bold">{percentage}%</span>
              </div>
              <div
                className="grid gap-1 h-5 bg-slate-950 p-1 rounded-xl border border-slate-800"
                style={{ gridTemplateColumns: `repeat(${denominator}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: denominator }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNumerator(idx + 1)}
                    aria-label={`Chọn ${idx + 1} phần`}
                    className={`rounded-md transition-colors ${
                      idx < numerator ? 'bg-emerald-500' : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Control & Concept Deck (5 cols) */}
          <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Bảng Điều Khiển Tử Số &amp; Mẫu Số</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs tabular-nums">
                  <label htmlFor="slider-num" className="text-slate-300 font-semibold">
                    Tử số (Số phần tô màu):
                  </label>
                  <span className="font-mono font-bold text-emerald-400">{numerator} phần</span>
                </div>
                <input
                  id="slider-num"
                  type="range"
                  min={0}
                  max={denominator}
                  step={1}
                  value={numerator}
                  onChange={(e) => setNumerator(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs tabular-nums">
                  <label htmlFor="slider-den" className="text-slate-300 font-semibold">
                    Mẫu số (Tổng số phần chia đều):
                  </label>
                  <span className="font-mono font-bold text-sky-400">{denominator} phần</span>
                </div>
                <input
                  id="slider-den"
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={denominator}
                  onChange={(e) => setDenominator(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>

              {/* Quick Challenge Presets */}
              <div className="pt-2 space-y-2">
                <span className="text-xs font-semibold text-slate-400">Thử nhanh các mốc thú vị:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Một nửa (1/2)', n: 3, d: 6 },
                    { label: 'Ba phần tư (3/4)', n: 6, d: 8 },
                    { label: 'Hai phần ba (2/3)', n: 6, d: 9 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        setDenominator(item.d);
                        setNumerator(item.n);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-200 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5 text-xs">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Ghi nhớ kiến thức cốt lõi</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                <strong>Tử số</strong> viết trên gạch ngang chỉ số phần lấy đi; <strong>Mẫu số</strong> viết dưới gạch ngang (khác 0) chỉ tổng số phần bằng nhau.{' '}
                {commonDivisor > 1 && numerator > 0
                  ? `Cả ${numerator} và ${denominator} đều chia hết cho ${commonDivisor}, nên rút gọn được thành ${simpNum}/${simpDen}!`
                  : 'Khi tử số và mẫu số không cùng chia hết cho số nào lớn hơn 1, ta có phân số tối giản.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LAB 2: THCS - PYTHAGORAS RIGHT TRIANGLE EXPLORER                    */}
      {/* =================================================================== */}
      {selectedLab === 'thcs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Mô Hình Hình Học Định Lý Pythagore: a² + b² = c²
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kéo thanh trượt cạnh a, b để quan sát tam giác vuông và hệ thức diện tích bình phương.
                </p>
              </div>
              <div
                className={`px-3 py-1 rounded-xl text-xs font-bold border tabular-nums ${
                  isExactTriple
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                }`}
              >
                {isExactTriple ? `★ Bộ ba Pythagore nguyên (${sideA}-${sideB}-${hypotenuse})` : `● c ≈ ${hypotenuse.toFixed(2)} cm`}
              </div>
            </div>

            <div className="flex items-center justify-center bg-slate-950 rounded-2xl border border-slate-800 p-4">
              {(() => {
                const scale = 14;
                const originX = 65;
                const originY = 205;
                const ax = originX;
                const ay = originY - sideA * scale;
                const bx = originX + sideB * scale;
                const by = originY;
                return (
                  <svg
                    viewBox="0 0 340 245"
                    className="w-full max-w-md h-60 select-none"
                    role="img"
                    aria-label="Mô hình tam giác vuông Pythagore"
                  >
                    {/* Subtle Grid */}
                    <defs>
                      <pattern id="pyth-grid" width="14" height="14" patternUnits="userSpaceOnUse">
                        <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                      </pattern>
                    </defs>
                    <rect x="0" y="0" width="340" height="245" fill="url(#pyth-grid)" rx="12" />

                    {/* Right-angle marker at C(originX, originY) */}
                    <rect
                      x={originX}
                      y={originY - 14}
                      width="14"
                      height="14"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="2"
                    />

                    {/* Triangle Fill */}
                    <polygon
                      points={`${originX},${originY} ${ax},${ay} ${bx},${by}`}
                      fill="rgba(14, 165, 233, 0.18)"
                      stroke="#38bdf8"
                      strokeWidth="3"
                      strokeLinejoin="round"
                    />

                    {/* Vertex Labels */}
                    <text x={originX - 16} y={originY + 15} fill="#cbd5e1" fontSize="12" fontWeight="700">
                      A (90°)
                    </text>
                    <text x={ax - 14} y={ay - 8} fill="#34d399" fontSize="12" fontWeight="700">
                      B
                    </text>
                    <text x={bx + 8} y={by + 4} fill="#fbbf24" fontSize="12" fontWeight="700">
                      C
                    </text>

                    {/* Side Labels */}
                    <text
                      x={originX - 28}
                      y={(originY + ay) / 2}
                      fill="#34d399"
                      fontSize="12"
                      fontWeight="800"
                    >
                      a={sideA}
                    </text>
                    <text
                      x={(originX + bx) / 2}
                      y={originY + 20}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="12"
                      fontWeight="800"
                    >
                      b = {sideB} cm
                    </text>
                    <text
                      x={(ax + bx) / 2 + 16}
                      y={(ay + by) / 2 - 8}
                      fill="#fbbf24"
                      fontSize="12.5"
                      fontWeight="800"
                    >
                      c = {isExactTriple ? hypotenuse : hypotenuse.toFixed(2)} cm
                    </text>
                  </svg>
                );
              })()}
            </div>

            {/* Live Formula Readout */}
            <div className="grid grid-cols-3 gap-2.5 text-center tabular-nums">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">a² + b²</div>
                <div className="text-sm font-extrabold text-sky-300 font-mono">
                  {sideA * sideA} + {sideB * sideB} = {sideA * sideA + sideB * sideB}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Diện tích S = ½ab</div>
                <div className="text-sm font-extrabold text-emerald-300 font-mono">
                  {triArea} cm²
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Góc nhọn B̂</div>
                <div className="text-sm font-extrabold text-amber-300 font-mono">
                  {angleB.toFixed(1)}°
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Điều Chỉnh Hai Cạnh Góc Vuông</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs tabular-nums">
                  <label htmlFor="slider-a" className="text-slate-300 font-semibold">
                    Cạnh góc vuông đứng (a):
                  </label>
                  <span className="font-mono font-bold text-emerald-400">{sideA} cm</span>
                </div>
                <input
                  id="slider-a"
                  type="range"
                  min={3}
                  max={12}
                  step={1}
                  value={sideA}
                  onChange={(e) => setSideA(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs tabular-nums">
                  <label htmlFor="slider-b" className="text-slate-300 font-semibold">
                    Cạnh góc vuông đáy (b):
                  </label>
                  <span className="font-mono font-bold text-sky-400">{sideB} cm</span>
                </div>
                <input
                  id="slider-b"
                  type="range"
                  min={3}
                  max={12}
                  step={1}
                  value={sideB}
                  onChange={(e) => setSideB(Number(e.target.value))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div className="pt-2 space-y-2">
                <span className="text-xs font-semibold text-slate-400">Bộ ba số Pythagore kinh điển:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '3 – 4 – 5', a: 3, b: 4 },
                    { label: '6 – 8 – 10', a: 6, b: 8 },
                    { label: '5 – 12 – 13', a: 5, b: 12 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSideA(preset.a);
                        setSideB(preset.b);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-bold text-amber-300 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/30 space-y-1.5 text-xs">
              <div className="font-bold text-sky-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Ứng dụng thực tế</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Trong mọi tam giác vuông, bình phương cạnh huyền luôn bằng tổng bình phương hai cạnh góc vuông:{' '}
                <code className="text-amber-300 font-mono">
                  c = √({sideA}² + {sideB}²) = √{sideA * sideA + sideB * sideB} ≈ {hypotenuse.toFixed(2)} cm
                </code>
                . Chu vi tam giác hiện tại là <strong className="tabular-nums">{triPerimeter.toFixed(2)} cm</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* LAB 3: THPT - PROJECTILE MOTION & PARABOLA TRAJECTORY               */}
      {/* =================================================================== */}
      {selectedLab === 'thpt' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  Mô Phỏng Quỹ Đạo Ném Xiên: y = tan(α)·x - g·x² / (2·v₀²·cos²α)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Khảo sát quỹ đạo Parabol, độ cao cực đại H_max và tầm bay xa L_max theo góc bắn α.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (simProgress >= 1) setSimProgress(0);
                    setSimRunning((prev) => !prev);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  {simRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{simRunning ? 'Tạm dừng' : 'Phóng vật'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimRunning(false);
                    setSimProgress(0);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Đặt lại vị trí ban đầu"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Trajectory Coordinate Stage */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
              {(() => {
                const viewW = 460;
                const viewH = 220;
                const padLeft = 38;
                const padBottom = 28;
                const plotW = viewW - padLeft - 20;
                const plotH = viewH - padBottom - 20;

                const scaleMaxX = Math.max(80, maxRange * 1.12);
                const scaleMaxY = Math.max(35, maxHeight * 1.25);

                const toSvgX = (x: number) => padLeft + (x / scaleMaxX) * plotW;
                const toSvgY = (y: number) => viewH - padBottom - (y / scaleMaxY) * plotH;

                const points: string[] = [];
                const steps = 60;
                for (let i = 0; i <= steps; i++) {
                  const t = (i / steps) * flightTime;
                  const x = v0 * Math.cos(angleRad) * t;
                  const y = Math.max(0, v0 * Math.sin(angleRad) * t - 0.5 * gravity * t * t);
                  points.push(`${toSvgX(x).toFixed(1)},${toSvgY(y).toFixed(1)}`);
                }

                const curT = simProgress * flightTime;
                const curX = v0 * Math.cos(angleRad) * curT;
                const curY = Math.max(0, v0 * Math.sin(angleRad) * curT - 0.5 * gravity * curT * curT);
                const apexX = maxRange / 2;

                return (
                  <svg
                    viewBox={`0 0 ${viewW} ${viewH}`}
                    className="w-full h-56 select-none"
                    role="img"
                    aria-label="Đồ thị quỹ đạo ném xiên"
                  >
                    {/* Axes */}
                    <line
                      x1={padLeft}
                      y1={viewH - padBottom}
                      x2={viewW - 10}
                      y2={viewH - padBottom}
                      stroke="#475569"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={padLeft}
                      y1={12}
                      x2={padLeft}
                      y2={viewH - padBottom}
                      stroke="#475569"
                      strokeWidth="1.5"
                    />

                    {/* Max Height Dashed Line */}
                    <line
                      x1={padLeft}
                      y1={toSvgY(maxHeight)}
                      x2={toSvgX(apexX)}
                      y2={toSvgY(maxHeight)}
                      stroke="#34d399"
                      strokeDasharray="4 4"
                      strokeWidth="1.2"
                    />
                    <circle cx={toSvgX(apexX)} cy={toSvgY(maxHeight)} r="4" fill="#34d399" />
                    <text
                      x={toSvgX(apexX)}
                      y={Math.max(14, toSvgY(maxHeight) - 8)}
                      textAnchor="middle"
                      fill="#34d399"
                      fontSize="10.5"
                      fontWeight="700"
                    >
                      H_max = {maxHeight.toFixed(1)}m
                    </text>

                    {/* Parabola Curve */}
                    <polyline
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3"
                      points={points.join(' ')}
                    />

                    {/* Landing Marker */}
                    <circle cx={toSvgX(maxRange)} cy={viewH - padBottom} r="4.5" fill="#38bdf8" />
                    <text
                      x={Math.min(viewW - 45, toSvgX(maxRange))}
                      y={viewH - 8}
                      textAnchor="middle"
                      fill="#38bdf8"
                      fontSize="10.5"
                      fontWeight="700"
                    >
                      L = {maxRange.toFixed(1)}m
                    </text>

                    {/* Moving Projectile Ball */}
                    <circle
                      cx={toSvgX(curX)}
                      cy={toSvgY(curY)}
                      r="7"
                      fill="#fbbf24"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </svg>
                );
              })()}
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center tabular-nums">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Độ cao cực đại H_max</div>
                <div className="text-sm font-extrabold text-emerald-400 font-mono">
                  {maxHeight.toFixed(2)} m
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Tầm bay xa L_max</div>
                <div className="text-sm font-extrabold text-sky-400 font-mono">
                  {maxRange.toFixed(2)} m
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Thời gian bay t</div>
                <div className="text-sm font-extrabold text-amber-400 font-mono">
                  {flightTime.toFixed(2)} s
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Thông Số Vật Lý Đầu Vào</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs tabular-nums">
                  <label htmlFor="slider-v0" className="text-slate-300 font-semibold">
                    Vận tốc ban đầu (v₀):
                  </label>
                  <span className="font-mono font-bold text-amber-400">{v0} m/s</span>
                </div>
                <input
                  id="slider-v0"
                  type="range"
                  min={10}
                  max={40}
                  step={1}
                  value={v0}
                  onChange={(e) => setV0(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs tabular-nums">
                  <label htmlFor="slider-angle" className="text-slate-300 font-semibold">
                    Góc ném hợp với phương ngang (α):
                  </label>
                  <span className="font-mono font-bold text-emerald-400">{angleDeg}°</span>
                </div>
                <input
                  id="slider-angle"
                  type="range"
                  min={15}
                  max={80}
                  step={1}
                  value={angleDeg}
                  onChange={(e) => setAngleDeg(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-slate-300">Môi trường trọng trường (g):</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '🌍 Trái Đất (9.8)', g: 9.8 },
                    { label: '🔴 Sao Hỏa (3.71)', g: 3.71 },
                    { label: '🌙 Mặt Trăng (1.62)', g: 1.62 },
                  ].map((env) => (
                    <button
                      key={env.label}
                      type="button"
                      onClick={() => setGravity(env.g)}
                      className={`px-2 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                        gravity === env.g
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {env.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-1.5 text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Nhận xét Vật lý 10 – 12</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Vì <code className="text-amber-300 font-mono">L_max = v₀²·sin(2α)/g</code>, khi{' '}
                <strong>α = 45°</strong> thì <code className="font-mono">sin(90°) = 1</code> đạt cực đại! Hai góc phụ nhau (như 30° và 60°) luôn có cùng tầm bay xa L_max.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
