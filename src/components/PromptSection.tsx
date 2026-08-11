import React from 'react';
import { Sparkles, Plus, Database, ArrowRight, HelpCircle, RefreshCw, FileSearch, Layers, Share2, BarChart3, Settings } from 'lucide-react';
import { SuggestionCard } from '../types';
import { translations } from '../data/translations';

interface PromptSectionProps {
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  selectedCardId: string;
  onSelectCard: (card: SuggestionCard) => void;
  suggestionCards: SuggestionCard[];
  promptInput: string;
  setPromptInput: (val: string) => void;
  onSubmitQuery: (promptText: string) => void;
  isLoading: boolean;
  selectedSourceLabel: string;
  onOpenSourceModal: () => void;
  language: 'VN' | 'EN';
}

export const PromptSection: React.FC<PromptSectionProps> = ({
  activeCategory,
  setActiveCategory,
  selectedCardId,
  onSelectCard,
  suggestionCards,
  promptInput,
  setPromptInput,
  onSubmitQuery,
  isLoading,
  selectedSourceLabel,
  onOpenSourceModal,
  language
}) => {
  const t = translations[language];

  const categories = [
    { id: 'data-discovery', label: t.catDataDiscovery, icon: FileSearch },
    { id: 'activities', label: t.catActivities, icon: Layers },
    { id: 'connection-analytics', label: t.catConnectionAnalytics, icon: Share2 },
    { id: 'reports', label: t.catReports, icon: BarChart3 },
    { id: 'management', label: t.catManagement, icon: Settings }
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() || isLoading) return;
    onSubmitQuery(promptInput);
  };

  return (
    <section className="max-w-4xl mx-auto w-full pt-6 pb-4 px-4 sm:px-6">
      {/* Welcome Title */}
      <div className="text-center mb-8 space-y-1.5">
        <h1 className="text-display-lg text-[#00344c] tracking-tight">
          {t.welcomeTitle}
        </h1>
        <p className="font-body text-body-md italic text-[#41474d]">
          {t.welcomeSubtitle}
        </p>
      </div>

      {/* Category Pills Header */}
      <div className="flex items-center sm:justify-center gap-2 overflow-x-auto pb-1 mb-4 sm:mb-6 scrollbar-none">
        <span className="text-caption-xs text-[#72787e] flex items-center gap-1 mr-1 hidden sm:inline-flex shrink-0">
          {t.needHelp} <HelpCircle className="w-3.5 h-3.5" />
        </span>
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 text-xs font-body font-medium rounded-full transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                isActive
                  ? 'bg-[#edf4ff] text-[#00344c] border border-[#00344c] font-semibold shadow-2xs'
                  : 'bg-white text-[#41474d] border border-[#DCE1E6] hover:bg-[#edf4ff] hover:text-[#00344c]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Suggestion Cards */}
      <div className="mb-2">
        <p className="text-caption-xs text-[#41474d] mb-3 font-medium">
          {t.suggestionHeader}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {suggestionCards.map(card => {
            const isSelected = selectedCardId === card.id;
            return (
              <div
                key={card.id}
                onClick={() => onSelectCard(card)}
                className={`p-4 rounded-md border transition-all cursor-pointer flex flex-col justify-between h-36 relative ${
                  isSelected
                    ? 'bg-white border-2 border-[#00344c] shadow-xs ring-1 ring-[#00344c]/20'
                    : 'bg-white border-[#DCE1E6] hover:border-[#1b4b66] hover:shadow-xs'
                }`}
              >
                {/* Active Indicator Line */}
                {isSelected && (
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#00344c] rounded-l-md"></div>
                )}

                {/* Card Top Icon Box */}
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded bg-[#edf4ff] flex items-center justify-center text-[#00344c]">
                    <Sparkles className="w-4 h-4 text-[#00344c]" />
                  </div>
                  <span className="font-data-mono text-[10px] text-[#72787e] bg-[#EEF1F4] px-1.5 py-0.5 rounded">
                    {card.sourcesCount} {t.sourcesCount}
                  </span>
                </div>

                {/* Title */}
                <p className="text-xs font-semibold text-[#0f1d28] leading-snug line-clamp-3">
                  {card.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carousel Navigation Indicator */}
      <div className="flex items-center justify-center gap-1.5 my-3 text-[#72787e]">
        <button className="text-xs hover:text-[#00344c] cursor-pointer">&lt;</button>
        <span className="w-2 h-2 rounded-full bg-[#00344c]"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#c1c7cd]"></span>
        <button className="text-xs hover:text-[#00344c] cursor-pointer">&gt;</button>
      </div>

      {/* Main AI Input Prompt Container */}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="bg-white border border-[#DCE1E6] rounded-lg shadow-2xs overflow-hidden transition-all focus-within:border-[#00344c] focus-within:ring-1 focus-within:ring-[#00344c]">
          {/* Prompt Input Textarea */}
          <div className="p-3">
            <textarea
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder={t.promptPlaceholder}
              rows={2}
              className="w-full text-xs font-body text-[#0f1d28] placeholder:text-[#72787e] focus:outline-none resize-none"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* Controls Bar inside prompt box */}
          <div className="bg-[#F8FAFC] border-t border-[#DCE1E6] px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Add Source Data Button */}
              <button
                type="button"
                onClick={onOpenSourceModal}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[#41474d] bg-white border border-[#DCE1E6] rounded hover:bg-[#edf4ff] hover:text-[#00344c] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addSourceData}</span>
              </button>

              {/* Current Source Badge */}
              <button
                type="button"
                onClick={onOpenSourceModal}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-[#1b4b66] bg-[#edf4ff] border border-[#dceafa] rounded hover:bg-[#e2efff] transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-[#1b4b66]" />
                <span className="font-data-mono text-[11px]">{selectedSourceLabel}</span>
              </button>
            </div>

            {/* Run Query / Send Button */}
            <button
              type="submit"
              disabled={isLoading || !promptInput.trim()}
              className={`w-9 h-9 rounded-full bg-[#00344c] text-white flex items-center justify-center transition-all cursor-pointer ${
                isLoading || !promptInput.trim()
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-[#1b4b66] hover:scale-105 active:scale-95 shadow-xs'
              }`}
              title={t.sendQuery}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* AI Disclaimer */}
        <p className="text-[11px] text-[#72787e] text-center mt-2 font-body">
          {t.aiDisclaimer}
        </p>
      </form>
    </section>
  );
};
