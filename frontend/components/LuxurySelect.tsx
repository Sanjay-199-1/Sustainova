"use client";

import { useEffect, useRef, useState } from "react";

type LuxurySelectProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder: string;
};

export default function LuxurySelect({
  value,
  options,
  onChange,
  placeholder,
}: LuxurySelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="premium-select flex w-full items-center justify-between text-left shadow-sm transition-all duration-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#C6A75E]/40"
      >
        <span className="text-[#2C2C2C]">{value || placeholder}</span>
        <svg
          className={`h-5 w-5 text-[#A88B4C] transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="animate-fadeIn absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[#C6A75E]/30 bg-white shadow-xl">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`w-full cursor-pointer px-4 py-2.5 text-left transition-all duration-200 hover:bg-[#F8F5F0] ${
                value === option
                  ? "bg-[#C6A75E]/10 font-medium text-[#C6A75E]"
                  : ""
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
