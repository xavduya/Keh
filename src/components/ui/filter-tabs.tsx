"use client";

interface FilterTabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export function FilterTabs({ tabs, active, onChange }: FilterTabsProps) {
  return (
    <div className="flex gap-1 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-3 py-[7px] rounded-lg text-[13px] font-semibold cursor-pointer transition-colors border ${
            tab === active
              ? "bg-[#5849da] text-white border-transparent"
              : "bg-white border-[#e9e9ef] text-[#262535] hover:bg-[#f7f8fb]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
