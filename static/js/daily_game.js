function dailyGame() {
    return {
        currentGuess: '',
        guesses: [],
        loading: false,
        error: null,
        won: false,
        winningWord: null,
        latestResult: null,
        
        // Hint state
        showHintPopup: false,
        hints: null,
        loadingHints: false,
        hintsRevealed: {
            letter: false,
            length: false,
            similar: false
        },
        
        // Get today's date string for storage key
        getTodayKey() {
            return 'wordGame_' + new Date().toISOString().split('T')[0];
        },
        
        // Initialize: load saved state from localStorage
        init() {
            const key = this.getTodayKey();
            const saved = localStorage.getItem(key);
            
            if (saved) {
                try {
                    const state = JSON.parse(saved);
                    this.guesses = state.guesses || [];
                    this.won = state.won || false;
                    this.winningWord = state.winningWord || null;
                    this.latestResult = state.latestResult || null;
                    this.hintsRevealed = state.hintsRevealed || { letter: false, length: false, similar: false };
                } catch (e) {
                    console.error('Failed to load saved state:', e);
                }
            }
            
            // Clean up old days' data
            this.cleanupOldData();
        },
        
        // Save current state to localStorage
        saveState() {
            const key = this.getTodayKey();
            const state = {
                guesses: this.guesses,
                won: this.won,
                winningWord: this.winningWord,
                latestResult: this.latestResult,
                hintsRevealed: this.hintsRevealed
            };
            localStorage.setItem(key, JSON.stringify(state));
        },
        
        // Remove old days' game data
        cleanupOldData() {
            const todayKey = this.getTodayKey();
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('wordGame_') && key !== todayKey) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
        },
        
        get sortedGuesses() {
            return [...this.guesses].sort((a, b) => b.similarity - a.similarity);
        },
        
        async submitGuess() {
            const word = this.currentGuess.trim().toLowerCase();
            
            if (!word) {
                this.error = 'Please enter a word';
                return;
            }
            
            // Check if already guessed
            if (this.guesses.some(g => g.word === word)) {
                this.error = 'You already guessed that word!';
                return;
            }
            
            this.loading = true;
            this.error = null;
            
            try {
                const formData = new FormData();
                formData.append('guess', word);
                formData.append('csrfmiddlewaretoken', window.csrfToken);
                
                const response = await fetch(window.dailyGuessUrl, {
                    method: 'POST',
                    body: formData
                });
                
                const html = await response.text();
                
                // Parse the response (we'll extract data from the partial)
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                const errorEl = doc.querySelector('[data-error]');
                const similarityEl = doc.querySelector('[data-similarity]');
                const correctEl = doc.querySelector('[data-correct]');
                
                if (errorEl) {
                    this.error = errorEl.textContent;
                    return;
                }
                
                const similarity = parseFloat(similarityEl?.dataset.similarity || 0);
                const correct = correctEl?.dataset.correct === 'true';
                
                const result = {
                    word: word,
                    similarity: similarity
                };
                
                this.guesses.push(result);
                this.latestResult = result;
                this.currentGuess = '';
                
                if (correct) {
                    this.won = true;
                    this.winningWord = word;
                }
                
                // Save state after each guess
                this.saveState();
                
                // Focus input for next guess
                this.$nextTick(() => {
                    this.$refs.guessInput?.focus();
                });
                
            } catch (err) {
                this.error = 'Failed to check guess: ' + err.message;
            } finally {
                this.loading = false;
            }
        },
        
        // Open hint popup and fetch hints if not already loaded
        async openHintPopup() {
            this.showHintPopup = true;
            
            if (!this.hints) {
                this.loadingHints = true;
                try {
                    const response = await fetch(window.dailyHintUrl);
                    this.hints = await response.json();
                } catch (err) {
                    console.error('Failed to fetch hints:', err);
                } finally {
                    this.loadingHints = false;
                }
            }
        },
        
        // Reveal a specific hint
        revealHint(type) {
            this.hintsRevealed[type] = true;
            this.saveState();
        },
        
        getSimilarityColor(similarity) {
            if (!similarity) return 'text-terminal-dim';
            if (similarity >= 85) return 'text-terminal-accent';
            if (similarity >= 70) return 'text-orange-400';
            if (similarity >= 50) return 'text-yellow-400';
            return 'text-red-400';
        },
        
        getSimilarityBgColor(similarity) {
            if (!similarity) return 'bg-terminal-dim';
            if (similarity >= 85) return 'bg-terminal-accent';
            if (similarity >= 70) return 'bg-orange-400';
            if (similarity >= 50) return 'bg-yellow-400';
            return 'bg-red-400';
        }
    }
}
