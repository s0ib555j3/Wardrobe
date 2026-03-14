import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  autoFocus?: boolean;
}

export function Autocomplete({ value, onChange, options, placeholder, autoFocus }: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option => 
    option.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-zinc-600 transition-colors text-zinc-100 placeholder:text-zinc-600"
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg max-h-48 overflow-auto">
          {filteredOptions.map((option, index) => (
            <li
              key={index}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className="px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer transition-colors"
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
