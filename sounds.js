// Sound manager for the game
class SoundManager {
    constructor() {
        this.sounds = {
            push: new Audio('data:audio/wav;base64,UklGRqRnAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYBnAACA'),
            destroy: new Audio('data:audio/wav;base64,UklGRqRnAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYBnAACA'),
            damage: new Audio('data:audio/wav;base64,UklGRqRnAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYBnAACA'),
            victory: new Audio('data:audio/wav;base64,UklGRqRnAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYBnAACA'),
            gameOver: new Audio('data:audio/wav;base64,UklGRqRnAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYBnAACA')
        };

        // Set volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.3; // 30% volume for subtle effects
        });

        // Create audio context for dynamic sounds
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
       
        // Set higher base volume
        this.baseVolume = 1.0; // Maximum volume
       
        // Keep track of last sound time to prevent too frequent sounds
        this.lastPushSound = 0;
        this.pushSoundCooldown = 50; // Minimum 50ms between push sounds
       
        // Initialize oscillator for push sound
        this.initializePushSound();

        console.log('Sound manager initialized');
    }

    initializePushSound() {
        // Create a soft "whoosh" sound for pushing
        this.pushSound = {
            play: (velocity) => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
               
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(200 + velocity * 100, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.1);
               
                gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
               
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
               
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
            }
        };
    }

    playPush(velocity) {
        try {
            // Check cooldown to prevent sound spam
            const now = Date.now();
            if (now - this.lastPushSound < this.pushSoundCooldown) {
                return;
            }
            this.lastPushSound = now;

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
           
            oscillator.type = 'triangle'; // Changed to triangle for more noticeable sound
            oscillator.frequency.setValueAtTime(500 + velocity * 200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.15);
           
            gainNode.gain.setValueAtTime(this.baseVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
           
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
           
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.15);
            console.log('Push sound played at velocity:', velocity);
        } catch (e) {
            console.error('Error playing push sound:', e);
        }
    }

    playDestroy() {
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
           
            oscillator.type = 'square'; // Changed to square for more impact
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
           
            gainNode.gain.setValueAtTime(this.baseVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
           
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
           
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.2);
            console.log('Destroy sound played');
        } catch (e) {
            console.error('Error playing destroy sound:', e);
        }
    }

    playDamage() {
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
           
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.3);
           
            gainNode.gain.setValueAtTime(this.baseVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
           
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
           
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
            console.log('Damage sound played');
        } catch (e) {
            console.error('Error playing damage sound:', e);
        }
    }

    playVictory() {
        try {
            const notes = [400, 600, 800, 1000];
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                   
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                   
                    gainNode.gain.setValueAtTime(this.baseVolume * 0.8, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                   
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                   
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.3);
                }, i * 150);
            });
            console.log('Victory sound played');
        } catch (e) {
            console.error('Error playing victory sound:', e);
        }
    }

    playGameOver() {
        try {
            const notes = [600, 400, 200, 100];
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                   
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                   
                    gainNode.gain.setValueAtTime(this.baseVolume * 0.8, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
                   
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                   
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.4);
                }, i * 200);
            });
            console.log('Game over sound played');
        } catch (e) {
            console.error('Error playing game over sound:', e);
        }
    }
}