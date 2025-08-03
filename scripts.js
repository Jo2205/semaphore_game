
// ====== GLOBAL VARIABLES & CONFIGURATION ======
// Game configuration constants
const CONFIG = {
    API_URL: 'https://jo2254-gabut.hf.space/predict',
    CONFIDENCE_THRESHOLD: 0.85,
    DETECTION_INTERVAL: 1000,
    SINGLE_GAME_TIME: 60,
    MULTIPLAYER_TIME: 60,
    SCORE_PER_CORRECT: 10,
    LOADING_TIME: 3000
};

// Semaphore letters mapping (A-Z dengan instruksi)
const SEMAPHORE_DATA = {
    'A': 'Right hand up, left hand to the side',
    'B': 'Right hand up and out, left hand up',
    'C': 'Right hand up and out, left hand to the side',
    'D': 'Right hand up, left hand up and out',
    'E': 'Right hand to the side, left hand up and out',
    'F': 'Right hand to the side, left hand up',
    'G': 'Right hand to the side, left hand to the side',
    'H': 'Right hand down and out, left hand to the side',
    'I': 'Right hand down, left hand to the side',
    'J': 'Right hand up, left hand down',
    'K': 'Right hand up and out, left hand down and out',
    'L': 'Right hand up and out, left hand down',
    'M': 'Right hand up, left hand down and out',
    'N': 'Right hand to the side, left hand down and out',
    'O': 'Right hand to the side, left hand down',
    'P': 'Right hand up and out, left hand up and out',
    'Q': 'Right hand up and out, left hand up',
    'R': 'Right hand up, left hand up and out',
    'S': 'Right hand to the side, left hand up and out',
    'T': 'Right hand up, left hand up',
    'U': 'Right hand up and out, left hand down and out',
    'V': 'Right hand down and out, left hand up and out',
    'W': 'Right hand down, left hand up',
    'X': 'Right hand down and out, left hand down and out',
    'Y': 'Right hand up and out, left hand down',
    'Z': 'Right hand down, left hand up and out'
};

// Global game state variables
let currentPage = 'home-page';
let gameState = {
    isGameActive: false,
    isPracticeMode: false,
    isMultiplayer: false,
    currentPlayer: 0,
    players: [],
    score: {},
    timer: 0,
    currentLetter: 'A',
    targetLetter: 'A',
    gameHistory: []
};

// Camera dan detection variables
let videoElement = null;
let cameraStream = null;
let detectionInterval = null;
let isDetecting = false;

// Audio elements
let backgroundMusic = null;
let isMusicPlaying = false;

// ====== INITIALIZATION & LOADING ======
// Initialize game saat DOM loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Semaphore Game Initializing...');
    initializeGame();
});

// Main initialization function
function initializeGame() {
    try {
        // Setup audio
        setupBackgroundMusic();
        
        // Setup loading screen
        showLoadingScreen();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize game state
        resetGameState();
        
        // Hide loading after delay
        setTimeout(() => {
            hideLoadingScreen();
            console.log('✅ Game initialized successfully');
        }, CONFIG.LOADING_TIME);
        
    } catch (error) {
        console.error('❌ Error initializing game:', error);
        showNotification('Failed to initialize game', 'error');
    }
}

// ====== LOADING SCREEN MANAGEMENT ======
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('active');
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.remove('active');
    }
}

// ====== AUDIO MANAGEMENT ======
function setupBackgroundMusic() {
    backgroundMusic = document.getElementById('background-music');
    const musicBtn = document.getElementById('music-toggle');
    
    if (backgroundMusic && musicBtn) {
        // Auto play music (dengan user interaction dulu)
        musicBtn.addEventListener('click', toggleMusic);
        
        // Set initial volume
        backgroundMusic.volume = 0.3;
        
        console.log('🎵 Background music setup complete');
    }
}

function toggleMusic() {
    const musicBtn = document.getElementById('music-toggle');
    const icon = musicBtn.querySelector('i');
    
    if (!backgroundMusic) return;
    
    try {
        if (isMusicPlaying) {
            backgroundMusic.pause();
            icon.className = 'fas fa-volume-mute';
            musicBtn.classList.add('muted');
            isMusicPlaying = false;
        } else {
            backgroundMusic.play();
            icon.className = 'fas fa-volume-up';
            musicBtn.classList.remove('muted');
            isMusicPlaying = true;
        }
    } catch (error) {
        console.warn('⚠️ Music file not found:', error);
        showNotification('Background music not available', 'info');
    }
}

// ====== EVENT LISTENERS SETUP ======
function setupEventListeners() {
    // Enter key untuk input player name
    const playerInput = document.getElementById('player-name-input');
    if (playerInput) {
        playerInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addPlayer();
            }
        });
    }
    
    // ESC key untuk close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    console.log('🎛️ Event listeners setup complete');
}

// ====== PAGE NAVIGATION SYSTEM ======
function showPage(pageId) {
    console.log(`📄 Navigating to: ${pageId}`);
    
    // Hide current page
    const currentPageElement = document.getElementById(currentPage);
    if (currentPageElement) {
        currentPageElement.classList.remove('active');
    }
    
    // Show new page
    const newPageElement = document.getElementById(pageId);
    if (newPageElement) {
        newPageElement.classList.add('active');
        currentPage = pageId;
        
        // Page-specific actions
        handlePageTransition(pageId);
    }
}

function handlePageTransition(pageId) {
    switch(pageId) {
        case 'practice-page':
            initializePracticeMode();
            break;
        case 'game-page':
            prepareGameMode();
            break;
        case 'multiplayer-setup-page':
            initializeMultiplayerSetup();
            break;
        case 'history-page':
            loadGameHistory();
            break;
        case 'home-page':
            stopAllActivities();
            break;
    }
}

function stopAllActivities() {
    // Stop camera
    if (cameraStream) {
        stopCamera();
    }
    
    // Stop detection
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    
    // Reset game state
    gameState.isGameActive = false;
    gameState.isPracticeMode = false;
    
    console.log('🛑 All activities stopped');
}

// ====== CAMERA MANAGEMENT ======
async function enableCamera(mode) {
    console.log(`📹 Enabling camera for ${mode} mode`);
    
    try {
        // Get camera stream
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        });
        
        // Setup video element berdasarkan mode
        let videoId;
        switch(mode) {
            case 'practice':
                videoId = 'practice-video';
                break;
            case 'game':
                videoId = 'game-video';
                break;
            case 'multiplayer':
                videoId = 'multiplayer-video';
                break;
            default:
                throw new Error('Invalid camera mode');
        }
        
        videoElement = document.getElementById(videoId);
        if (!videoElement) {
            throw new Error(`Video element ${videoId} not found`);
        }
        
        // Assign stream ke video element
        videoElement.srcObject = cameraStream;
        videoElement.style.display = 'block';
        
        // Mirror the video element horizontally
        videoElement.style.transform = 'scaleX(-1)';
        
        // Hide placeholder
        const placeholder = videoElement.parentElement.querySelector('.camera-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        // Start detection berdasarkan mode
        if (mode === 'practice') {
            startPracticeDetection();
        } else {
            startGameDetection();
        }
        
        showNotification('Camera enabled successfully', 'success');
        console.log('✅ Camera enabled successfully');
        
    } catch (error) {
        console.error('❌ Camera error:', error);
        showNotification('Failed to access camera. Please check permissions.', 'error');
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    if (videoElement) {
        videoElement.srcObject = null;
        videoElement.style.display = 'none';
        videoElement = null;
    }
    
    // Show placeholder again
    const placeholders = document.querySelectorAll('.camera-placeholder');
    placeholders.forEach(placeholder => {
        placeholder.style.display = 'flex';
    });
    
    console.log('📹 Camera stopped');
}

// ====== AI DETECTION SYSTEM ======
async function detectSemaphore() {
    if (!videoElement || !cameraStream || !isDetecting) {
        return null;
    }
    
    try {
        // Capture frame dari video
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;


        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        
        // Convert ke base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        // Send ke Flask backend
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: imageData
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('🤖 AI Detection result:', result);
        
        // Validate result
        if (result.detected_letter && result.confidence >= CONFIG.CONFIDENCE_THRESHOLD) {
            return {
                letter: result.detected_letter.toUpperCase(),
                confidence: result.confidence
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Detection error:', error);
        
        // Show error hanya sekali untuk menghindari spam
        if (!detectSemaphore.errorShown) {
            showNotification('AI detection service unavailable', 'error');
            detectSemaphore.errorShown = true;
            
            // Reset error flag after 10 seconds
            setTimeout(() => {
                detectSemaphore.errorShown = false;
            }, 10000);
        }
        
        return null;
    }
}

// ====== PRACTICE MODE ======
function initializePracticeMode() {
    console.log('🎓 Initializing practice mode');
    
    gameState.isPracticeMode = true;
    gameState.isGameActive = false;
    
    // Set random letter untuk practice
    changeLetter();
}

function changeLetter() {
    // Generate random letter A-Z
    const letters = Object.keys(SEMAPHORE_DATA);
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    
    gameState.currentLetter = randomLetter;
    
    // Update UI
    const letterElement = document.getElementById('practice-letter');
    const instructionElement = document.getElementById('practice-instruction');
    
    if (letterElement) {
        letterElement.textContent = randomLetter;
    }
    
    if (instructionElement) {
        instructionElement.textContent = SEMAPHORE_DATA[randomLetter];
    }
    
    console.log(`📝 Practice letter changed to: ${randomLetter}`);
}

function startPracticeDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
    }
    
    isDetecting = true;
    
    detectionInterval = setInterval(async () => {
        if (!gameState.isPracticeMode) return;
        
        const detection = await detectSemaphore();
        
        if (detection) {
            // Check jika detection sesuai dengan current letter
            if (detection.letter === gameState.currentLetter) {
                showNotification(`Great! You showed "${detection.letter}" correctly! (${Math.round(detection.confidence * 100)}%)`, 'success');
                
                // Auto change ke letter baru setelah 2 detik
                setTimeout(() => {
                    changeLetter();
                }, 2000);
            } else {
                showNotification(`Detected "${detection.letter}" but target is "${gameState.currentLetter}"`, 'info');
            }
        }
    }, CONFIG.DETECTION_INTERVAL);
    
    console.log('🎓 Practice detection started');
}

// ====== SINGLE PLAYER GAME MODE ======
function prepareGameMode() {
    console.log('🎮 Preparing single player game');
    
    // Reset game state
    gameState.isGameActive = false;
    gameState.isMultiplayer = false;
    gameState.isPracticeMode = false;
    gameState.score = { 'Player': 0 };
    gameState.timer = CONFIG.SINGLE_GAME_TIME;
    
    // Set first target letter randomly for single player mode
    setNewTargetLetter();
    
    // Update UI
    updateGameUI();
}

function startSinglePlayerGame() {
    if (!cameraStream) {
        showNotification('Please enable camera first', 'error');
        return;
    }
    
    console.log('🎮 Starting single player game');
    
    gameState.isGameActive = true;
    gameState.timer = CONFIG.SINGLE_GAME_TIME;
    
    // Start game timer
    startGameTimer();
    
    // Start detection
    startGameDetection();
    
    showNotification('Game started! Show the target letter with semaphore', 'success');
}

function startGameDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
    }
    
    isDetecting = true;
    
    detectionInterval = setInterval(async () => {
        if (!gameState.isGameActive) return;
        
        const detection = await detectSemaphore();
        
        if (detection) {
            handleGameDetection(detection);
        }
    }, CONFIG.DETECTION_INTERVAL);
    
    console.log('🎮 Game detection started');
}

function handleGameDetection(detection) {
    const currentPlayer = gameState.isMultiplayer ? gameState.players[gameState.currentPlayer] : 'Player';
    
    if (detection.letter === gameState.targetLetter) {
        // Correct answer!
        gameState.score[currentPlayer] = (gameState.score[currentPlayer] || 0) + CONFIG.SCORE_PER_CORRECT;
        
        // Removed notification for single player mode as per user request
        if (gameState.isMultiplayer) {
            showNotification(`Correct! +${CONFIG.SCORE_PER_CORRECT} points (${Math.round(detection.confidence * 100)}%)`, 'success');
        }
        
        // Set new target letter randomly for both single and multiplayer
        setNewTargetLetter();
        
        // Update UI
        updateGameUI();
        
    } else {
        if (gameState.isMultiplayer) {
            showNotification(`Detected "${detection.letter}" but target is "${gameState.targetLetter}"`, 'info');
        }
    }
}

function setNewTargetLetter() {
    const letters = Object.keys(SEMAPHORE_DATA);
    gameState.targetLetter = letters[Math.floor(Math.random() * letters.length)];
    
    console.log(`🎯 New target letter: ${gameState.targetLetter}`);
}

function updateGameUI() {
    try {
        console.log('Updating game UI, timer:', gameState.timer); // Log untuk debugging

        // Update score - Pilih elemen berdasarkan mode
        let scoreElement = document.getElementById(gameState.isMultiplayer ? 'mp-score' : 'game-score');
        if (scoreElement) {
            const currentPlayer = gameState.isMultiplayer ? gameState.players[gameState.currentPlayer] : 'Player';
            scoreElement.textContent = gameState.score[currentPlayer] || 0;
            console.log(`Score updated for ${currentPlayer}: ${gameState.score[currentPlayer] || 0}`);
        } else {
            console.error('Score element not found for current mode');
        }

        // Update timer - Pilih elemen berdasarkan mode
        let timerElement = document.getElementById(gameState.isMultiplayer ? 'mp-timer' : 'game-timer');
        if (timerElement) {
            timerElement.textContent = gameState.timer; // Pastikan pembaruan
            console.log(`Timer element updated to: ${gameState.timer}`);
            if (gameState.timer <= 10) {
                timerElement.classList.add('warning');
            } else {
                timerElement.classList.remove('warning');
            }
        } else {
            console.error('Timer element not found for current mode');
        }

        // Update target letter
        const targetElements = [
            document.getElementById('game-target'),
            document.getElementById('mp-target'),
            document.getElementById('target-display'),
            document.getElementById('mp-target-display'),
            document.getElementById('game-target-overlay')
        ];

        targetElements.forEach(element => {
            if (element) {
                element.style.display = 'block';
                element.textContent = gameState.targetLetter;
            }
        });

        // Update instruction
        const instructionElements = [
            document.getElementById('target-instruction'),
            document.getElementById('mp-target-instruction')
        ];

        instructionElements.forEach(element => {
            if (element) {
                element.style.display = 'block';
                element.textContent = SEMAPHORE_DATA[gameState.targetLetter];
            }
        });
    } catch (error) {
        console.error('Error in updateGameUI:', error);
    }
}

let gameTimer = null;

function startGameTimer() {
    console.log('startGameTimer called');
    if (gameTimer) {
        clearInterval(gameTimer);
        console.log('Previous gameTimer cleared');
    }
    gameState.timer = gameState.isMultiplayer ? CONFIG.MULTIPLAYER_TIME : CONFIG.SINGLE_GAME_TIME;
    console.log(`Timer initialized to: ${gameState.timer}`);
    
    gameTimer = setInterval(() => {
        if (!gameState.isGameActive) {
            console.log('Game not active, stopping timer');
            clearInterval(gameTimer);
            return;
        }
        console.log(`Timer tick, current timer: ${gameState.timer}`);
        if (gameState.timer > 0) {
            gameState.timer--;
            updateGameUI();
        } else {
            console.log('Timer ended, calling endCurrentGame');
            clearInterval(gameTimer);
            gameTimer = null;
            endCurrentGame();
        }
    }, 1000);
}

function endCurrentGame() {
    console.log('⏰ Game ended');
    
    gameState.isGameActive = false;
    isDetecting = false;
    
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    
    if (gameState.isMultiplayer) {
        handleMultiplayerTurnEnd();
    } else {
        handleSinglePlayerEnd();
    }
}

function handleSinglePlayerEnd() {
    const finalScore = gameState.score['Player'] || 0;
    
    // Save ke history
    saveGameSession({
        type: 'Single Player',
        players: [{ name: 'Player', score: finalScore }],
        date: new Date().toLocaleString()
    });
    
    showNotification(`Game Over! Final Score: ${finalScore} points`, 'info');
    
    // Show result (simplified untuk single player)
    setTimeout(() => {
        showSinglePlayerResult(finalScore);
    }, 2000);
}

function showSinglePlayerResult(score) {
    // Bisa ditambahkan modal result atau redirect ke result page
    const message = score >= 50 ? 'Excellent performance!' : score >= 20 ? 'Good job!' : 'Keep practicing!';
    showNotification(`${message} You scored ${score} points`, 'success');
}

function stopGame() {
    if (gameState.isGameActive) {
        gameState.isGameActive = false;
        endCurrentGame();
        showNotification('Game stopped', 'info');
    }
    
    // Return to home
    showPage('home-page');
}

// ====== MULTIPLAYER SYSTEM ======
function initializeMultiplayerSetup() {
    console.log('👥 Initializing multiplayer setup');
    
    // Reset players list
    gameState.players = [];
    updatePlayersDisplay();
    updateStartButton();
}

function addPlayer() {
    const input = document.getElementById('player-name-input');
    const playerName = input.value.trim();
    
    if (!playerName) {
        showNotification('Please enter a player name', 'error');
        return;
    }
    
    if (gameState.players.includes(playerName)) {
        showNotification('Player name already exists', 'error');
        return;
    }
    
    if (gameState.players.length >= 8) {
        showNotification('Maximum 8 players allowed', 'error');
        return;
    }
    
    gameState.players.push(playerName);
    input.value = '';
    
    updatePlayersDisplay();
    updateStartButton();
    
    showNotification(`${playerName} added to the game`, 'success');
    console.log(`👤 Player added: ${playerName}`);
}

function removePlayer(index) {
    const removedPlayer = gameState.players[index];
    gameState.players.splice(index, 1);
    
    updatePlayersDisplay();
    updateStartButton();
    
    showNotification(`${removedPlayer} removed from the game`, 'info');
    console.log(`👤 Player removed: ${removedPlayer}`);
}

function updatePlayersDisplay() {
    const playersList = document.getElementById('players-list');
    const playerCount = document.getElementById('player-count');
    
    if (!playersList || !playerCount) return;
    
    playerCount.textContent = gameState.players.length;
    
    playersList.innerHTML = '';
    
    gameState.players.forEach((player, index) => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player-item';
        playerElement.innerHTML = `
            <div class="player-info">
                <div class="player-number">${index + 1}</div>
                <span class="player-name">${player}</span>
            </div>
            <button class="remove-player" onclick="removePlayer(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        playersList.appendChild(playerElement);
    });
}

function updateStartButton() {
    const startBtn = document.getElementById('start-multiplayer-btn');
    if (!startBtn) return;
    
    const playerCount = gameState.players.length;
    const span = startBtn.querySelector('span');
    
    if (playerCount >= 2) {
        startBtn.disabled = false;
        span.textContent = `Start Game (${playerCount} Players)`;
        startBtn.classList.remove('disabled');
    } else {
        startBtn.disabled = true;
        span.textContent = `Start Game (${playerCount} Players - Min 2 required)`;
        startBtn.classList.add('disabled');
    }
}

function startMultiplayer() {
    if (gameState.players.length < 2) {
        showNotification('At least 2 players required', 'error');
        return;
    }
    
    console.log('👥 Starting multiplayer game');
    
    // Initialize multiplayer game state
    gameState.isMultiplayer = true;
    gameState.currentPlayer = 0;
    gameState.score = {};
    
    // Initialize scores untuk semua players
    gameState.players.forEach(player => {
        gameState.score[player] = 0;
    });
    
    // Go to multiplayer game page
    showPage('multiplayer-game-page');
    
    // Setup first player
    setupNextPlayer();
}

function setupNextPlayer() {
    const currentPlayerName = gameState.players[gameState.currentPlayer];
    
    console.log(`👤 Setting up player: ${currentPlayerName}`);
    
    // Update UI untuk current player
    const currentPlayerElement = document.getElementById('current-player');
    if (currentPlayerElement) {
        currentPlayerElement.textContent = currentPlayerName;
    }
    
    // Reset timer
    gameState.timer = CONFIG.MULTIPLAYER_TIME;
    gameState.isGameActive = false;
    
    // Set new target letter
    setNewTargetLetter();
    
    // Update UI
    updateGameUI();
    
    showNotification(`${currentPlayerName}'s turn! Get ready...`, 'info');
    
    // Auto start setelah 3 detik
    setTimeout(() => {
        if (cameraStream) {
            startPlayerTurn();
        } else {
            showNotification('Please enable camera to continue', 'error');
        }
    }, 3000);
}

function startPlayerTurn() {
    const currentPlayerName = gameState.players[gameState.currentPlayer];
    
    console.log(`🎮 Starting turn for: ${currentPlayerName}`);
    
    gameState.isGameActive = true;
    gameState.timer = CONFIG.MULTIPLAYER_TIME;
    
    // Tambahkan penundaan untuk memastikan DOM siap
    setTimeout(() => {
        startGameTimer();
        startGameDetection();
    }, 100); // Penundaan 100ms
    
    showNotification(`${currentPlayerName} - Start showing semaphore letters!`, 'success');
}

// Fungsi yang hilang untuk tombol Start Game di multiplayer
function startMultiplayerGame() {
    if (!cameraStream) {
        showNotification('Please enable camera first', 'error');
        return;
    }
    
    if (!gameState.isMultiplayer || gameState.players.length === 0) {
        showNotification('No players found. Please setup multiplayer first.', 'error');
        return;
    }
    
    console.log('🎮 Starting multiplayer game manually');
    
    // Start current player's turn
    startPlayerTurn();
}

function handleMultiplayerTurnEnd() {
    const currentPlayerName = gameState.players[gameState.currentPlayer];
    const currentScore = gameState.score[currentPlayerName] || 0;
    
    showNotification(`${currentPlayerName} finished with ${currentScore} points!`, 'info');
    
    // Move ke player berikutnya
    gameState.currentPlayer++;
    
    if (gameState.currentPlayer >= gameState.players.length) {
        // Semua player sudah selesai
        handleMultiplayerGameEnd();
    } else {
        // Setup player berikutnya
        setTimeout(() => {
            setupNextPlayer();
        }, 3000);
    }
}

function handleMultiplayerGameEnd() {
    console.log('🏁 Multiplayer game ended');
    
    // Calculate results
    const results = gameState.players.map(player => ({
        name: player,
        score: gameState.score[player] || 0
    })).sort((a, b) => b.score - a.score);
    
    // Save ke history
    saveGameSession({
        type: 'Multiplayer',
        players: results,
        date: new Date().toLocaleString()
    });
    
    // Show results page
    showMultiplayerResults(results);
}

function showMultiplayerResults(results) {
    // Update result page dengan data
    const winnerName = document.getElementById('winner-name');
    const winnerScore = document.getElementById('winner-score');
    const secondName = document.getElementById('second-name');
    const secondScore = document.getElementById('second-score');
    const fullResults = document.getElementById('full-results');
    
    if (results.length > 0 && winnerName && winnerScore) {
        winnerName.textContent = results[0].name;
        winnerScore.textContent = results[0].score;
    }
    
    if (results.length > 1 && secondName && secondScore) {
        secondName.textContent = results[1].name;
        secondScore.textContent = results[1].score;
    }
    
    if (fullResults) {
        fullResults.innerHTML = '';
        results.forEach((result, index) => {
            const resultElement = document.createElement('div');
            resultElement.className = `result-item ${index === 0 ? 'winner' : ''}`;
            resultElement.innerHTML = `
                <span class="player-name">${result.name}</span>
                <span class="result-score">${result.score} points</span>
            `;
            fullResults.appendChild(resultElement);
        });
    }
    
    // Show result page
    showPage('result-page');
}

function skipTurn() {
    if (gameState.isGameActive && gameState.isMultiplayer) {
        showNotification('Turn skipped', 'info');
        endCurrentGame();
    }
}

// ====== HISTORY MANAGEMENT ======
function saveGameSession(sessionData) {
    gameState.gameHistory.unshift(sessionData);
    
    // Limit history ke 50 sessions untuk performance
    if (gameState.gameHistory.length > 50) {
        gameState.gameHistory = gameState.gameHistory.slice(0, 50);
    }
    
    console.log('💾 Game session saved to history');
}

function loadGameHistory() {
    console.log('📊 Loading game history');
    
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    historyList.innerHTML = '';
    
    if (gameState.gameHistory.length === 0) {
        historyList.innerHTML = `
            <div class="no-history">
                <h3>No Game History</h3>
                <p>Play some games to see your results here!</p>
            </div>
        `;
        return;
    }
    
    gameState.gameHistory.forEach((session, index) => {
        const sessionElement = document.createElement('div');
        sessionElement.className = 'history-session';
        
        const playersHtml = session.players.map((player, pIndex) => `
            <div class="history-player ${pIndex === 0 ? 'winner' : ''}">
                <span class="player-name">${player.name}</span>
                <span class="history-score">${player.score} pts</span>
            </div>
        `).join('');
        
        sessionElement.innerHTML = `
            <h4>${session.type} Game</h4>
            <div class="history-date">${session.date}</div>
            <div class="history-players">
                ${playersHtml}
            </div>
        `;
        
        historyList.appendChild(sessionElement);
    });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all game history?')) {
        gameState.gameHistory = [];
        loadGameHistory();
        showNotification('Game history cleared', 'success');
        console.log('🗑️ Game history cleared');
    }
}

// ====== MODAL SYSTEM ======
function showInstructions() {
    const modal = document.getElementById('instruction-modal');
    const modalLetter = document.getElementById('modal-letter');
    const modalLetterDisplay = document.getElementById('modal-letter-display');
    const modalInstruction = document.getElementById('modal-instruction');
    
    if (!modal) return;
    
    // Use current letter dari practice atau game
    const currentLetter = gameState.isPracticeMode ? gameState.currentLetter : gameState.targetLetter;
    
    // Update modal content
    if (modalLetter) modalLetter.textContent = currentLetter;
    if (modalLetterDisplay) modalLetterDisplay.textContent = currentLetter;
    if (modalInstruction) modalInstruction.textContent = SEMAPHORE_DATA[currentLetter];
    
    // Show modal
    modal.classList.add('active');
    
    console.log(`ℹ️ Showing instructions for letter: ${currentLetter}`);
}

function closeModal() {
    const modal = document.getElementById('instruction-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ====== NOTIFICATION SYSTEM ======
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add icon based on type
    let icon;
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'info':
        default:
            icon = '<i class="fas fa-info-circle"></i>';
            break;
    }
    
    notification.innerHTML = `${icon} ${message}`;
    
    // Add to container
    container.appendChild(notification);
    
    // Show dengan animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Auto remove setelah 3 detik
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
    
    console.log(`📢 Notification [${type}]: ${message}`);
}

// ====== RESULT PAGE FUNCTIONS ======
function playAgain() {
    if (gameState.isMultiplayer) {
        showPage('multiplayer-setup-page');
    } else {
        showPage('game-page');
    }
    
    // Reset game state
    resetGameState();
}

function resetGameState() {
    gameState = {
        isGameActive: false,
        isPracticeMode: false,
        isMultiplayer: false,
        currentPlayer: 0,
        players: [],
        score: {},
        timer: 0,
        currentLetter: 'A',
        targetLetter: 'A',
        gameHistory: gameState.gameHistory || [] // Preserve history
    };
    
    console.log('🔄 Game state reset');
}

// ====== KEYBOARD SHORTCUTS & ADDITIONAL FEATURES ======
// Keyboard shortcuts untuk development dan accessibility
document.addEventListener('keydown', function(e) {
    // Only aktif jika tidak sedang typing di input
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.key) {
        case ' ': // Spacebar
            e.preventDefault();
            if (gameState.isPracticeMode) {
                changeLetter();
            }
            break;
        case 'Enter':
            if (currentPage === 'game-page' && !gameState.isGameActive && cameraStream) {
                startSinglePlayerGame();
            }
            break;
        case 'h':
            if (e.ctrlKey) {
                e.preventDefault();
                showPage('home-page');
            }
            break;
    }
});

// ====== AUTO-START FUNCTIONS ======
// Auto-start game detection ketika camera ready (untuk convenience)
function autoStartGameIfReady() {
    if (currentPage === 'game-page' && cameraStream && !gameState.isGameActive) {
        setTimeout(() => {
            if (confirm('Camera is ready. Start the game now?')) {
                startSinglePlayerGame();
            }
        }, 1000);
    }
}

// ====== PERFORMANCE OPTIMIZATION ======
// Cleanup function untuk mencegah memory leaks
function cleanup() {
    // Stop camera
    if (cameraStream) {
        stopCamera();
    }
    
    // Clear intervals
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    
    // Stop music
    if (backgroundMusic && !backgroundMusic.paused) {
        backgroundMusic.pause();
    }
    
    console.log('🧹 Cleanup completed');
}

// Cleanup saat page unload
window.addEventListener('beforeunload', cleanup);

// ====== ERROR HANDLING & DEBUGGING ======
// Global error handler
window.addEventListener('error', function(e) {
    console.error('💥 Global error:', e.error);
    showNotification('An unexpected error occurred. Please refresh the page.', 'error');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', function(e) {
    console.error('💥 Unhandled promise rejection:', e.reason);
    showNotification('Connection error. Please check your internet.', 'error');
});

async function testAPIConnection() {
    try {
    const response = await fetch('https://jo2254-gabut.hf.space/predict', {
    method: 'GET'
});

        
        console.log('🔗 API connection test:', response.status);
        
        if (response.ok) {
            showNotification('AI detection service connected', 'success');
            return true;
        } else {
            showNotification('AI detection service unavailable', 'error');
            return false;
        }
        
    } catch (error) {
        console.error('🔗 API connection failed:', error);
        showNotification('Cannot connect to AI service. Please check if Flask server is running.', 'error');
        return false;
    }
}

// Test API connection saat game initialize
setTimeout(() => {
    testAPIConnection();
}, 2000);

// ====== UTILITY FUNCTIONS ======
// Format time untuk display
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Generate random ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ====== MOBILE RESPONSIVENESS ======
// Handle mobile orientation change
window.addEventListener('orientationchange', function() {
    setTimeout(() => {
        // Recalculate camera dimensions jika perlu
        if (videoElement) {
            console.log('📱 Orientation changed, adjusting camera');
        }
    }, 500);
});

// Touch events untuk mobile
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', function(e) {
    touchEndY = e.changedTouches[0].screenY;
    handleSwipeGesture();
});

function handleSwipeGesture() {
    const swipeThreshold = 50;
    const diff = touchStartY - touchEndY;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe up - bisa digunakan untuk shortcuts
            console.log('📱 Swipe up detected');
        } else {
            // Swipe down
            console.log('📱 Swipe down detected');
        }
    }
}

// ====== ADVANCED GAME FEATURES ======
// Combo system untuk consecutive correct answers
let comboCount = 0;
let lastCorrectTime = 0;

function handleComboSystem(isCorrect) {
    const currentTime = Date.now();
    
    if (isCorrect) {
        if (currentTime - lastCorrectTime < 5000) { // Dalam 5 detik
            comboCount++;
            if (comboCount >= 3) {
                const bonusPoints = comboCount * 2;
                const currentPlayer = gameState.isMultiplayer ? gameState.players[gameState.currentPlayer] : 'Player';
                gameState.score[currentPlayer] += bonusPoints;
                
                showNotification(`🔥 COMBO x${comboCount}! Bonus +${bonusPoints} points!`, 'success');
            }
        } else {
            comboCount = 1;
        }
        lastCorrectTime = currentTime;
    } else {
        comboCount = 0;
    }
}

// Achievement system
const achievements = {
    'first_correct': { name: 'First Success', description: 'Get your first correct answer' },
    'speed_demon': { name: 'Speed Demon', description: 'Get 5 correct answers in 30 seconds' },
    'perfect_game': { name: 'Perfect Game', description: 'Complete a game without mistakes' },
    'multiplayer_winner': { name: 'Multiplayer Champion', description: 'Win a multiplayer game' }
};

let unlockedAchievements = [];

function checkAchievements(context) {
    // Implementation untuk check achievements
    // Bisa ditambahkan logika sesuai kebutuhan
}

// ====== GAME STATISTICS ======
let gameStats = {
    totalGamesPlayed: 0,
    totalCorrectAnswers: 0,
    totalWrongAnswers: 0,
    bestScore: 0,
    averageReactionTime: 0
};

function updateGameStats(isCorrect, score = 0) {
    if (isCorrect) {
        gameStats.totalCorrectAnswers++;
    } else {
        gameStats.totalWrongAnswers++;
    }
    
    if (score > gameStats.bestScore) {
        gameStats.bestScore = score;
    }
    
    console.log('📊 Game stats updated:', gameStats);
}

// ====== FINAL INITIALIZATION ======
console.log('🎮 Semaphore Game Script Loaded Successfully!');
console.log('🔧 Configuration:', CONFIG);
console.log('📋 Available Letters:', Object.keys(SEMAPHORE_DATA).length);

// Export functions untuk debugging (jika perlu)
if (typeof window !== 'undefined') {
    window.SemaphoreGame = {
        // Public API untuk debugging
        getCurrentState: () => gameState,
        getConfig: () => CONFIG,
        testAPI: testAPIConnection,
        resetGame: resetGameState,
        showNotification: showNotification,
        
        // Development helpers
        dev: {
            simulateDetection: (letter, confidence = 0.85) => {
                handleGameDetection({ letter: letter.toUpperCase(), confidence });
            },
            skipToResults: () => {
                gameState.timer = 0;
                endCurrentGame();
            },
            addTestPlayers: () => {
                ['Alice', 'Bob', 'Charlie'].forEach(name => {
                    gameState.players.push(name);
                });
                updatePlayersDisplay();
                updateStartButton();
            }
        }
    };
}

// Ready notification
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ All systems ready. Game initialized successfully!');
});








