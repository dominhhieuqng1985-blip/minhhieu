import React, { useState, useRef, useEffect } from 'react';
import { COUNTRY_CODES } from '../constants';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const extractParts = (fullNumber: string) => {
    if (!fullNumber) return { code: '84', number: '' };

    if (fullNumber.startsWith('+')) {
        const numberWithoutPlus = fullNumber.substring(1);
        const matchedCountry = COUNTRY_CODES
            .slice()
            .sort((a, b) => b.dial.length - a.dial.length)
            .find(c => numberWithoutPlus.startsWith(c.dial));

        if (matchedCountry) {
            return {
                code: matchedCountry.dial,
                number: numberWithoutPlus.substring(matchedCountry.dial.length).replace(/\D/g, '')
            };
        }
        return { code: '84', number: numberWithoutPlus.replace(/\D/g, '') };
    }

    const digitsOnly = fullNumber.replace(/\D/g, '');
    if (digitsOnly.startsWith('0')) {
        return { code: '84', number: digitsOnly.substring(1) };
    }
    
    return { code: '84', number: digitsOnly };
};

const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Initialize state from prop, but allow it to be updated internally
  const [dialCode, setDialCode] = useState(() => extractParts(value).code);
  const [phoneNumber, setPhoneNumber] = useState(() => extractParts(value).number);

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Effect to sync component state when the `value` prop changes from the parent
  useEffect(() => {
    const { code, number } = extractParts(value);
    if (code !== dialCode) setDialCode(code);
    if (number !== phoneNumber) setPhoneNumber(number);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const digitsOnly = rawInput.replace(/\D/g, '');

    // If the user types a leading '0', assume it's a Vietnamese number.
    if (rawInput.startsWith('0')) {
        const newNumber = digitsOnly.substring(1);
        // Update state and notify parent
        setDialCode('84');
        setPhoneNumber(newNumber);
        onChange(`+84${newNumber}`);
    } else {
        // Otherwise, just update the number part with the current dial code.
        setPhoneNumber(digitsOnly);
        onChange(`+${dialCode}${digitsOnly}`);
    }
  };

  const handleDialCodeChange = (newDialCode: string) => {
    setDialCode(newDialCode);
    setIsOpen(false);
    onChange(`+${newDialCode}${phoneNumber}`);
  };
  
  const selectedCountry = COUNTRY_CODES.find(c => c.dial === dialCode) || COUNTRY_CODES[0];

  return (
    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus-within:ring-1 focus-within:ring-red-500 focus-within:border-red-500 relative bg-white dark:bg-gray-700" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center pl-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-l-md border-r border-gray-300 dark:border-gray-600"
      >
        <span className="text-sm">+{selectedCountry.dial}</span>
        <svg className="w-4 h-4 ml-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
          {COUNTRY_CODES.map(country => (
            <div
              key={country.code}
              onClick={() => handleDialCodeChange(country.dial)}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between"
            >
              <span>{country.name}</span>
              <span className="font-semibold text-gray-500 dark:text-gray-400">+{country.dial}</span>
            </div>
          ))}
        </div>
      )}

      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        required={required}
        className="block w-full px-3 py-2 border-0 rounded-r-md focus:outline-none focus:ring-0 sm:text-sm bg-transparent"
        placeholder="961000240"
      />
    </div>
  );
};

export default PhoneInput;