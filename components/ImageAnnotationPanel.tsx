"use client";

import { useMemo, useState, useRef, useEffect } from "react";

type OCRWord = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Annotation = {
  keyword: string;
  exactText: string;
  suggestion: string;
  confidence: number;
};

type Props = {
  imageUrl: string;
  ocrWords?: OCRWord[];
  annotations: Annotation[];
};

export default function ImageAnnotationOverlay({
  imageUrl,
  ocrWords = [],
  annotations,
}: Props) {
  const [active, setActive] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // Debugging tool: Validate coordinate data on mount
  useEffect(() => {
    if (ocrWords.length > 0 && !("x" in ocrWords[0])) {
      console.error("❌ ERROR: OCR data is missing coordinates (x, y, width, height)!");
    }
  }, [ocrWords]);

  const handleLoad = () => {
    if (imgRef.current) {
      setDimensions({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  };

  const { matched, unmatched } = useMemo(() => {
    if (dimensions.width === 0 || ocrWords.length === 0) {
      return { matched: [], unmatched: annotations };
    }

    const m: any[] = [];
    const u: any[] = [];

    annotations.forEach((ann) => {
      // Robust matching: Ignore tokens shorter than 4 chars to avoid noise
      const word = ocrWords.find((w) => {
        const wText = w.text.trim().toLowerCase();
        if (wText.length < 4) return false; 
        
        return wText.includes(ann.keyword.toLowerCase()) || 
               ann.exactText.toLowerCase().includes(wText);
      });

      if (word && ann.confidence >= 0.8) {
        console.log(`[Overlay] Matched: ${ann.keyword} -> ${word.text}`);
        m.push({ ...ann, ...word });
      } else {
        u.push(ann);
      }
    });

    return { matched: m, unmatched: u };
  }, [annotations, ocrWords, dimensions]);

  return (
    <div className="w-full space-y-4">
      {/* Image container always renders to prevent deadlock */}
      <div className="relative inline-block w-full overflow-hidden rounded-xl border border-gray-800">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Submission"
          className="w-full h-auto block"
          onLoad={handleLoad}
        />
        
        {/* Overlay renders only after dimensions are calculated */}
        {dimensions.width > 0 && matched.map((box, index) => (
          <div
            key={`match-${index}`}
            className="absolute cursor-pointer transition-all duration-300"
            style={{
              left: `${(box.x / dimensions.width) * 100}%`,
              top: `${(box.y / dimensions.height) * 100}%`,
              width: `${(box.width / dimensions.width) * 100}%`,
              height: `${(box.height / dimensions.height) * 100}%`,
            }}
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
          >
            <div className="w-full h-full border-2 border-yellow-400 bg-yellow-400/20 rounded shadow-[0_0_8px_rgba(250,204,21,0.3)]" />
            {active === index && (
              <div className="absolute top-full left-0 mt-3 w-64 rounded-xl border border-yellow-500/30 bg-black/95 p-4 text-sm text-white z-50 shadow-2xl">
                <div className="font-bold text-yellow-400 mb-1">Feedback</div>
                <div className="text-gray-200">{box.suggestion}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Fallback UI: Ensures feedback is never lost */}
      {unmatched.length > 0 && (
        <div className="bg-black/40 border border-yellow-900/50 rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-widest text-yellow-700 mb-3">
            ⚠ Additional Notes
          </div>
          {unmatched.map((a, i) => (
            <div key={`unmatch-${i}`} className="text-gray-400 text-sm mb-2">
              <span className="text-yellow-600 font-medium">"{a.keyword}"</span>: {a.suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}