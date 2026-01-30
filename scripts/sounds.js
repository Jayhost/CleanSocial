// Sound Effects Manager - Opera GX Style
class SoundFX {
    constructor() {
      this.enabled = true;
      this.navigationEnabled = true;
      this.audioContext = null;
      this.volume = 0.25;
      
      // Initialize on first user interaction
      document.addEventListener('click', () => this.init(), { once: true });
      document.addEventListener('keydown', () => this.init(), { once: true });
    }
  
    init() {
      if (this.audioContext) return;
      
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('🔊 Sound system initialized');
      } catch (e) {
        console.log('Audio not available:', e);
      }
    }
  
    // Mechanical keyboard typing sound
    playType() {
      if (!this.enabled || !this.audioContext) return;
      
      try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        // Randomize for natural feel
        const baseFreq = 2000 + Math.random() * 500;
        const duration = 0.025 + Math.random() * 0.015;
        
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(
          baseFreq * 0.4, 
          this.audioContext.currentTime + duration
        );
        
        filter.type = 'highpass';
        filter.frequency.value = 1200;
        
        gainNode.gain.setValueAtTime(this.volume * 0.12, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.001, 
          this.audioContext.currentTime + duration
        );
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
      } catch (e) {}
    }
  
    // Click sound for buttons
    playClick() {
      if (!this.navigationEnabled || !this.audioContext) return;
      
      try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(900, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.08);
        
        gainNode.gain.setValueAtTime(this.volume * 0.18, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.08);
      } catch (e) {}
    }
  
    // Navigation whoosh
    playNavigate() {
      if (!this.navigationEnabled || !this.audioContext) return;
      
      try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(500, this.audioContext.currentTime + 0.12);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2500, this.audioContext.currentTime + 0.12);
        
        gainNode.gain.setValueAtTime(this.volume * 0.12, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
      } catch (e) {}
    }
  
    // Success chord
    playSuccess() {
      if (!this.navigationEnabled || !this.audioContext) return;
      
      try {
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        
        notes.forEach((freq, i) => {
          const oscillator = this.audioContext.createOscillator();
          const gainNode = this.audioContext.createGain();
          
          oscillator.type = 'sine';
          oscillator.frequency.value = freq;
          
          const startTime = this.audioContext.currentTime + (i * 0.08);
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(this.volume * 0.15, startTime + 0.04);
          gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
          
          oscillator.connect(gainNode);
          gainNode.connect(this.audioContext.destination);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + 0.25);
        });
      } catch (e) {}
    }
  
    // Tab switch
    playTabSwitch() {
      if (!this.navigationEnabled || !this.audioContext) return;
      
      try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(900, this.audioContext.currentTime + 0.06);
        
        gainNode.gain.setValueAtTime(this.volume * 0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.06);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.06);
      } catch (e) {}
    }
  
    // Error sound
    playError() {
      if (!this.navigationEnabled || !this.audioContext) return;
      
      try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(180, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(140, this.audioContext.currentTime + 0.08);
        
        gainNode.gain.setValueAtTime(this.volume * 0.15, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
      } catch (e) {}
    }
  
    setEnabled(enabled) {
      this.enabled = enabled;
    }
  
    setNavigationEnabled(enabled) {
      this.navigationEnabled = enabled;
    }
  }
  
  // Create global instance
  window.soundFX = new SoundFX();