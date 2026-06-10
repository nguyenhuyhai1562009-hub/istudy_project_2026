"use client";

type Annotation = {
  keyword: string;
  type: string;
  context: string;
  suggestion: string;
};

type Props = {
  text: string;
  annotations: Annotation[];
};

export default function AnnotationOverlay({ text, annotations }: Props) {
  if (!annotations?.length) return <span className="text-gray-200 text-sm leading-8">{text}</span>;

  // Build parts array by finding exact keyword matches in order
  const parts: { text: string; annotation?: Annotation }[] = [];
  let remaining = text;

  annotations.forEach((ann) => {
    const idx = remaining.indexOf(ann.keyword);
    if (idx === -1) return;
    if (idx > 0) parts.push({ text: remaining.slice(0, idx) });
    parts.push({ text: ann.keyword, annotation: ann });
    remaining = remaining.slice(idx + ann.keyword.length);
  });

  if (remaining) parts.push({ text: remaining });

  return (
    <span className="text-sm text-gray-200 leading-8 whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.annotation ? (
          <span key={i} className="relative group inline">
            {/* Highlighted keyword */}
            <span className="bg-yellow-400/20 border-b-2 border-yellow-400 text-yellow-200 cursor-pointer px-0.5">
              {part.text}
            </span>
            {/* Tooltip on hover */}
            <span className="absolute bottom-full left-0 mb-2 w-72 bg-gray-950 border border-yellow-700/60 rounded-xl p-3 text-xs text-gray-200 leading-5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20 pointer-events-none shadow-2xl">
              <span className="block text-yellow-400 font-medium mb-1">Annotation</span>
              <span className="block text-gray-400 mb-2 italic">"{part.annotation.context}"</span>
              💡 {part.annotation.suggestion}
            </span>
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}