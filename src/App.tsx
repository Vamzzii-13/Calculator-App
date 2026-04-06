/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Moon, Sun, Volume2, VolumeX, Delete, Trash2 } from 'lucide-react';

type Operator = '+' | '-' | '*' | '/' | null;

interface HistoryItem {
  expression: string;
  result: string;
  timestamp: number;
}

export default function App() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [activeOperator, setActiveOperator] = useState<Operator>(null);

  const displayRef = useRef<HTMLDivElement>(null);

  // Audio for button clicks
  const playClickSound = () => {
    if (!isSoundEnabled) return;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    audio.volume = 0.2;
    audio.play().catch(() => {});
  };

  const calculate = (firstOperand: number, secondOperand: number, op: Operator): number => {
    switch (op) {
      case '+': return firstOperand + secondOperand;
      case '-': return firstOperand - secondOperand;
      case '*': return firstOperand * secondOperand;
      case '/': return secondOperand === 0 ? NaN : firstOperand / secondOperand;
      default: return secondOperand;
    }
  };

  const handleNumber = useCallback((num: string) => {
    playClickSound();
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  }, [display, waitingForOperand, isSoundEnabled]);

  const handleOperator = useCallback((nextOperator: Operator) => {
    playClickSound();
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator && !waitingForOperand) {
      const result = calculate(previousValue, inputValue, operator);
      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
    setActiveOperator(nextOperator);
  }, [display, previousValue, operator, waitingForOperand, isSoundEnabled]);

  const handleEqual = useCallback(() => {
    playClickSound();
    const inputValue = parseFloat(display);

    if (operator && previousValue !== null) {
      const result = calculate(previousValue, inputValue, operator);
      const expression = `${previousValue} ${operator === '*' ? '×' : operator === '/' ? '÷' : operator} ${inputValue}`;
      
      setHistory(prev => [{
        expression,
        result: String(result),
        timestamp: Date.now()
      }, ...prev].slice(0, 20));

      setDisplay(String(result));
      setPreviousValue(null);
      setOperator(null);
      setActiveOperator(null);
      setWaitingForOperand(true);
    }
  }, [display, previousValue, operator, isSoundEnabled]);

  const handleClear = useCallback(() => {
    playClickSound();
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setActiveOperator(null);
    setWaitingForOperand(false);
  }, [isSoundEnabled]);

  const handleToggleSign = useCallback(() => {
    playClickSound();
    setDisplay(String(parseFloat(display) * -1));
  }, [display, isSoundEnabled]);

  const handlePercent = useCallback(() => {
    playClickSound();
    setDisplay(String(parseFloat(display) / 100));
  }, [display, isSoundEnabled]);

  const handleDecimal = useCallback(() => {
    playClickSound();
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand, isSoundEnabled]);

  const handleBackspace = useCallback(() => {
    playClickSound();
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  }, [display, isSoundEnabled]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
      if (e.key === '.') handleDecimal();
      if (e.key === '+') handleOperator('+');
      if (e.key === '-') handleOperator('-');
      if (e.key === '*') handleOperator('*');
      if (e.key === '/') handleOperator('/');
      if (e.key === 'Enter' || e.key === '=') handleEqual();
      if (e.key === 'Escape') handleClear();
      if (e.key === 'Backspace') handleBackspace();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumber, handleOperator, handleEqual, handleClear, handleDecimal, handleBackspace]);

  // Auto-scaling text logic
  useEffect(() => {
    if (displayRef.current) {
      const container = displayRef.current;
      const text = container.firstChild as HTMLElement;
      if (text) {
        let fontSize = 80;
        text.style.fontSize = `${fontSize}px`;
        while (text.scrollWidth > container.clientWidth && fontSize > 20) {
          fontSize -= 2;
          text.style.fontSize = `${fontSize}px`;
        }
      }
    }
  }, [display]);

  const formatDisplay = (val: string) => {
    if (val === 'NaN') return 'Error';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    
    // Handle very large/small numbers with scientific notation
    if (Math.abs(num) > 999999999 || (Math.abs(num) < 0.0000001 && num !== 0)) {
      return num.toExponential(5);
    }

    // Format with commas
    const parts = val.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const Button = ({ 
    label, 
    onClick, 
    className = '', 
    wide = false,
    active = false
  }: { 
    label: string | React.ReactNode; 
    onClick: () => void; 
    className?: string;
    wide?: boolean;
    active?: boolean;
  }) => (
    <motion.button
      whileTap={{ scale: 0.92, filter: 'brightness(1.2)' }}
      onClick={onClick}
      className={`
        relative flex items-center justify-center text-3xl font-medium rounded-full transition-colors duration-200
        ${wide ? 'col-span-2 aspect-[2/1] rounded-[45px] justify-start px-8' : 'aspect-square'}
        ${className}
        ${active ? 'bg-white !text-[#ff9500]' : ''}
      `}
    >
      {label}
    </motion.button>
  );

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-gray-100'}`}>
      {/* Top Controls */}
      <div className="fixed top-6 left-0 right-0 flex justify-center gap-4 z-50">
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-3 rounded-full ${isDarkMode ? 'bg-zinc-800 text-yellow-400' : 'bg-white text-zinc-800 shadow-md'}`}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button 
          onClick={() => setIsSoundEnabled(!isSoundEnabled)}
          className={`p-3 rounded-full ${isDarkMode ? 'bg-zinc-800 text-blue-400' : 'bg-white text-zinc-800 shadow-md'}`}
        >
          {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        <button 
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className={`p-3 rounded-full ${isDarkMode ? 'bg-zinc-800 text-purple-400' : 'bg-white text-zinc-800 shadow-md'}`}
        >
          <History size={20} />
        </button>
      </div>

      <div className="relative w-full max-w-[360px] p-4">
        {/* Calculator Body */}
        <div className={`rounded-[50px] overflow-hidden shadow-2xl transition-colors duration-500 ${isDarkMode ? 'bg-black' : 'bg-white border border-gray-200'}`}>
          {/* Display */}
          <div 
            ref={displayRef}
            className="h-48 flex items-end justify-end px-6 pb-4 overflow-hidden"
          >
            <span className={`font-light transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              {formatDisplay(display)}
            </span>
          </div>

          {/* Buttons Grid */}
          <div className="grid grid-cols-4 gap-3 p-4">
            {/* Row 1 */}
            <Button 
              label={display === '0' ? 'AC' : 'C'} 
              onClick={handleClear} 
              className={isDarkMode ? 'bg-[#a5a5a5] text-black' : 'bg-gray-300 text-black'} 
            />
            <Button 
              label="+/-" 
              onClick={handleToggleSign} 
              className={isDarkMode ? 'bg-[#a5a5a5] text-black' : 'bg-gray-300 text-black'} 
            />
            <Button 
              label="%" 
              onClick={handlePercent} 
              className={isDarkMode ? 'bg-[#a5a5a5] text-black' : 'bg-gray-300 text-black'} 
            />
            <Button 
              label="÷" 
              onClick={() => handleOperator('/')} 
              className="bg-[#ff9500] text-white" 
              active={activeOperator === '/'}
            />

            {/* Row 2 */}
            <Button 
              label="7" 
              onClick={() => handleNumber('7')} 
              className={isDarkMode ? 'bg-[#333333] text-white' : 'bg-gray-200 text-black'} 
            />
            <Button 
              label="8" 
              onClick={() => handleNumber('8')} 
              className={isDarkMode ? 'bg-[#333333] text-white' : 'bg-gray-200 text-black'} 
            />
            <Button 
              label="9" 
              onClick={() => handleNumber('9')} 
              className={isDarkMode ? 'bg-[#333333] text-white' : 'bg-gray-200 text-black'} 
            />
            <Button 
              label="×" 
              onClick={() => handleOperator('*')} 
              className="bg-[#ff9500] text-white" 
              active={activeOperator === '*'}
            />

            {/* Row 3 */}
            <Button 
              label="4" 
              onClick={() => handleNumber('4')} 
              className={isDarkMode ? 'bg-[#333333] text-white' : 'bg-gray-200 text-black'} 
            />
            <Button 
              label="5" 
              onClick={() => handleNumber('5')} 
              className={isDarkMode ? 'bg-[#333333] text-white' : 'bg-gray-200 text-black'} 
            />
            <Button 
              label="6" 
              onClick={() => handleNumber('6')} 
              className={isDarkMode ? 'bg-[#333333] text-white' : 'bg-gray-200 text-black'} 
            />
            <Button 
              label="−" 
              onClick={() => handleOperator('-')} 
              className="bg-[#ff9500] text-white" 
              active={activeOperator === '-'}
            />

            {/* Row 4 */}
            <Button 
              label="1" 
              onClick={() => handleNumber('1')} 
              className={isDarkMode ? 'bg-[#333333] text-white' : 'bg-gray-200 text-black'} 
            />
            <Button 
              label="2" 
              onClick={() => handleNumber('2')} 
              className={isDarkMode ? 'bg-[#333333] text-white' : 'bg-gray-200 text-black'} 
            />
            <Button 
              label="3" 
              onClick={() => handleNumber('3')} 
              className={isDarkMode ? 'bg-[#333333] text-white' : 'bg-gray-200 text-black'} 
            />
            <Button 
              label="+" 
              onClick={() => handleOperator('+')} 
              className="bg-[#ff9500] text-white" 
              active={activeOperator === '+'}
            />

            {/* Row 5 */}
            <Button 
              label="0" 
              onClick={() => handleNumber('0')} 
              wide 
              className={isDarkMode ? 'bg-[#333333] text-white' : 'bg-gray-200 text-black'} 
            />
            <Button 
              label="." 
              onClick={handleDecimal} 
              className={isDarkMode ? 'bg-[#333333] text-white' : 'bg-gray-200 text-black'} 
            />
            <Button 
              label="=" 
              onClick={handleEqual} 
              className="bg-[#ff9500] text-white" 
            />
          </div>
        </div>

        {/* History Panel Overlay */}
        <AnimatePresence>
          {isHistoryOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`absolute inset-0 z-40 rounded-[50px] p-8 flex flex-col ${isDarkMode ? 'bg-zinc-900/95 text-white' : 'bg-white/95 text-black border border-gray-200'}`}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">History</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setHistory([])}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button 
                    onClick={() => setIsHistoryOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Delete size={18} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {history.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-zinc-500 italic">
                    No history yet
                  </div>
                ) : (
                  history.map((item) => (
                    <div 
                      key={item.timestamp} 
                      className="text-right border-b border-zinc-800 pb-2 cursor-pointer hover:bg-white/5 transition-colors p-2 rounded"
                      onClick={() => {
                        setDisplay(item.result);
                        setIsHistoryOpen(false);
                      }}
                    >
                      <div className="text-sm text-zinc-500">{item.expression}</div>
                      <div className="text-xl font-medium">= {formatDisplay(item.result)}</div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
