import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

interface AnswerOptionCardProps {
  id: string;
  text: string;
  index: number;
  isSelected: boolean;
  isMultiple: boolean;
  onSelect: () => void;
}

export const AnswerOptionCard: React.FC<AnswerOptionCardProps> = ({
  id,
  text,
  index,
  isSelected,
  isMultiple,
  onSelect,
}) => {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const letter = letters[index] || String(index + 1);

  return (
    <motion.button
      type="button"
      id={`option-card-${id}`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-2xl border flex items-start gap-3.5 ${
        isSelected
          ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 shadow-sm shadow-indigo-100 dark:shadow-none'
          : 'bg-white/80 dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800'
      }`}
    >
      {/* Option Letter / Check indicator */}
      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0 mt-0.5 ${
          isSelected
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}
      >
        {isSelected && isMultiple ? (
          <Check className="w-4 h-4" />
        ) : (
          <span>{letter}</span>
        )}
      </div>

      {/* Option Text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm md:text-base leading-relaxed ${
            isSelected
              ? 'font-semibold text-indigo-950 dark:text-indigo-100'
              : 'text-slate-700 dark:text-slate-200'
          }`}
        >
          <Latex>{text}</Latex>
        </p>
      </div>
    </motion.button>
  );
};
