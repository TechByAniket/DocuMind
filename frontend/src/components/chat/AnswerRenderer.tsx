
import type { ReactNode } from 'react';

interface AnswerRendererProps {
  text: string;
}

function inlineFormat(text: string): ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-[#22233A]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

export default function AnswerRenderer({ text }: AnswerRendererProps) {
  return (
    <>
      {text.split('\n').map((line, index) => {
        const trimmed = line.trim();

        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <div key={index} className="flex gap-2 mb-1">
              <span className="flex-shrink-0 font-medium text-[#635BFF] text-[13px] leading-6">
                {trimmed.match(/^(\d+)\./)?.[1]}.
              </span>
              <span>{inlineFormat(trimmed.replace(/^\d+\.\s/, ''))}</span>
            </div>
          );
        }

        if (/^[-•*]\s/.test(trimmed)) {
          return (
            <div key={index} className="flex gap-2 mb-1">
              <span className="flex-shrink-0 text-[#635BFF] leading-6 text-[10px] mt-1">
                ●
              </span>
              <span>{inlineFormat(trimmed.replace(/^[-•*]\s/, ''))}</span>
            </div>
          );
        }

        if (!trimmed) {
          return <div key={index} className="h-2" />;
        }

        return (
          <p key={index} className="mb-1 leading-relaxed">
            {inlineFormat(trimmed)}
          </p>
        );
      })}
    </>
  );
}
