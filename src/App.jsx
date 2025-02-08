import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import ArpeggiatorSynth from './ArpeggiatorSynth';
import YouTubeEmbed from './YouTubeEmbed';
import PatternBank from './PatternBank';
import Arrangement from './Arrangement';








class DrumSynthesizer {
  constructor(context) {
    this.context = context;
  }

  createKick({ frequency = 50, decay = 0.5, tone = 0.7 }) {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1, this.context.currentTime + decay);
    
    gainNode.gain.setValueAtTime(tone, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + decay);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency * 2, this.context.currentTime);
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + decay);
    
    return { oscillator, gainNode, filter };
  }

  createHihat({ frequency = 2000, decay = 0.1, tone = 0.7 }) {
    const noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gainNode = this.context.createGain();
    
    noise.buffer = noiseBuffer;
    
    filter.type = 'highpass';
    filter.frequency.value = frequency;
    filter.Q.value = 8;
    
    gainNode.gain.setValueAtTime(tone, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + decay);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    noise.start(this.context.currentTime);
    noise.stop(this.context.currentTime + decay);
    
    return { noise, filter, gainNode };
  }

  createSnare({ frequency = 200, noiseFreq = 1000, decay = 0.2, tone = 0.7 }) {
    const oscillator = this.context.createOscillator();
    const oscillatorGain = this.context.createGain();
    
    const noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.context.createBufferSource();
    const noiseFilter = this.context.createBiquadFilter();
    const noiseGain = this.context.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    
    noise.buffer = noiseBuffer;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = noiseFreq;
    noiseFilter.Q.value = 1;
    
    oscillatorGain.gain.setValueAtTime(tone, this.context.currentTime);
    oscillatorGain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + decay * 0.7);
    
    noiseGain.gain.setValueAtTime(tone * 0.5, this.context.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + decay);
    
    oscillator.connect(oscillatorGain);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    
    oscillatorGain.connect(this.context.destination);
    noiseGain.connect(this.context.destination);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + decay);
    noise.start(this.context.currentTime);
    noise.stop(this.context.currentTime + decay);
    
    return { oscillator, noise, noiseFilter, oscillatorGain, noiseGain };
  }

  createTom({ frequency = 100, decay = 0.3, tone = 0.7 }) {
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, this.context.currentTime + decay);
    
    gainNode.gain.setValueAtTime(tone, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + decay);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    oscillator.start(this.context.currentTime);
    oscillator.stop(this.context.currentTime + decay);
    
    return { oscillator, gainNode };
  }

  createCrash({ frequency = 3000, decay = 1, tone = 0.7 }) {
    const noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gainNode = this.context.createGain();
    
    noise.buffer = noiseBuffer;
    
    filter.type = 'highpass';
    filter.frequency.value = frequency;
    filter.Q.value = 3;
    
    gainNode.gain.setValueAtTime(tone * 0.8, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + decay);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    noise.start(this.context.currentTime);
    noise.stop(this.context.currentTime + decay);
    
    return { noise, filter, gainNode };
  }

  createClap({ frequency = 1500, decay = 0.2, tone = 0.7 }) {
    const noise = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gainNode = this.context.createGain();
    
    const noiseBuffer = this.context.createBuffer(1, this.context.sampleRate * 2, this.context.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    noise.buffer = noiseBuffer;
    
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 2;
    
    gainNode.gain.setValueAtTime(0, this.context.currentTime);
    gainNode.gain.linearRampToValueAtTime(tone, this.context.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.02);
    gainNode.gain.linearRampToValueAtTime(tone * 0.8, this.context.currentTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + decay);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.context.destination);
    
    noise.start(this.context.currentTime);
    noise.stop(this.context.currentTime + decay);
    
    return { noise, filter, gainNode };
  }
}


const ParameterKnob = memo(({ value, onChange, label }) => {
  const knobRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef(0);
  const startValue = useRef(0);
  
  const getRange = () => {
    switch (label) {
      case 'frequency':
        return { min: 20, max: 2000, step: 1 };
      case 'noiseFreq':
        return { min: 200, max: 10000, step: 100 };
      case 'decay':
        return { min: 0.01, max: 2, step: 0.01 };
      case 'tone':
        return { min: 0, max: 1, step: 0.01 };
      default:
        return { min: 0, max: 100, step: 1 };
    }
  };

  const range = getRange();

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    startPos.current = e.clientY;
    startValue.current = value;
  }, [value]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const delta = startPos.current - e.clientY;
    const sensitivity = 2;
    const valueRange = range.max - range.min;
    const scaleFactor = valueRange / (100 / sensitivity);
    
    const newValue = Math.min(
      range.max,
      Math.max(
        range.min,
        startValue.current + (delta * scaleFactor)
      )
    );
    
    onChange(Number(newValue.toFixed(2)));
  }, [isDragging, onChange, range]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const rotation = ((value - range.min) / (range.max - range.min)) * 270 - 135;

  return (
    <div className="flex flex-col items-center">
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
      <div className="text-xs mt-1">{label}</div>
      <div className="text-xs">{value.toFixed(2)}</div>
    </div>
  );
});

const DrumMachine = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(120);
  const [swing, setSwing] = useState(50);
  const [activeStep, setActiveStep] = useState(0);
  const [arrangedPatterns, setArrangedPatterns] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [waveform, setWaveform] = useState('sine');
  const [synthSequence, setSynthSequence] = useState(Array(16).fill(null));
  const [sequence, setSequence] = useState({
    kick: Array(16).fill(false),
    snare: Array(16).fill(false),
    hihat: Array(16).fill(false),
    clap: Array(16).fill(false),
    tom: Array(16).fill(false),
    crash: Array(16).fill(false)
  });
  const [patterns, setPatterns] = useState([]);
  const [currentlyPlayingPattern, setCurrentlyPlayingPattern] = useState(null);
  const [drumParams, setDrumParams] = useState({
    kick: { frequency: 50, decay: 0.5, tone: 0.7 },
    hihat: { frequency: 2000, decay: 0.1, tone: 0.7 },
    snare: { frequency: 200, noiseFreq: 1000, decay: 0.2, tone: 0.7 },
    tom: { frequency: 100, decay: 0.3, tone: 0.7 },
    crash: { frequency: 3000, decay: 1, tone: 0.7 },
    clap: { frequency: 1500, decay: 0.2, tone: 0.7 }
  });
  const [arpeggiatorState, setArpeggiatorState] = useState({
    waveform: 'sawtooth',
    octaveShift: 0,
    pattern: Array(16).fill(null),
    noteLength: 1.0,
    delayAmount: 0.3,
    feedback: 0.3,
    cutoff: 2000,
    resonance: 1
  });

  // Refs
  const audioContextRef = useRef(null);
  const intervalRef = useRef(null);
  const synthesizerRef = useRef(null);
  

  // Audio initialization
  useEffect(() => {
    let isInitialized = false;

    const initAudio = async () => {
      if (isInitialized || audioContextRef.current) return;
      
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        synthesizerRef.current = new DrumSynthesizer(audioContextRef.current);
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        isInitialized = true;
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };

    const handleFirstInteraction = async () => {
      await initAudio();
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Playback functions
  const playSound = useCallback((sound) => {
    if (!audioContextRef.current || !synthesizerRef.current) {
      console.log('Audio context or synthesizer not ready');
      return;
    }

    try {
      switch (sound) {
        case 'kick':
          synthesizerRef.current.createKick(drumParams.kick);
          break;
        case 'hihat':
          synthesizerRef.current.createHihat(drumParams.hihat);
          break;
        case 'snare':
          synthesizerRef.current.createSnare(drumParams.snare);
          break;
        case 'tom':
          synthesizerRef.current.createTom(drumParams.tom);
          break;
        case 'crash':
          synthesizerRef.current.createCrash(drumParams.crash);
          break;
        case 'clap':
          synthesizerRef.current.createClap(drumParams.clap);
          break;
      }
    } catch (error) {
      console.error('Error playing synthesized sound:', error);
    }
  }, [drumParams]);

  
  const saveCurrentPattern = useCallback(() => {
    if (patterns.length >= 8) {
      alert('Pattern bank is full! Delete some patterns to make room.');
      return;
    }
  
    const newPattern = {
      id: Date.now(),
      name: patterns.length + 1,
      tempo,
      swing,
      sequence: { ...sequence },
      drumParams: { ...drumParams },
      arpeggiatorState: { ...arpeggiatorState }
    };
  
    setPatterns(prev => [...prev, newPattern]);
  }, [patterns, tempo, swing, sequence, drumParams, arpeggiatorState]);

  const handleSaveToSlot = useCallback((slotIndex) => {
    const newPattern = {
      id: Date.now(),
      name: slotIndex + 1,
      tempo,
      swing,
      sequence: { ...sequence },
      drumParams: { ...drumParams },
      arpeggiatorState: { ...arpeggiatorState }
    };
  
    setPatterns(prev => {
      const newPatterns = [...prev];
      newPatterns[slotIndex] = newPattern;
      return newPatterns;
    });
  }, [tempo, swing, sequence, drumParams, arpeggiatorState]);

  const loadPattern = useCallback((pattern) => {
    setTempo(pattern.tempo);
    setSwing(pattern.swing);
    setSequence(pattern.sequence);
    setDrumParams(pattern.drumParams);
    setArpeggiatorState(pattern.arpeggiatorState);
    setActiveStep(0);
  }, []);

  const handleEditPattern = useCallback((pattern) => {
    if (currentlyPlayingPattern === pattern.id) {
      
      setPatterns(prev => {
        const newPatterns = [...prev];
        const indexToUpdate = newPatterns.findIndex(p => p?.id === pattern.id);
        if (indexToUpdate !== -1) {
          newPatterns[indexToUpdate] = {
            ...pattern,
            tempo,
            swing,
            sequence: { ...sequence },
            drumParams: { ...drumParams },
            arpeggiatorState: {...arpeggiatorState}
          };
        }
        return newPatterns;
      });
  
      // Show a temporary success message
      const messageDiv = document.createElement('div');
      messageDiv.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg';
      messageDiv.textContent = `Pattern ${pattern.name} updated`;
      document.body.appendChild(messageDiv);
      setTimeout(() => {
        document.body.removeChild(messageDiv);
      }, 2000);
    } else {
      // If not currently playing, load the pattern
      loadPattern(pattern);
      setCurrentlyPlayingPattern(pattern.id);
      setIsPlaying(true);
    }
  }, [currentlyPlayingPattern, tempo, swing, sequence, drumParams, arpeggiatorState, loadPattern]);

  const deletePattern = useCallback((patternId) => {
    setPatterns(prev => {
      const newPatterns = [...prev];
      // Find the pattern with this ID
      const indexToDelete = newPatterns.findIndex(p => p?.id === patternId);
      if (indexToDelete !== -1) {
        // Instead of filtering or moving patterns, just set this slot to undefined
        newPatterns[indexToDelete] = undefined;
      }
      return newPatterns;
    });
    
    if (currentlyPlayingPattern === patternId) {
      setCurrentlyPlayingPattern(null);
      setIsPlaying(false);
    }
  }, [currentlyPlayingPattern]);

  const playPattern = useCallback((pattern) => {
    if (currentlyPlayingPattern === pattern.id) {
      setCurrentlyPlayingPattern(null);
      setIsPlaying(false);
    } else {
      loadPattern(pattern);
      setCurrentlyPlayingPattern(pattern.id);
      setIsPlaying(true);
    }
  }, [currentlyPlayingPattern, loadPattern]);

  const addPatternToArrangement = useCallback((pattern) => {
    setArrangedPatterns(prev => [...prev, { ...pattern }]);
  }, []);


  // Move pattern within arrangement
const movePatternInArrangement = useCallback((fromIndex, direction) => {
  const toIndex = fromIndex + direction;
  if (toIndex >= 0 && toIndex < arrangedPatterns.length) {
    setArrangedPatterns(prev => {
      const newArrangement = [...prev];
      const [movedPattern] = newArrangement.splice(fromIndex, 1);
      newArrangement.splice(toIndex, 0, movedPattern);
      return newArrangement;
    });
  }
}, [arrangedPatterns.length]);

const copyPatternInArrangement = useCallback((pattern, index) => {
  setArrangedPatterns(prev => {
    const newArrangement = [...prev];
    const patternCopy = { 
      ...pattern, 
      id: Date.now(),
      name: `${pattern.name}_copy`
    };
    newArrangement.splice(index + 1, 0, patternCopy);
    return newArrangement;
  });
}, []);

  // Delete pattern from arrangement
const deleteFromArrangement = useCallback((index) => {
  setArrangedPatterns(prev => prev.filter((_, i) => i !== index));
}, []);


  // Export handler
const handleExportArrangement = useCallback(() => {
  console.log('Exporting arrangement:', arrangedPatterns);
}, [arrangedPatterns]);


 // Sequencer effect
useEffect(() => {
  if (!isPlaying) {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    return;
  }

  const baseStepTime = (60000 / tempo) / 4; // Base time for 16th notes
  let nextStepTime = audioContextRef.current.currentTime;
  
  const scheduleNextStep = () => {
    if (!isPlaying) return; // Additional check to prevent zombie timeouts
    
    setActiveStep(prevStep => {
      const nextStep = (prevStep + 1) % 16;
      
      
      const swingOffset = nextStep % 2 === 1 
        ? (swing / 100) * (baseStepTime * 0.66667)
        : 0;
      
      const currentTime = audioContextRef.current.currentTime;
      nextStepTime = currentTime + (baseStepTime / 1000);
      
      // Play drum sounds
      Object.entries(sequence).forEach(([sound, steps]) => {
        if (steps[nextStep]) {
          playSound(sound);
        }
      });
    
      
      // Schedule next step with swing
      const nextStepDelay = baseStepTime + swingOffset;
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
      intervalRef.current = setTimeout(scheduleNextStep, nextStepDelay);
      
      return nextStep;
    });
  };

  // Initial step schedule
  intervalRef.current = setTimeout(scheduleNextStep, baseStepTime);

  // Cleanup
  return () => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  };
}, [isPlaying, tempo, sequence, playSound, swing]);

  // Event handlers
  const handleDrumParamChange = useCallback((sound, param, value) => {
    setDrumParams(prev => ({
      ...prev,
      [sound]: {
        ...prev[sound],
        [param]: value
      }
    }));
  }, []);

  const toggleStep = useCallback((sound, stepIndex) => {
    setSequence(prev => ({
      ...prev,
      [sound]: prev[sound].map((active, index) => 
        index === stepIndex ? !active : active
      )
    }));
  }, []);

  const handlePlayPause = useCallback(async () => {
    
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        synthesizerRef.current = new DrumSynthesizer(audioContextRef.current);
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      } catch (error) {
        console.error('Error initializing audio:', error);
        return;
      }
    }
    
    // Toggle play state
    setIsPlaying(prev => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setActiveStep(0);
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const handleArpeggiatorStateChange = useCallback((newState) => {
    setArpeggiatorState(prevState => ({
      ...prevState,
      ...newState
    }));
  }, []);

  return (
    <div className="bg-gray-200 p-4 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500 max-w-4xl mx-auto font-mono">
      {/* Title Bar */}
      <div className="bg-blue-800 text-white px-2 py-1 flex justify-between items-center mb-4">
        <span className="font-bold">Professor Beat PhD</span>
        <div className="flex">
          <button className="px-2 border border-white hover:bg-blue-700 active:bg-blue-900">_</button>
          <button className="px-2 border border-white hover:bg-blue-700 active:bg-blue-900">□</button>
          <button className="px-2 border border-white hover:bg-blue-700 active:bg-blue-900">×</button>
        </div>
      </div>
      <div className="mb-4">
        <PatternBank
          patterns={patterns}
          onPatternLoad={handleEditPattern} 
          onPatternDelete={deletePattern}
          onAddToArrangement={addPatternToArrangement}
          onPlayPattern={playPattern}
          onStopPattern={() => {
            setCurrentlyPlayingPattern(null);
            setIsPlaying(false);
          }}
          currentlyPlaying={currentlyPlayingPattern}
          onSaveToSlot={handleSaveToSlot}  
        />
      </div>
      <div className="border-2 border-t-pink-500 border-l-pink-500 border-b-white border-r-white">
          <Arrangement
            arrangedPatterns={arrangedPatterns}
            onExport={handleExportArrangement}
            onDeletePattern={deleteFromArrangement}
            onMovePattern={movePatternInArrangement}
            onCopyPattern={copyPatternInArrangement}
            audioContext={audioContextRef.current}
            synthesizer={synthesizerRef.current}
          />
        </div>

      {/* Controls Panel */}
<div className="flex p-4 border-2 border-t-pink-500 border-l-pink-500 border-b-white border-r-white mb-4">
  {/* Tempo and Swing Controls */}
  <div className="flex-1">
    <div className="flex items-center mb-4">
      <span className="mr-2 w-16">Tempo:</span>
      <div className="flex-grow mx-4">
        <div className="relative w-full h-6 bg-gray-200 border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white overflow-hidden">
          <div 
            className="absolute top-0 bottom-0 left-0 overflow-hidden"
            style={{
              width: `${((tempo - 60) / (180 - 60)) * 100}%`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'repeating-linear-gradient(45deg, black, black 10px, white 10px, white 20px)',
                animation: 'moveStripes 1s linear infinite',
                backgroundSize: '28px 28px'
              }}
            />
          </div>
          
          <input
            type="range"
            min={60}
            max={180}
            value={tempo}
            onChange={e => setTempo(Number(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer"
          />
          
          <div 
            className="absolute top-0 bottom-0 w-4 bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
            style={{
              left: `${((tempo - 60) / (180 - 60)) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          />
        </div>
      </div>
      <span className="ml-2 w-16">{tempo} BPM</span>
    </div>

    <div className="flex items-center">
      <span className="mr-2 w-16">Swing:</span>
      <div className="flex-grow mx-4">
        <div className="relative w-full h-6 bg-gray-200 border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white overflow-hidden">
          <div 
            className="absolute top-0 bottom-0 left-0 overflow-hidden"
            style={{
              width: `${swing}%`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'repeating-linear-gradient(45deg, black, black 10px, white 10px, white 20px)',
                animation: 'moveStripes 1s linear infinite',
                backgroundSize: '28px 28px'
              }}
            />
          </div>
          
          <input
            type="range"
            min={0}
            max={100}
            value={swing}
            onChange={e => setSwing(Number(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer"
          />
          
          <div 
            className="absolute top-0 bottom-0 w-4 bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
            style={{
              left: `${swing}%`,
              transform: 'translateX(-50%)'
            }}
          />
        </div>
      </div>
      <span className="ml-2 w-16">{swing}%</span>
    </div>
  </div>

  {/* YouTube Embed */}
  <div className="ml-4">
    <YouTubeEmbed />
  </div>
</div>
      

     {/* Sequencer Grid - Modified for better layout */}
     <div className="p-4 border-2 border-t-pink-500 border-l-pink-500 border-b-white border-r-white mb-4">
        <div className="space-y-2">
          {Object.keys(sequence).map(sound => (
            <div key={sound} className="grid grid-cols-[80px_300px_1fr] items-center gap-2">
              {/* Sound name */}
              <div className="text-left text-sm">{sound}</div>

              {/* Parameters section */}
              <div className="flex gap-4 justify-start pl-4">
                {Object.entries(drumParams[sound]).map(([param, value]) => (
                  <ParameterKnob
                    key={`${sound}-${param}`}
                    value={value}
                    onChange={(newValue) => handleDrumParamChange(sound, param, newValue)}
                    label={param}
                  />
                ))}
              </div>

              {/* Step sequencer buttons */}
              <div className="flex gap-0.5">
                {Array(16).fill(null).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => toggleStep(sound, index)}
                    className={`
                      w-6 h-6
                      bg-gray-200
                      border-2
                      ${sequence[sound][index] 
                        ? 'border-t-pink-500 border-l-pink-500 border-b-white border-r-white' 
                        : 'border-t-white border-l-white border-b-pink-500 border-r-pink-500'}
                    `}
                  >
                    <div className={`w-full h-full 
                      ${sequence[sound][index] ? 'bg-blue-600' : ''} 
                      ${activeStep === index ? 'border border-dotted border-black' : ''}`} 
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Synth Track */}
          <div className="mt-4 pt-4 border-t-2 border-gray-400">
  <ArpeggiatorSynth 
    audioContext={audioContextRef.current}
    currentStep={activeStep}
    isPlaying={isPlaying}
    tempo={tempo}
    arpeggiatorState={arpeggiatorState}
    onStateChange={handleArpeggiatorStateChange}
  />
</div>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex justify-center gap-2">
        <button
          onClick={handlePlayPause}
          className={`
            w-10 h-10
            bg-gray-200
            border-2
            ${isPlaying 
              ? 'border-t-pink-500 border-l-pink-500 border-b-white border-r-white' 
              : 'border-t-white border-l-white border-b-pink-500 border-r-pink-500'}
          `}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={handleReset}
          className="w-10 h-10 bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
};

// Add the animation keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes moveStripes {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 28px 0;
    }
  }
`;
document.head.appendChild(styleSheet);

export default DrumMachine;