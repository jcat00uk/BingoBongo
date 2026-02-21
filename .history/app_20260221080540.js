// ===============================
// BINGO APP SCRIPT
// ===============================

let numbers = [];
let calledNumbers = [];
let gameActive = false;
let callingLock = false;
let soundEnabled = true;
let ttsEnabled = true;

let selectedCards = [];          
let modalSelections = new Set();

let firstLineCalled = false;
let firstFullHouseCalled = false;

let lastLineCards = new Set();
let lastFullHouseCards = new Set();

const autoCheckToggle = document.getElementById('autoCheckToggle');

// ===============================
// ELEMENTS
// ===============================

const startGameBtn = document.getElementById('startGameBtn');
const endGameBtn = document.getElementById('endGameBtn');
const nextNumberBtn = document.getElementById('nextNumberBtn');
const undoNumberBtn = document.getElementById('undoNumberBtn');
const toggleSoundBtn = document.getElementById('toggleSoundBtn');
const toggleTTSBtn = document.getElementById('toggleTTSBtn');
const toggleNightModeBtn = document.getElementById('toggleNightModeBtn');
const calledNumbersContainer = document.getElementById('calledNumbersContainer');
const bingoGrid = document.getElementById('bingoGrid');
const checkCardContainer = document.getElementById('checkCardContainer');
const cardSelect = document.getElementById('cardSelect');

const bigLastNumber = document.getElementById('bigLastNumber');

const selectCardsModal = document.getElementById('selectCardsModal');
const modalCardList = document.getElementById('modalCardList');
const selectAllCardsBtn = document.getElementById('selectAllCardsBtn');
const clearAllCardsBtn = document.getElementById('clearAllCardsBtn');
const confirmCardsBtn = document.getElementById('confirmCardsBtn');
const closeCardsModalBtn = document.getElementById('closeCardsModalBtn');
const cardSearchBox = document.getElementById('cardSearchBox');
const selectCardsBtn = document.getElementById('selectCardsBtn');

const winAnimation = document.getElementById('winAnimation');

const cells = {}; // 1–90 mapping

// ===============================
// SOUND
// ===============================

const dingAudio = new Audio('ding.mp3');

undoNumberBtn.disabled = true;

autoCheckToggle.onchange = () => {
  localStorage.setItem('bingobongo_autoCheck', autoCheckToggle.checked);
};

// Play sound for a number being called
function playSound() {
  if (!soundEnabled) return;
  dingAudio.currentTime = 0;
  dingAudio.play().catch(() => {});
}

// Speak the number using TTS
function speakNumber(num) {
  if (!ttsEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  setTimeout(() => {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(num.toString()));
  }, 50);
}

// ===============================
// BINGO GRID
// ===============================

// Initialize the Bingo grid
function initBingoGrid() {
  bingoGrid.innerHTML = '';
  for (let row = 0; row < 11; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      let num = null;
      if (col === 0 && row >= 1 && row <= 9) num = row;
      else if (col >= 1 && col <= 7 && row <= 9) num = col * 10 + row;
      else if (col === 8) num = 80 + row;
      if (num && num <= 90) {
        cell.textContent = num;
        cell.id = `cell-${num}`;
        cells[num] = cell;
      }
      bingoGrid.appendChild(cell);
    }
  }
}

// Mark a called number on the grid
function markCalledNumber(num) {
  if (!cells[num]) return;
  if (window.lastCalledCell) window.lastCalledCell.classList.remove('lastCalled');
  cells[num].classList.add('called', 'lastCalled');
  window.lastCalledCell = cells[num];
}

// Undo the marking of a called number
function undoCalledNumber(num) {
  if (cells[num]) cells[num].classList.remove('called', 'lastCalled');
}

// Clear the entire Bingo grid
function clearBingoGrid() {
  Object.values(cells).forEach(cell => cell.classList.remove('called', 'lastCalled'));
  window.lastCalledCell = null;
}

// ===============================
// GAME UI
// ===============================

// Update the remaining numbers count
function updateRemaining() {
  document.getElementById('remainingCount').textContent = numbers.length;
}

// Update the display of called numbers
function updateCalledNumbersDisplay() {
  calledNumbersContainer.innerHTML = '';
  calledNumbers.forEach((num, i) => {
    const span = document.createElement('span');
    span.textContent = num;
    if (i === calledNumbers.length - 1) span.id = 'lastNumber';
    calledNumbersContainer.appendChild(span);
  });
  const wrapper = document.getElementById('calledNumbersContainerWrapper');
  wrapper.scrollLeft = wrapper.scrollWidth;
}

// Update the large display of the last called number
function updateBigLastNumber() {
  const last = calledNumbers.at(-1) ?? '–';
  bigLastNumber.textContent = last;

  if (last !== '–') {
    bigLastNumber.classList.remove('new-call');
    void bigLastNumber.offsetWidth;
    bigLastNumber.classList.add('new-call');
  }
}

// Update the Undo button's state
function updateUndoButton() {
  undoNumberBtn.disabled = !gameActive || !calledNumbers.length;
}

// ===============================
// GAME LOGIC
// ===============================

// Start the game
function startGame() {
  numbers = Array.from({ length: 90 }, (_, i) => i + 1);
  calledNumbers = [];
  gameActive = true;
  firstLineCalled = false;
  firstFullHouseCalled = false;
  startGameBtn.disabled = true;
  nextNumberBtn.disabled = false;
  endGameBtn.disabled = false;
  cardSelect.disabled = false;  // Enable dropdown when game starts
  selectCardsBtn.disabled = true;  // Disable modal button during game
  updateRemaining();
  updateCalledNumbersDisplay();
  updateBigLastNumber();
  updateUndoButton();
  clearBingoGrid();

  if (!selectedCards.length) {
    selectedCards = Object.keys(cards || {});  // Default to all cards if no selection
    modalSelections = new Set(selectedCards);
  }

  updateAutoCheckToggle();
  saveGameState();
}

// Get the next number and update the game state
function nextNumber() {
  if (!gameActive || callingLock || !numbers.length) return;
  callingLock = true;

  const idx = Math.floor(Math.random() * numbers.length);
  const num = numbers.splice(idx, 1)[0];
  calledNumbers.push(num);

  markCalledNumber(num);
  playSound();
  speakNumber(num);

  updateRemaining();
  updateCalledNumbersDisplay();
  updateBigLastNumber();
  updateUndoButton();

  // Disable the "Next Number" button if all numbers are called
  if (numbers.length === 0) {
    nextNumberBtn.disabled = true;
  }

  if (autoCheckToggle.checked) checkAllSelectedCards();

  callingLock = false;
  saveGameState();
}

// Undo the last called number
function undoNumber() {
  if (!gameActive || !calledNumbers.length) return;
  if (!confirm('Undo last number?')) return;

  const num = calledNumbers.pop();
  numbers.push(num);
  numbers.sort((a, b) => a - b);

  // Clear the grid and redraw the called numbers
  clearBingoGrid();
  calledNumbers.forEach(markCalledNumber);

  updateRemaining();
  updateCalledNumbersDisplay();
  updateBigLastNumber();
  updateUndoButton();
  saveGameState();
}

// End the game and reset the state
function endGame() {
  if (!confirm('End the game?')) return;
  calledNumbers = [];
  numbers = [];
  updateCalledNumbersDisplay();
  updateBigLastNumber();
  clearBingoGrid();
  gameActive = false;

  firstLineCalled = false;
  firstFullHouseCalled = false;

  startGameBtn.disabled = false;
  nextNumberBtn.disabled = true;
  endGameBtn.disabled = true;
  
  selectCardsBtn.disabled = false;
  undoNumberBtn.disabled = true;
  cardSelect.disabled = true;
  cardSelect.value = '';

  numbers = [];
  updateRemaining();  // Set remaining count to 0

  modalSelections.clear();
  selectedCards = [];
  populateCardSelect();
  checkCardContainer.innerHTML = '';

  saveGameState();
}

// ===============================
// CARD SELECT / MODAL LOGIC
// ===============================

// Show selected cards with the result
function showCard(card, clearExisting = true) {
  if (clearExisting) checkCardContainer.innerHTML = '';
  const last = calledNumbers.at(-1);

  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.code = card.code;

  const header = document.createElement('div');
  header.className = 'card-header';
  const h4 = document.createElement('h4');
  h4.textContent = card.code;

  const resultSpan = document.createElement('span');
  resultSpan.className = 'card-result';
  header.appendChild(h4);
  header.appendChild(resultSpan);
  div.appendChild(header);

  const table = document.createElement('table');
  card.numbers.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(n => {
      const td = document.createElement('td');
      if (n !== null) {
        td.textContent = n;
        if (calledNumbers.includes(n)) td.classList.add('called');
        if (n === last) td.classList.add('lastCalled');
      }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  div.appendChild(table);
  checkCardContainer.appendChild(div);

  div.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return resultSpan;
}

// Check the result of a selected card
function checkSelectedCard() {
  const code = cardSelect.value;
  if (!code || !cards?.[code]) return alert('Please select a valid card');
  const card = cards[code];
  const resultSpan = showCard(card);

  let resultText = 'No win yet';
  if (checkFullHouse(card)) resultText = 'FULL HOUSE!';
  else if (checkLine(card)) resultText = 'LINE!';

  showCardResult(resultText, resultSpan);
}

// ===============================
// AUTO CHECK
// ===============================

// Update auto-check toggle state
function updateAutoCheckToggle() {
  if (!selectedCards.length || selectedCards.length === Object.keys(cards).length) {
    autoCheckToggle.disabled = true;
    autoCheckToggle.checked = false;
  } else {
    autoCheckToggle.disabled = false;
    const saved = localStorage.getItem('bingobongo_autoCheck');
    if (saved !== null) autoCheckToggle.checked = saved === 'true';
  }
}

// ===============================
// STATE MANAGEMENT
// ===============================

// Save game state to localStorage
function saveGameState() {
  localStorage.setItem('bingobongo_state', JSON.stringify({
    numbers,
    calledNumbers,
    gameActive,
    soundEnabled,
    ttsEnabled,
    nightMode: document.body.classList.contains('night-mode'),
    selectedCards,
    firstLineCalled,
    firstFullHouseCalled,
    lastLineCards: Array.from(lastLineCards),
    lastFullHouseCards: Array.from(lastFullHouseCards),
    selectCardsBtnDisabled: selectCardsBtn?.disabled ?? false,
    cardSelectDisabled: cardSelect?.disabled ?? false
  }));
}

// Load game state from localStorage
function loadGameState() {
  const state = JSON.parse(localStorage.getItem('bingobongo_state') || '{}');
  const isFirstVisit = !localStorage.getItem('firstVisit');
  
  if (isFirstVisit) {
    document.body.classList.add('night-mode');
    localStorage.setItem('firstVisit', 'false');
    localStorage.setItem('bingobongo_state', JSON.stringify({
      nightMode: true,
      ...state
    }));
  }

  numbers = state.numbers || [];
  calledNumbers = state.calledNumbers || [];
  gameActive = !!state.gameActive;
  soundEnabled = state.soundEnabled !== undefined ? state.soundEnabled : true;
  ttsEnabled = state.ttsEnabled !== undefined ? state.ttsEnabled : true;
  selectedCards = state.selectedCards || [];
  firstLineCalled = state.firstLineCalled || false;
  firstFullHouseCalled = state.firstFullHouseCalled || false;
  lastLineCards = new Set(state.lastLineCards || []);
  lastFullHouseCards = new Set(state.lastFullHouseCards || []);

  if (state.nightMode || isFirstVisit) {
    document.body.classList.add('night-mode');
  }

  if (toggleNightModeBtn)
    toggleNightModeBtn.textContent = document.body.classList.contains('night-mode') ? '🌙' : '🌞';

  if (toggleSoundBtn) toggleSoundBtn.textContent = soundEnabled ? '🔊' : '🔇';
  if (toggleTTSBtn) toggleTTSBtn.textContent = ttsEnabled ? '🗣️' : '🚫';

  clearBingoGrid();
  calledNumbers.forEach(markCalledNumber);

  modalSelections = new Set(selectedCards);
  populateCardSelect();
  updateAutoCheckToggle();

  startGameBtn.disabled = gameActive;
  nextNumberBtn.disabled = !gameActive;
  endGameBtn.disabled = !gameActive;
  selectCardsBtn.disabled = gameActive;
  cardSelect.disabled = state.cardSelectDisabled ?? !gameActive;

  updateRemaining();
  updateCalledNumbersDisplay();
  updateBigLastNumber();
  updateUndoButton();
}

// ===============================
// EVENT BINDINGS
// ===============================

startGameBtn.onclick = startGame;
nextNumberBtn.onclick = () => {
  clearCardSelection(); 
  checkCardContainer.innerHTML = ''; 
  nextNumber();
};
undoNumberBtn.onclick = undoNumber;
endGameBtn.onclick = endGame;

window.addEventListener('load', () => {
  if (toggleSoundBtn)
    toggleSoundBtn.onclick = () => { soundEnabled = !soundEnabled; toggleSoundBtn.textContent = soundEnabled ? '🔊' : '🔇'; saveGameState(); };
  if (toggleTTSBtn)
    toggleTTSBtn.onclick = () => { ttsEnabled = !ttsEnabled; toggleTTSBtn.textContent = ttsEnabled ? '🗣️' : '🚫'; saveGameState(); };
  if (toggleNightModeBtn)
    toggleNightModeBtn.onclick = () => { document.body.classList.toggle('night-mode'); toggleNightModeBtn.textContent = document.body.classList.contains('night-mode') ? '🌙' : '🌞'; saveGameState(); };
});

if (selectCardsBtn) selectCardsBtn.onclick = openSelectCardsModal;
if (closeCardsModalBtn) closeCardsModalBtn.onclick = closeSelectCardsModal;
if (selectAllCardsBtn) selectAllCardsBtn.onclick = () => { Object.keys(cards || {}).forEach(code => modalSelections.add(code)); renderModalCardList(); updateAutoCheckToggle(); saveGameState(); };
if (clearAllCardsBtn) clearAllCardsBtn.onclick = () => { modalSelections.clear(); renderModalCardList(); updateAutoCheckToggle(); saveGameState(); };

if (confirmCardsBtn) confirmCardsBtn.onclick = () => {
  selectedCards = Array.from(modalSelections);
  populateCardSelect();
  closeSelectCardsModal();
  updateAutoCheckToggle();
  saveGameState();
};

if (cardSearchBox) cardSearchBox.oninput = renderModalCardList;

// ===============================
// INITIALIZATION
// ===============================

window.addEventListener('load', () => {
  initBingoGrid();
  loadGameState();
  updateButtonGlows();
  if (window.cards) populateCardSelect();
});