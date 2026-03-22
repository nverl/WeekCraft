'use client';

import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const steps = [
  { number: 1, label: 'Daily Vibe' },
  { number: 2, label: 'Extras' },
  { number: 3, label: 'Confirm' },
];

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => {
        const isDone = step.number < currentStep;
        const isActive = step.number === currentStep;

        return (
          <div key={step.number} className="flex items-center">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200
                  ${isDone ? 'bg-emerald-500 text-white' : ''}
                  ${isActive ? 'bg-zinc-900 text-white ring-2 ring-zinc-900 ring-offset-2' : ''}
                  ${!isDone && !isActive ? 'bg-zinc-100 text-zinc-400' : ''}
                `}
              >
                {isDone ? <Check size={16} strokeWidth={3} /> : step.number}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block transition-colors
                  ${isActive ? 'text-zinc-900' : isDone ? 'text-emerald-600' : 'text-zinc-400'}
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className={`w-16 sm:w-24 h-0.5 mx-2 mt-[-10px] transition-colors duration-300
                  ${isDone ? 'bg-emerald-400' : 'bg-zinc-200'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
