'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, X } from 'lucide-react';
import { useWizardStore } from '@/app/store/wizardStore';
import { formatWeekRange } from '@/app/lib/weekUtils';
import StepIndicator from './StepIndicator';
import Step1DailyArchetypes from './Step1DailyArchetypes';
import Step2Household from './Step2Household';
import Step3Confirm from './Step3Confirm';
import type { DayPlan, Recipe } from '@/app/types';

interface WizardContainerProps {
  recipes: Recipe[];
  onComplete: (plan: DayPlan[], targetWeekStart: string | null) => void;
  /** If provided, shows a Cancel button (only when user has existing plans). */
  onCancel?: () => void;
}

export default function WizardContainer({ recipes, onComplete, onCancel }: WizardContainerProps) {
  const { currentStep, targetWeekStart, setStep, confirmPlan, resetWizard, plan } = useWizardStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleNext = () => {
    if (currentStep === 1) {
      setStep(2);
    } else if (currentStep === 2) {
      setIsGenerating(true);
      setTimeout(() => {
        confirmPlan(recipes); // internally sets currentStep: 3
        setIsGenerating(false);
      }, 400);
    } else if (currentStep === 3) {
      onComplete(plan, targetWeekStart);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setStep((currentStep - 1) as 1 | 2 | 3);
  };

  const nextLabel =
    currentStep === 1
      ? 'Next: Extras'
      : currentStep === 2
      ? 'Generate Plan'
      : 'Save plan';

  const weekSubtitle = targetWeekStart
    ? `Planning week of ${formatWeekRange(targetWeekStart)}`
    : 'Your personal meal planner';

  return (
    <div className="min-h-screen bg-zinc-50 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="relative text-center mb-8">
          <div className="inline-flex items-center gap-2 text-2xl font-black text-zinc-900 mb-1">
            <Sparkles size={22} className="text-orange-500" />
            KitchenFlow
          </div>
          <p className="text-zinc-500 text-sm">{weekSubtitle}</p>

          {/* Cancel button — top right, only shown when user has existing plans */}
          {onCancel && (
            <button
              onClick={onCancel}
              className="absolute top-0 right-0 flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-700 border border-zinc-200 rounded-xl px-3 py-1.5 hover:border-zinc-400 transition-all cursor-pointer bg-white"
              aria-label="Cancel"
            >
              <X size={13} />
              Cancel
            </button>
          )}
        </div>

        <StepIndicator currentStep={currentStep} />

        {/* Card */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8">
          {currentStep === 1 && <Step1DailyArchetypes />}
          {currentStep === 2 && <Step2Household />}
          {currentStep === 3 && <Step3Confirm />}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-100">
            {currentStep > 1 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleNext}
              disabled={isGenerating}
              className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-3 rounded-2xl text-sm font-semibold hover:bg-zinc-700 disabled:opacity-60 transition-all shadow-sm cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Generating…
                </>
              ) : (
                <>
                  {nextLabel}
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Start over link */}
        {currentStep > 1 && (
          <div className="text-center mt-4">
            <button
              onClick={resetWizard}
              className="text-xs text-zinc-400 hover:text-zinc-600 underline cursor-pointer"
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
