// AudioRenderer.jsx
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

class AudioRenderer {
    constructor(audioContext, synthesizer) {
      if (!audioContext || !synthesizer) {
        throw new Error('AudioContext and synthesizer are required');
      }
      this.originalContext = audioContext;
      this.synthesizer = synthesizer;
      this.abortController = null;
    }
  
    async renderArrangement(arrangedPatterns, onProgress) {
      if (!arrangedPatterns?.length) {
        throw new Error('No patterns to render');
      }

      this.abortController = new AbortController();

      // Calculate total duration
      const totalDuration = arrangedPatterns.reduce((acc, pattern) => {
        const stepTime = (60 / pattern.tempo) / 4;
        return acc + (stepTime * 16);
      }, 0);

      try {
        console.log('Calculating total samples...');
        const totalSamples = Math.ceil((totalDuration + 2) * 48000);
        console.log('Total samples to render:', totalSamples);
        
        const offlineCtx = new OfflineAudioContext({
          numberOfChannels: 2,
          length: totalSamples,
          sampleRate: 48000
        });

        // Store original context
        const originalContext = this.synthesizer.context;
        console.log('Original context state:', originalContext.state);
        
        try {
          let currentTime = 0;
          console.log('Scheduling patterns...');

          // Process each pattern
          for (const [patternIndex, pattern] of arrangedPatterns.entries()) {
            if (this.abortController.signal.aborted) {
              throw new Error('Rendering aborted');
            }

            console.log(`Processing pattern ${patternIndex + 1}/${arrangedPatterns.length}`);
            onProgress(Math.floor((patternIndex / arrangedPatterns.length) * 40));
            
            const stepTime = (60 / pattern.tempo) / 4;
            console.log(`Pattern ${patternIndex + 1} step time:`, stepTime);
            
            // Schedule each step
            for (let step = 0; step < 16; step++) {
              const swingOffset = step % 2 === 1 ? 
                (pattern.swing / 100) * (stepTime * 0.66667) : 0;
              const actualTime = currentTime + (step * stepTime) + swingOffset;

              // Schedule drums and arpeggiator for this step
              Object.entries(pattern.sequence).forEach(([sound, steps]) => {
                if (steps[step]) {
                  // Temporarily override synthesizer context
                  this.synthesizer.context = offlineCtx;
                  
                  try {
                    // Force the currentTime of the offline context
                    Object.defineProperty(offlineCtx, 'currentTime', {
                      value: actualTime,
                      writable: true
                    });
                    
                    switch (sound) {
                      case 'kick':
                        this.synthesizer.createKick(pattern.drumParams.kick);
                        break;
                      case 'hihat':
                        this.synthesizer.createHihat(pattern.drumParams.hihat);
                        break;
                      case 'snare':
                        this.synthesizer.createSnare(pattern.drumParams.snare);
                        break;
                      case 'tom':
                        this.synthesizer.createTom(pattern.drumParams.tom);
                        break;
                      case 'crash':
                        this.synthesizer.createCrash(pattern.drumParams.crash);
                        break;
                      case 'clap':
                        this.synthesizer.createClap(pattern.drumParams.clap);
                        break;
                    }
                  } finally {
                    // Restore original context after each sound
                    this.synthesizer.context = originalContext;
                  }
                }
              });

              // Handle arpeggiator patterns
              if (pattern.arpeggiatorState && pattern.arpeggiatorState.pattern[step]) {
                try {
                  const stepDuration = (60 / pattern.tempo) / 4;
                  const noteDuration = stepDuration * pattern.arpeggiatorState.noteLength;
                  
                  // Create the same nodes as ArpeggiatorSynth
                  const oscillator = offlineCtx.createOscillator();
                  const gainNode = offlineCtx.createGain();
                  const filter = offlineCtx.createBiquadFilter();
                  const delay = offlineCtx.createDelay();
                  const feedbackGain = offlineCtx.createGain();

                  // Configure nodes exactly as ArpeggiatorSynth does
                  oscillator.type = pattern.arpeggiatorState.waveform;
                  
                  // Calculate frequency with octave shift
                  const baseNote = pattern.arpeggiatorState.pattern[step];
                  const baseFreq = baseNotes[baseNote];
                  const shiftedFreq = baseFreq * Math.pow(2, pattern.arpeggiatorState.octaveShift);
                  oscillator.frequency.setValueAtTime(shiftedFreq, actualTime);

                  // Configure filter
                  filter.type = 'lowpass';
                  filter.frequency.value = pattern.arpeggiatorState.cutoff;
                  filter.Q.value = pattern.arpeggiatorState.resonance;

                  // Configure delay
                  delay.delayTime.value = pattern.arpeggiatorState.delayAmount;
                  feedbackGain.gain.value = pattern.arpeggiatorState.feedback;

                  // Set envelope
                  gainNode.gain.setValueAtTime(0.7, actualTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.001, actualTime + noteDuration);

                  // Connect nodes
                  oscillator.connect(filter);
                  filter.connect(gainNode);
                  gainNode.connect(offlineCtx.destination);
                  gainNode.connect(delay);
                  delay.connect(feedbackGain);
                  feedbackGain.connect(delay);
                  delay.connect(offlineCtx.destination);

                  // Schedule playback
                  oscillator.start(actualTime);
                  oscillator.stop(actualTime + noteDuration);

                } catch (error) {
                  console.error('Error rendering arpeggiator:', error);
                }
              }
            }

            currentTime += stepTime * 16;
          }

          // Set synthesizer back to offline context for rendering
          this.synthesizer.context = offlineCtx;

          console.log('Starting render...');
          onProgress(50);

          // Set up progress monitoring for the render process
          const renderPromise = new Promise((resolve, reject) => {
            offlineCtx.addEventListener('complete', (event) => {
              console.log('Render complete event received');
              resolve(event.renderedBuffer);
            });
            
            offlineCtx.addEventListener('statechange', () => {
              console.log('Offline context state changed:', offlineCtx.state);
            });

            offlineCtx.addEventListener('error', (error) => {
              console.error('Offline context error:', error);
              reject(error);
            });
          });

          console.log('Starting offline rendering...');
          offlineCtx.startRendering();
          
          onProgress(60);
          console.log('Waiting for render to complete...');
          
          const renderedBuffer = await Promise.race([
            renderPromise,
            new Promise((_, reject) => {
              setTimeout(() => {
                reject(new Error('Render timeout - took longer than 30 seconds'));
              }, 30000);
            })
          ]);
          
          console.log('Converting to WAV...');
          onProgress(95);
          
          const wavData = await this.audioBufferToWav(renderedBuffer);
          onProgress(100);
          
          return wavData;
        } finally {
          // Always restore original context and clean up
          this.synthesizer.context = originalContext;
          this.abortController = null;
        }
      } catch (error) {
        console.error('Error in renderArrangement:', error);
        this.abortController = null;
        throw error;
      }
    }

    abort() {
      if (this.abortController) {
        this.abortController.abort();
      }
    }
  
    audioBufferToWav(buffer) {
      if (!buffer || !buffer.numberOfChannels) {
        throw new Error('Invalid audio buffer');
      }

      const numChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const format = 1; // PCM
      const bitDepth = 16;
      
      const dataLength = buffer.length * numChannels * (bitDepth / 8);
      const bufferLength = 44 + dataLength;
      const arrayBuffer = new ArrayBuffer(bufferLength);
      const view = new DataView(arrayBuffer);
      
      try {
        // Write WAV header
        const writeString = (view, offset, string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };
        
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
        view.setUint16(32, numChannels * (bitDepth / 8), true);
        view.setUint16(34, bitDepth, true);
        writeString(view, 36, 'data');
        view.setUint32(40, dataLength, true);
        
        // Write audio data
        const offset = 44;
        const channelData = [];
        for (let i = 0; i < numChannels; i++) {
          channelData[i] = buffer.getChannelData(i);
        }
        
        let position = 0;
        for (let i = 0; i < buffer.length; i++) {
          for (let channel = 0; channel < numChannels; channel++) {
            const sample = channelData[channel][i];
            const value = Math.max(-1, Math.min(1, sample));
            view.setInt16(offset + position, value < 0 ? value * 0x8000 : value * 0x7FFF, true);
            position += 2;
          }
        }

        return arrayBuffer;
      } catch (error) {
        console.error('Error converting to WAV:', error);
        throw new Error('Failed to convert audio to WAV format');
      }
    }
}

export default AudioRenderer;