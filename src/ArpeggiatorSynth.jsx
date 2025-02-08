import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

const baseNotes = {
  0: 130.81,  // C3
  1: 138.59,  // C#3
  2: 146.83,  // D3
  3: 155.56,  // D#3
  4: 164.81,  // E3
  5: 174.61,  // F3
  6: 185.00,  // F#3
  7: 196.00,  // G3
  8: 207.65,  // G#3
  9: 220.00,  // A3
  10: 233.08, // A#3
  11: 246.94, // B3
  12: 261.63, // C4
  13: 277.18, // C#4
  14: 293.66, // D4
  15: 311.13  // D#4
};

const noteNames = {
  0: "C", 1: "C#", 2: "D", 3: "D#", 4: "E", 5: "F",
  6: "F#", 7: "G", 8: "G#", 9: "A", 10: "A#", 11: "B",
  12: "C", 13: "C#", 14: "D", 15: "D#"
};



const EffectKnob = ({ value, onChange, label, min, max, step }) => {
  const knobRef = useRef(null);
  
  const rotation = useMemo(() => {
    const percentage = (value - min) / (max - min);
    return percentage * 270 - 135; 
  }, [value, min, max]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const knob = knobRef.current;
    const knobRect = knob.getBoundingClientRect();
    const knobCenter = {
      x: knobRect.left + knobRect.width / 2,
      y: knobRect.top + knobRect.height / 2
    };
    
    const handleMouseMove = (e) => {
      const deltaY = -(e.clientY - knobCenter.y);
      const deltaX = e.clientX - knobCenter.x;
      const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
      
      
      let normalizedAngle = angle + 135; 
      if (normalizedAngle < 0) normalizedAngle += 360;
      if (normalizedAngle > 270) normalizedAngle = 270;
      
      const percentage = normalizedAngle / 270;
      const newValue = min + percentage * (max - min);
      onChange(Math.min(max, Math.max(min, Math.round(newValue / step) * step)));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [min, max, step, onChange]);

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs">{label}</div>
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        className="w-8 h-8 rounded-full bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500 relative cursor-pointer"
      >
        <div
          className="absolute w-1 h-3 bg-black top-1"
          style={{
            left: '50%',
            transformOrigin: 'bottom',
            transform: `translateX(-50%) rotate(${rotation}deg)`
          }}
        />
      </div>
      <div className="text-xs mt-1">
        {label === 'Cutoff' ? `${(value/1000).toFixed(1)}k` : value.toFixed(1)}
      </div>
    </div>
  );
};

const ArpeggiatorSynth = ({ audioContext, currentStep, isPlaying, tempo, arpeggiatorState, onStateChange }) => {
  const {
    waveform,
    octaveShift,
    pattern,
    noteLength,
    delayAmount,
    feedback,
    cutoff,
    resonance
  } = arpeggiatorState;
  const [selectedStep, setSelectedStep] = useState(null);

  const currentOscillator = useRef(null);
  const currentGain = useRef(null);

  
  // Effect parameters

  const setWaveform = (value) => onStateChange({ ...arpeggiatorState, waveform: value });
  const setOctaveShift = (value) => onStateChange({ 
    octaveShift: typeof value === 'function' ? value(octaveShift) : value 
  });
  const setPattern = (value) => {
    const newPattern = typeof value === 'function' ? value(pattern) : value;
    onStateChange({
      ...arpeggiatorState,
      pattern: newPattern
    });
  };
  const setNoteLength = (value) => onStateChange({ 
    noteLength: typeof value === 'function' ? value(noteLength) : value 
  });
  const setDelayAmount = (value) => onStateChange({ delayAmount: value });
  const setFeedback = (value) => onStateChange({ feedback: value });
  const setCutoff = (value) => onStateChange({ cutoff: value });
  const setResonance = (value) => onStateChange({ resonance: value })



  // Calculate frequencies with octave shift
  const synthNotes = useMemo(() => {
    return Object.entries(baseNotes).reduce((acc, [key, freq]) => {
      acc[key] = freq * Math.pow(2, octaveShift);
      return acc;
    }, {});
  }, [octaveShift]);

  const cleanupSound = useCallback(() => {
    if (currentOscillator.current) {
      currentOscillator.current.stop();
      currentOscillator.current.disconnect();
      currentOscillator.current = null;
    }
    if (currentGain.current) {
      currentGain.current.disconnect();
      currentGain.current = null;
    }
  }, []);

  const playNote = useCallback((noteIndex) => {
    if (!audioContext || noteIndex === null) return;

    cleanupSound();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const delay = audioContext.createDelay();
    const feedbackGain = audioContext.createGain();
    
    
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = resonance;

    
    delay.delayTime.value = delayAmount;
    feedbackGain.gain.value = feedback;

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(synthNotes[noteIndex], audioContext.currentTime);
    
    const stepDuration = (60 / tempo) / 4;
    const noteDuration = stepDuration * noteLength;
    
    gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + noteDuration);
    
    // Connect audio nodes
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    gainNode.connect(delay);
    delay.connect(feedbackGain);
    feedbackGain.connect(delay);
    delay.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + noteDuration);
    
    currentOscillator.current = oscillator;
    currentGain.current = gainNode;
    
    setTimeout(cleanupSound, noteDuration * 1000);
  }, [audioContext, waveform, synthNotes, tempo, noteLength, cutoff, resonance, delayAmount, feedback]);

  useEffect(() => {
    if (isPlaying && pattern[currentStep] !== null) {
      playNote(pattern[currentStep]);
    }
  }, [currentStep, isPlaying, pattern, playNote]);

  const handleStepClick = useCallback((step) => {
    if (selectedStep === step) {
     
      setPattern(prev => {
        const newPattern = [...prev];
        newPattern[step] = null;
        return newPattern;
      });
      setSelectedStep(null);
    } else {
      
      if (pattern[step] === null) {
        
        setPattern(prev => {
          const newPattern = [...prev];
          newPattern[step] = 7; 
          return newPattern;
        });
      }
      
      setSelectedStep(step);
    }
  }, [selectedStep, pattern, setPattern]);

  const adjustNote = useCallback((step, direction) => {
    setPattern(prev => {
     
      const newPattern = [...prev];
      
      const currentNote = newPattern[step] === null ? 7 : newPattern[step];
      
      
      let newNote;
      if (direction === 'up') {
        newNote = currentNote < 15 ? currentNote + 1 : 0;
      } else {
        newNote = currentNote > 0 ? currentNote - 1 : 15;
      }
      
     
      newPattern[step] = newNote;
      return newPattern;
    });
  }, [setPattern]);

  return (
    <div className="grid grid-cols-[100px_1fr] items-center gap-2">
      <div className="text-left text-sm">arpeggiator</div>
      
      <div className="flex flex-col gap-2">
        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Octave controls */}
          <div className="flex gap-1">
            <button
              onClick={() => setOctaveShift(prev => Math.max(prev - 1, -2))}
              className="w-8 h-8 bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
            >
              <div className="text-xs">Oct-</div>
            </button>
            <button
              onClick={() => setOctaveShift(prev => Math.min(prev + 1, 2))}
              className="w-8 h-8 bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
            >
              <div className="text-xs">Oct+</div>
            </button>
          </div>

          {/* Waveform selection */}
          <div className="flex gap-1">
            {['sine', 'square', 'sawtooth', 'triangle'].map(type => (
              <button
                key={type}
                onClick={() => setWaveform(type)}
                className={`
                  w-8 h-8
                  bg-gray-200
                  border-2
                  ${waveform === type 
                    ? 'border-t-pink-500 border-l-pink-500 border-b-white border-r-white' 
                    : 'border-t-white border-l-white border-b-pink-500 border-r-pink-500'}
                `}
              >
                <div className="text-[10px]">{type.slice(0,3)}</div>
              </button>
            ))}
          </div>

          {/* Note length control */}
          <div className="flex gap-1 items-center">
            <span className="text-xs mr-1">Length:</span>
            <button
              onClick={() => setNoteLength(prev => Math.min(prev + 0.2, 2.0))}
              className="w-6 h-6 bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
            >
              <div className="text-xs">+</div>
            </button>
            <div className="w-8 text-center text-xs">{noteLength.toFixed(1)}</div>
            <button
              onClick={() => setNoteLength(prev => Math.max(prev - 0.2, 0.2))}
              className="w-6 h-6 bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
            >
              <div className="text-xs">-</div>
            </button>
          </div>

          {/* Effect controls with knob styling */}
          <div className="flex items-center gap-4 ml-4">
            <EffectKnob
              label="Delay"
              value={delayAmount}
              onChange={setDelayAmount}
              min={0}
              max={0.8}
              step={0.1}
            />
            <EffectKnob
              label="Feedbk"
              value={feedback}
              onChange={setFeedback}
              min={0}
              max={0.9}
              step={0.1}
            />
            <EffectKnob
              label="Cutoff"
              value={cutoff}
              onChange={setCutoff}
              min={20}
              max={20000}
              step={100}
            />
            <EffectKnob
              label="Res"
              value={resonance}
              onChange={setResonance}
              min={0}
              max={20}
              step={0.5}
            />
          </div>
        </div>

        {/* Step sequencer */}
       
<div className="flex gap-0.5">
  {Array(16).fill(null).map((_, step) => (
    <div key={step} className="relative">
      <button
        onClick={() => handleStepClick(step)}
        className={`
          w-6 h-6
          bg-gray-200
          border-2
          ${pattern[step] !== null 
            ? 'border-t-pink-500 border-l-pink-500 border-b-white border-r-white' 
            : 'border-t-white border-l-white border-b-pink-500 border-r-pink-500'}
          relative
        `}
      >
        <div className={`w-full h-full flex items-center justify-center
          ${pattern[step] !== null ? 'bg-green-500' : ''} 
          ${currentStep === step ? 'border border-dotted border-black' : ''}`}
        >
          {pattern[step] !== null && (
            <span className="text-[10px] font-bold">
              {noteNames[pattern[step]]}
            </span>
          )}
        </div>
      </button>

      {selectedStep === step && (
        <div className="absolute left-0 -top-14 w-6 flex flex-col gap-0.5 z-10">
          <button
            onClick={() => adjustNote(step, 'up')}
            className="w-full h-6 bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500 flex items-center justify-center"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={() => adjustNote(step, 'down')}
            className="w-full h-6 bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500 flex items-center justify-center"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      )}
    </div>
  ))}
</div>
      </div>
    </div>
  );
};

export default ArpeggiatorSynth;