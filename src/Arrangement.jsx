import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Copy, Trash2, Download, AlertCircle } from 'lucide-react';
import ArpeggiatorSynth from './ArpeggiatorSynth';
import AudioRenderer from './AudioRenderer';

const Arrangement = ({ 
  arrangedPatterns = [], 
  onExport, 
  onDeletePattern, 
  onMovePattern, 
  onCopyPattern,
  audioContext,
  synthesizer
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPatternIndex, setSelectedPatternIndex] = useState(null);
  const [currentPatternStep, setCurrentPatternStep] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  const schedulerRef = useRef({
    nextStepTime: 0,
    currentPatternIndex: 0,
    stepWithinPattern: 0,
    scheduledEvents: [],
  });

  
  useEffect(() => {
    if (exportSuccess || exportError) {
      const timer = setTimeout(() => {
        setExportSuccess(false);
        setExportError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [exportSuccess, exportError]);

  
  useEffect(() => {
    if (!isPlaying || !audioContext || !synthesizer) return;

    const SCHEDULE_AHEAD_TIME = 0.1;
    const CHECK_INTERVAL = 25;

    const schedulePattern = (patternIndex, stepIndex, time) => {
      const pattern = arrangedPatterns[patternIndex];
      if (!pattern) return null;

      const stepTime = (60 / pattern.tempo) / 4;
      const swingOffset = stepIndex % 2 === 1 ? 
        (pattern.swing / 100) * (stepTime * 0.66667) : 0;
      const actualStepTime = stepTime + swingOffset;

      try {
        
        Object.entries(pattern.sequence).forEach(([sound, steps]) => {
          if (steps[stepIndex]) {
            switch (sound) {
              case 'kick':
                synthesizer.createKick(pattern.drumParams.kick);
                break;
              case 'hihat':
                synthesizer.createHihat(pattern.drumParams.hihat);
                break;
              case 'snare':
                synthesizer.createSnare(pattern.drumParams.snare);
                break;
              case 'tom':
                synthesizer.createTom(pattern.drumParams.tom);
                break;
              case 'crash':
                synthesizer.createCrash(pattern.drumParams.crash);
                break;
              case 'clap':
                synthesizer.createClap(pattern.drumParams.clap);
                break;
            }
          }
        });
      } catch (error) {
        console.error('Error scheduling pattern:', error);
      }

      setCurrentPatternStep(stepIndex);
      return actualStepTime;
    };

    const scheduler = setInterval(() => {
      while (schedulerRef.current.nextStepTime < audioContext.currentTime + SCHEDULE_AHEAD_TIME) {
        const { currentPatternIndex, stepWithinPattern } = schedulerRef.current;
        
        if (currentPatternIndex >= arrangedPatterns.length) {
          handleReset();
          return;
        }

        const stepTime = schedulePattern(
          currentPatternIndex,
          stepWithinPattern,
          schedulerRef.current.nextStepTime
        );

        if (stepTime) {
          schedulerRef.current.nextStepTime += stepTime;
          
          if (stepWithinPattern === 15) {
            schedulerRef.current.currentPatternIndex++;
            schedulerRef.current.stepWithinPattern = 0;
            setCurrentStep(prev => prev + 1);
          } else {
            schedulerRef.current.stepWithinPattern++;
          }
        }
      }
    }, CHECK_INTERVAL);

    return () => {
      clearInterval(scheduler);
      schedulerRef.current.scheduledEvents = [];
    };
  }, [isPlaying, arrangedPatterns, audioContext, synthesizer]);

  const handlePlayPause = () => {
    if (!audioContext || !synthesizer) {
      setExportError('Audio system not initialized');
      return;
    }

    if (!isPlaying) {
      schedulerRef.current = {
        nextStepTime: audioContext.currentTime,
        currentPatternIndex: 0,
        stepWithinPattern: 0,
        scheduledEvents: [],
      };
      setCurrentStep(0);
      setCurrentPatternStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setCurrentPatternStep(0);
    schedulerRef.current = {
      nextStepTime: 0,
      currentPatternIndex: 0,
      stepWithinPattern: 0,
      scheduledEvents: [],
    };
  };

  const validateAudioSystem = () => {
    if (!audioContext) {
      throw new Error('Audio context not initialized');
    }
    if (!synthesizer) {
      throw new Error('Synthesizer not initialized');
    }
    if (audioContext.state === 'suspended') {
      throw new Error('Audio context is suspended');
    }
  };

  const handleExport = async () => {
    if (!arrangedPatterns.length) {
      setExportError('No patterns to export');
      return;
    }
  
    setExportError(null);
    setExportSuccess(false);
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      validateAudioSystem();
      
      console.log('Starting export process...');
      const renderer = new AudioRenderer(audioContext, synthesizer);
      
      
      const audioArrayBuffer = await renderer.renderArrangement(
        arrangedPatterns,
        (progress) => {
          setExportProgress(progress);
        }
      );
      
      console.log('Render complete, creating blob...');
      
     
      const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/wav' });
      
     
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
     
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drumsmith-arrangement-${timestamp}.wav`;
      a.click();
      
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      console.log('Export complete!');
      
    } catch (error) {
      console.error('Export failed:', error);
      setExportError(error.message || 'Failed to export arrangement');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Get current pattern's arpeggiator state
  const currentPattern = arrangedPatterns[currentStep];
  const currentArpeggiatorState = currentPattern?.arpeggiatorState;

  return (
    <div className="bg-gray-200 p-4 border-2 border-t-pink-500 border-l-pink-500 border-b-white border-r-white mt-4">
      {/* Hidden ArpeggiatorSynth for playback */}
      {currentPattern && (
        <div style={{ display: 'none' }}>
          <ArpeggiatorSynth
            audioContext={audioContext}
            currentStep={currentPatternStep}
            isPlaying={isPlaying}
            tempo={currentPattern.tempo}
            arpeggiatorState={currentArpeggiatorState || {
              waveform: 'sawtooth',
              octaveShift: 0,
              pattern: Array(16).fill(null),
              noteLength: 1.0,
              delayAmount: 0.3,
              feedback: 0.3,
              cutoff: 2000,
              resonance: 1
            }}
            onStateChange={() => {}} // Read-only during arrangement playback
          />
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-bold">Arrangement</h2>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting || !arrangedPatterns.length}
            className={`px-4 py-2 flex items-center gap-2 text-xs border-2 
              ${isExporting || !arrangedPatterns.length ? 'opacity-50 cursor-not-allowed' : ''}
              border-t-white border-l-white border-b-pink-500 border-r-pink-500
              ${isExporting ? 'animate-pulse' : ''}`}
          >
            <Download size={14} />
            <span>
              {isExporting 
                ? `Exporting (${exportProgress}%)` 
                : 'Export WAV'}
            </span>
          </button>
          
          {/* Export Status Messages */}
          {exportError && (
  <div className="flex items-center gap-2 bg-gray-200 px-3 py-2 mt-2 border-2 border-t-pink-500 border-l-pink-500 border-b-white border-r-white">
    <AlertCircle className="h-4 w-4 text-pink-500" />
    <span className="text-xs text-pink-500">{exportError}</span>
  </div>
)}

{exportSuccess && (
  <div className="flex items-center gap-2 bg-gray-200 px-3 py-2 mt-2 border-2 border-t-pink-500 border-l-pink-500 border-b-white border-r-white">
    <span className="text-xs text-pink-500">Export completed successfully!</span>
  </div>
)}
        </div>
      </div>

      {/* Timeline and grid container */}
      <div className="border-2 border-t-gray-500 border-l-gray-500 border-b-white border-r-white mb-4">
        {/* Time markers */}
        <div className="flex h-6 bg-gray-300 border-b border-gray-400">
          {Array(16).fill(0).map((_, i) => (
            <div 
              key={i} 
              className="w-16 text-xs border-r border-gray-400 px-1 flex items-center justify-center"
            >
              {`${Math.floor(i * 4 / 4)}:${((i * 4) % 4).toString().padStart(2, '0')}`}
            </div>
          ))}
        </div>

        {/* Pattern grid with scrollbar */}
        <div className="relative overflow-hidden bg-gray-100">
          <div className="overflow-x-auto" style={{ paddingBottom: '12px', marginBottom: '-12px' }}>
            <div className="flex gap-2 p-2 min-h-[100px]">
              {arrangedPatterns.length === 0 ? (
                <div className="flex items-center justify-center w-full h-full text-gray-500 text-sm">
                  Add patterns from the Pattern Bank to create your arrangement
                </div>
              ) : (
                arrangedPatterns.map((pattern, index) => (
                  <div
                    key={pattern.id}
                    onClick={() => setSelectedPatternIndex(index)}
                    className={`
                      flex-shrink-0 w-16 h-16 bg-gray-200 cursor-pointer
                      border-2 ${selectedPatternIndex === index 
                        ? 'border-t-pink-500 border-l-pink-500 border-b-white border-r-white' 
                        : 'border-t-white border-l-white border-b-pink-500 border-r-pink-500'
                      } ${currentStep === index ? 'ring-2 ring-blue-500' : ''}
                    `}
                  >
                    <div className="h-full flex flex-col">
                      <div className="text-xs font-bold px-1 text-center border-b border-gray-300">
                        P{pattern.name}
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="grid grid-cols-4 gap-px">
                          {[...Array(4)].map((_, i) => (
                            <div 
                              key={i}
                              className={`w-2 h-2 ${
                                pattern.sequence?.kick?.[i * 4] 
                                  ? 'bg-blue-500' 
                                  : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Playhead */}
          {isPlaying && arrangedPatterns.length > 0 && (
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 transition-all duration-100"
              style={{ 
                left: `${(currentStep / arrangedPatterns.length) * 100}%`,
                height: '100%',
                zIndex: 10
              }}
            />
          )}
        </div>
      </div>

      {/* Transport and pattern controls */}
      {/* Transport and pattern controls */}
      <div className="flex gap-4">
        <div className="flex gap-2">
          <button
            onClick={handlePlayPause}
            disabled={!audioContext || !synthesizer}
            className={`w-10 h-10 flex items-center justify-center bg-gray-200 border-2
              ${!audioContext || !synthesizer ? 'opacity-50 cursor-not-allowed' : ''}
              ${isPlaying 
                ? 'border-t-pink-500 border-l-pink-500 border-b-white border-r-white' 
                : 'border-t-white border-l-white border-b-pink-500 border-r-pink-500'
              }`}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={handleReset}
            disabled={!audioContext || !synthesizer}
            className={`w-10 h-10 flex items-center justify-center bg-gray-200 border-2 
              border-t-white border-l-white border-b-pink-500 border-r-pink-500
              ${!audioContext || !synthesizer ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {selectedPatternIndex !== null && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                onMovePattern(selectedPatternIndex, -1);
                setSelectedPatternIndex(selectedPatternIndex - 1);
              }}
              disabled={selectedPatternIndex === 0}
              className={`w-10 h-10 flex items-center justify-center bg-gray-200
                border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500
                ${selectedPatternIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => {
                onMovePattern(selectedPatternIndex, 1);
                setSelectedPatternIndex(selectedPatternIndex + 1);
              }}
              disabled={selectedPatternIndex === arrangedPatterns.length - 1}
              className={`w-10 h-10 flex items-center justify-center bg-gray-200
                border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500
                ${selectedPatternIndex === arrangedPatterns.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => onCopyPattern(arrangedPatterns[selectedPatternIndex], selectedPatternIndex)}
              className="w-10 h-10 flex items-center justify-center bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={() => {
                onDeletePattern(selectedPatternIndex);
                setSelectedPatternIndex(null);
              }}
              className="w-10 h-10 flex items-center justify-center bg-gray-200 border-2 border-t-white border-l-white border-b-pink-500 border-r-pink-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Arrangement;