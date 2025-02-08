import React, { useState } from 'react';
import { Play, ChevronRight, Edit2, Trash2, StopCircle, Save } from 'lucide-react';

const PatternBank = ({ 
  patterns = [],
  onPatternLoad,
  onPatternDelete,
  onAddToArrangement,
  onPlayPattern,
  onStopPattern,
  currentlyPlaying,
  onSaveToSlot
}) => {
  const [selectedPattern, setSelectedPattern] = useState(null);
  const MAX_PATTERNS = 8;

  return (
    <div className="bg-gray-200 p-4 border-2 border-t-pink-500 border-l-pink-500 border-b-white border-r-white">
      <div className="flex justify-between items-center mb-4">
      <h2 className="text-sm font-bold">
  Pattern Bank ({patterns.filter(p => p !== undefined).length}/{MAX_PATTERNS})
</h2>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {Array(MAX_PATTERNS).fill(undefined).map((_, index) => {
          const pattern = patterns[index];
          const isSelected = selectedPattern === pattern?.id;
          const isPlaying = currentlyPlaying === pattern?.id;

          return (
            <div
              key={index}
              className={`p-2 border-2 ${pattern ? 'cursor-pointer' : 'bg-gray-100'} 
                ${isSelected 
                  ? 'border-t-pink-500 border-l-pink-500 border-b-white border-r-white' 
                  : 'border-t-white border-l-white border-b-pink-500 border-r-pink-500'
                }`}
            >
              {pattern ? (
                <>
                  <div className="text-sm font-bold mb-2">
                    Pattern {pattern.name}
                  </div>

                  <div className="grid grid-cols-16 gap-px mb-2">
                    {[...Array(16)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-2 h-2 border ${
                          pattern.sequence?.kick?.[i] ? 'bg-blue-500 border-blue-600' : 'bg-gray-300 border-gray-400'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="text-xs text-gray-600 mb-2">
                    <span>{pattern.tempo} BPM</span>
                    {pattern.swing > 0 && <span className="ml-2">{pattern.swing}% Swing</span>}
                  </div>

                  <div className="flex justify-between gap-1">
  <button 
    className={`w-8 h-8 flex items-center justify-center
      border-2 ${isPlaying 
        ? 'border-t-pink-500 border-l-pink-500 border-b-white border-r-white' 
        : 'border-t-white border-l-white border-b-pink-500 border-r-pink-500'
      }`}
    onClick={() => isPlaying ? onStopPattern() : onPlayPattern(pattern)}
  >
    {isPlaying ? <StopCircle size={14} /> : <Play size={14} />}
  </button>

  <button 
    className="w-8 h-8 flex items-center justify-center
      border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
    onClick={() => onPatternLoad(pattern)}
  >
     {isPlaying ? <Save size={14} /> : <Edit2 size={14} />}
  </button>

  <button 
   className="w-8 h-8 flex items-center justify-center
   border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
 onClick={() => {
   onAddToArrangement(pattern);
   // Show feedback to user
   const messageDiv = document.createElement('div');
   messageDiv.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg';
   messageDiv.textContent = `Pattern ${pattern.name} added to arrangement`;
   document.body.appendChild(messageDiv);
   setTimeout(() => {
     document.body.removeChild(messageDiv);
   }, 2000);
 }}
>
    <ChevronRight size={14} />
  </button>

  <button 
    className="w-8 h-8 flex items-center justify-center
      border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
    onClick={() => onPatternDelete(pattern.id)}
  >
    <Trash2 size={14} />
  </button>
</div>
                </>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center">
                  <div className="text-gray-400 text-sm mb-4">Empty Slot</div>
                  <button 
                    className="px-4 py-2 flex items-center gap-2 text-xs
                      border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
                    onClick={() => onSaveToSlot(index)}
                  >
                    <Save size={14} />
                    <span>Save Here</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {patterns.length === MAX_PATTERNS && (
        <div className="mt-4 text-red-500 text-sm text-center">
          Pattern bank full! Delete patterns to make room.
        </div>
      )}
    </div>
  );
};

export default PatternBank;