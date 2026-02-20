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



function playSound() {
  if (!soundEnabled) return;
  dingAudio.currentTime = 0;
  dingAudio.play().catch(() => {});
}

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

function markCalledNumber(num) {
  if (!cells[num]) return;
  if (window.lastCalledCell) window.lastCalledCell.classList.remove('lastCalled');
  cells[num].classList.add('called', 'lastCalled');
  window.lastCalledCell = cells[num];
}

function undoCalledNumber(num) {
  if (cells[num]) cells[num].classList.remove('called', 'lastCalled');
}

function clearBingoGrid() {
  Object.values(cells).forEach(cell => cell.classList.remove('called', 'lastCalled'));
  window.lastCalledCell = null;
}

// ===============================
// GAME UI
// ===============================

function updateRemaining() {
  document.getElementById('remainingCount').textContent = numbers.length;
}

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

function updateBigLastNumber() {
  const last = calledNumbers.at(-1) ?? '–';
  bigLastNumber.textContent = last;

  if (last !== '–') {
    bigLastNumber.classList.remove('new-call');
    void bigLastNumber.offsetWidth;
    bigLastNumber.classList.add('new-call');
  }
}

function updateUndoButton() {
  undoNumberBtn.disabled = !gameActive || !calledNumbers.length;
}

function updateButtonGlows() {
  // Glow the start button only if the game is not active
  if (!gameActive) startGameBtn.classList.add('enabled-glow');
  else startGameBtn.classList.remove('enabled-glow');

  // Glow the next number button only if the game is active AND numbers remain
  if (gameActive && numbers.length) nextNumberBtn.classList.add('enabled-glow');
  else nextNumberBtn.classList.remove('enabled-glow');
}

// ===============================
// GAME LOGIC
// ===============================

function startGame() {
  numbers = Array.from({ length: 90 }, (_, i) => i + 1);
  calledNumbers = [];
  gameActive = true;
  firstLineCalled = false;
  firstFullHouseCalled = false;
  startGameBtn.disabled = true;
  nextNumberBtn.disabled = false;
  endGameBtn.disabled = false;
  cardSelect.disabled = false; // enable dropdown when game starts
  selectCardsBtn.disabled = true; // Disable modal button during game
  updateRemaining();
  updateCalledNumbersDisplay();
  updateBigLastNumber();
  updateUndoButton();
  clearBingoGrid();

  if (!selectedCards.length) {
    selectedCards = Object.keys(cards || {}); // default to all
    modalSelections = new Set(selectedCards);
  }


  updateAutoCheckToggle();
  saveGameState();
  updateButtonGlows();
}

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

  if (autoCheckToggle.checked) checkAllSelectedCards();

  callingLock = false;
  saveGameState();
}

function undoNumber() {
  if (!gameActive || !calledNumbers.length) return;
  if (!confirm('Undo last number?')) return;

  const num = calledNumbers.pop();
  numbers.push(num);
  numbers.sort((a, b) => a - b);

  // Reset first line/full house flags
  firstLineCalled = false;
  firstFullHouseCalled = false;

  // Clear the grid and redraw called numbers
  clearBingoGrid();
  calledNumbers.forEach(markCalledNumber);

  // Combine affected cards (all previously winning cards)
  const affectedCards = new Set([...lastLineCards, ...lastFullHouseCards]);

  // Remove old card divs from DOM
  affectedCards.forEach(code => {
    const cardDiv = checkCardContainer.querySelector(`.card[data-code="${code}"]`);
    if (cardDiv) cardDiv.remove();
  });

  // Clear tracking sets
  lastLineCards.clear();
  lastFullHouseCards.clear();

  // Recalculate results for affected cards
  affectedCards.forEach(code => {
    const card = cards[code];
    if (!card) return;

    const resultSpan = showCard(card, false); // do not clear container
    let resultText = 'No win yet';

    if (!firstLineCalled && checkLine(card)) {
      resultText = 'LINE!';
      firstLineCalled = true;
      lastLineCards.add(code);
    } else if (!firstFullHouseCalled && checkFullHouse(card)) {
      resultText = 'FULL HOUSE!';
      firstFullHouseCalled = true;
      lastFullHouseCards.add(code);
    }

    showCardResult(resultText, resultSpan);
  });

  updateRemaining();
  updateCalledNumbersDisplay();
  updateBigLastNumber();
  updateUndoButton();
  saveGameState();
}







function endGame() {
  if (!confirm('End the game?')) return;
  calledNumbers = [];
  numbers = [];
   updateCalledNumbersDisplay();   // ✅ CLEAR THE STRIP
  updateBigLastNumber();          // (optional but recommended)
  clearBingoGrid();
  gameActive = false;
  
    // Reset first line/full house flags
  firstLineCalled = false;
  firstFullHouseCalled = false;

  startGameBtn.disabled = false;
  nextNumberBtn.disabled = true;
  endGameBtn.disabled = true;
  
  selectCardsBtn.disabled = false;
  undoNumberBtn.disabled = true;
  cardSelect.disabled = true;
  cardSelect.value = '';

  modalSelections.clear();
  selectedCards = [];
  populateCardSelect();
  checkCardContainer.innerHTML = '';

  updateButtonGlows();
  saveGameState();
}



// ===============================
// CARD CHECK
// ===============================

function showCard(card, clearExisting = true) {
  if (clearExisting) checkCardContainer.innerHTML = '';
  const last = calledNumbers.at(-1);

  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.code = card.code; // add this line
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

  // Auto scroll to the card smoothly
  div.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return resultSpan;
}

function showCardResult(resultText, element) {
  element.textContent = resultText;
  if (resultText === 'LINE!') element.style.color = 'orange';
  else if (resultText === 'FULL HOUSE!') element.style.color = 'limegreen';
  else element.style.color = 'yellow';

  showWinAnimation(resultText);

  if (ttsEnabled && 'speechSynthesis' in window) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(resultText));
  }
}

function checkLine(card) {
  return card.numbers.some(row => row.filter(n => n !== null).every(n => calledNumbers.includes(n)));
}

function checkFullHouse(card) {
  return card.numbers.flat().filter(n => n !== null).every(n => calledNumbers.includes(n));
}

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

function updateAutoCheckToggle() {
  if (!selectedCards.length || selectedCards.length === Object.keys(cards).length) {
    autoCheckToggle.disabled = true;
    autoCheckToggle.checked = false;
  } else {
    autoCheckToggle.disabled = false;
    // Restore saved state if available
    const saved = localStorage.getItem('bingobongo_autoCheck');
    if (saved !== null) autoCheckToggle.checked = saved === 'true';
  }
}

function updateAutoCheckState() {
  // Disable slider if all cards are selected
  if (selectedCards.length === Object.keys(cards || {}).length) {
    autoCheckToggle.disabled = true;
    autoCheckToggle.checked = false;
  } else {
    autoCheckToggle.disabled = false;
  }
}

function checkAllSelectedCards() {
  selectedCards.forEach(code => {
    const card = cards[code];
    if (!card) return;

    // First LINE
    if (!firstLineCalled && checkLine(card)) {
      firstLineCalled = true;
      lastLineCards.add(code);
      const resultSpan = showCard(card, false);
      showCardResult(`Bingobongo, LINE, ${code}`, resultSpan);
    } 
    // First FULL HOUSE
    else if (!firstFullHouseCalled && checkFullHouse(card)) {
      firstFullHouseCalled = true;
      lastFullHouseCards.add(code);
      const resultSpan = showCard(card, false);
      showCardResult(`Bingobongo, FULL HOUSE, ${code}`, resultSpan);
    }
  });
}

function recalcFirstWins() {
  firstLineCalled = false;
  firstFullHouseCalled = false;

  selectedCards.forEach(code => {
    const card = cards[code];
    if (!card) return;
    if (!firstLineCalled && checkLine(card)) firstLineCalled = true;
    if (!firstFullHouseCalled && checkFullHouse(card)) firstFullHouseCalled = true;
  });
}


// ===============================
// WIN ANIMATION
// ===============================

function showWinAnimation(text) {
  winAnimation.textContent = text;
  winAnimation.style.display = 'block';
  winAnimation.classList.remove('show');
  void winAnimation.offsetWidth;
  winAnimation.classList.add('show');
  setTimeout(() => {
    winAnimation.style.display = 'none';
  }, 6000);
}

// ===============================
// CARD SELECT / MODAL LOGIC
// ===============================



function populateCardSelect() {
  cardSelect.innerHTML = '<option value="">Select card…</option>';

  const list = selectedCards.length ? selectedCards : Object.keys(cards || {});

  // Sort numerically by extracting the number from the card code
  list
    .slice() // clone to avoid modifying original
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    })
    .forEach(code => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = code;
      cardSelect.appendChild(opt);
    });
}

function clearCardSelection() {
  cardSelect.value = '';
}

/*function openSelectCardsModal() {
  if (!selectCardsModal) return;
  selectCardsModal.style.display = 'flex';
  renderModalCardList();
} */


function adjustCardSelectWidth() {
  const select = document.getElementById('cardSelect');
  if (!select) return;
  
  const tmp = document.createElement('span');
  tmp.style.visibility = 'hidden';
  tmp.style.position = 'absolute';
  tmp.style.fontSize = window.getComputedStyle(select).fontSize;
  tmp.style.fontFamily = window.getComputedStyle(select).fontFamily;
  tmp.textContent = select.options[select.selectedIndex]?.text || '';
  document.body.appendChild(tmp);
  select.style.width = `${tmp.offsetWidth + 24}px`; // + padding
  tmp.remove();
}

function adjustModalCardItemWidth() {
  if (!modalCardList) return;

  modalCardList.querySelectorAll('.modal-card-item').forEach(div => {
    const label = div.querySelector('label');
    if (!label) return;

    // Create temporary span to measure text
    const tmp = document.createElement('span');
    tmp.style.visibility = 'hidden';
    tmp.style.position = 'absolute';
    tmp.style.fontSize = window.getComputedStyle(label).fontSize;
    tmp.style.fontFamily = window.getComputedStyle(label).fontFamily;
    tmp.textContent = label.textContent;
    document.body.appendChild(tmp);

    div.style.width = `${tmp.offsetWidth + 40}px`; // 40px for checkbox + padding
    tmp.remove();
  });
}

// Call this after rendering modal items
function renderModalCardList() {
  if (!modalCardList) return;
  modalCardList.innerHTML = '';
  const searchTerm = cardSearchBox?.value?.toLowerCase() || '';
  const allCardCodes = Object.keys(cards || {});

  const pinned = allCardCodes.filter(code => modalSelections.has(code));
  pinned.forEach(code => {
    const div = document.createElement('div');
    div.className = 'modal-card-item pinned';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.code = code;
    checkbox.onchange = () => handleModalCheckboxChange(code, checkbox.checked);
    const label = document.createElement('label');
    label.textContent = code;

    div.appendChild(checkbox);
    div.appendChild(label);
    modalCardList.appendChild(div);
  });

  if (pinned.length) {
    const divider = document.createElement('div');
    divider.style.borderBottom = '1px solid #aaa';
    divider.style.margin = '4px 0';
    modalCardList.appendChild(divider);
  }

  const others = allCardCodes.filter(code => !modalSelections.has(code) && code.toLowerCase().includes(searchTerm));
  others.forEach(code => {
    const div = document.createElement('div');
    div.className = 'modal-card-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;
    checkbox.dataset.code = code;
    checkbox.onchange = () => handleModalCheckboxChange(code, checkbox.checked);
    const label = document.createElement('label');
    label.textContent = code;
    div.appendChild(checkbox);
    div.appendChild(label);
    modalCardList.appendChild(div);
  });

  // ✅ shrink items to fit text
  adjustModalCardItemWidth();
}


// Run on load and onchange
if (cardSelect) {
  adjustCardSelectWidth();
  cardSelect.onchange = () => {
    adjustCardSelectWidth();
    const code = cardSelect.value;
    if (!code || !cards?.[code]) return;

    const card = cards[code];
    const resultSpan = showCard(card);

    let resultText = 'No win yet';
    if (checkFullHouse(card)) resultText = 'FULL HOUSE!';
    else if (checkLine(card)) resultText = 'LINE!';

    showCardResult(resultText, resultSpan);
  };
}

function openSelectCardsModal() {
  console.log("openSelectCardsModal called"); // for debugging
  if (!selectCardsModal) {
    console.error("selectCardsModal element not found!");
    return;
  }
  selectCardsModal.style.display = 'flex';
  selectCardsModal.style.position = 'fixed'; // ensure fixed on mobile
  selectCardsModal.style.top = '0';
  selectCardsModal.style.left = '0';
  selectCardsModal.style.width = '100%';
  selectCardsModal.style.height = '100vh';
  selectCardsModal.style.justifyContent = 'center';
  selectCardsModal.style.alignItems = 'center';
  selectCardsModal.style.zIndex = '1000';
  renderModalCardList();
}

function closeSelectCardsModal() {
  if (!selectCardsModal) return;
  selectCardsModal.style.display = 'none';
}

function handleModalCheckboxChange(code, checked) {
  if (checked) modalSelections.add(code);
  else modalSelections.delete(code);
  renderModalCardList();
  updateAutoCheckToggle();
}

function renderModalCardList() {
  if (!modalCardList) return;
  modalCardList.innerHTML = '';
  const searchTerm = cardSearchBox?.value?.toLowerCase() || '';
  const allCardCodes = Object.keys(cards || {});

  const pinned = allCardCodes.filter(code => modalSelections.has(code));
  pinned.forEach(code => {
    const div = document.createElement('div');
    div.className = 'modal-card-item pinned';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.code = code;
    checkbox.onchange = () => handleModalCheckboxChange(code, checkbox.checked);
    const label = document.createElement('label');
    label.textContent = code;

    div.appendChild(checkbox);
    div.appendChild(label);
    modalCardList.appendChild(div);
  });

  if (pinned.length) {
    const divider = document.createElement('div');
    divider.style.borderBottom = '1px solid #aaa';
    divider.style.margin = '4px 0';
    modalCardList.appendChild(divider);
  }

  const others = allCardCodes.filter(code => !modalSelections.has(code) && code.toLowerCase().includes(searchTerm));
  others.forEach(code => {
    const div = document.createElement('div');
    div.className = 'modal-card-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;
    checkbox.dataset.code = code;
    checkbox.onchange = () => handleModalCheckboxChange(code, checkbox.checked);
    const label = document.createElement('label');
    label.textContent = code;
    div.appendChild(checkbox);
    div.appendChild(label);
    modalCardList.appendChild(div);
  });
}

// ===============================
// STATE
// ===============================

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

function loadGameState() {
  const state = JSON.parse(localStorage.getItem('bingobongo_state') || '{}');

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

  if (state.nightMode) document.body.classList.add('night-mode');

  if (toggleSoundBtn) toggleSoundBtn.textContent = soundEnabled ? '🔊' : '🔇';
  if (toggleTTSBtn) toggleTTSBtn.textContent = ttsEnabled ? '🗣️' : '🚫';
  if (toggleNightModeBtn)
    toggleNightModeBtn.textContent = document.body.classList.contains('night-mode') ? '🌙' : '🌞';

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
  updateButtonGlows();
}

// ===============================
// EVENT BINDINGS
// ===============================

startGameBtn.onclick = startGame;
nextNumberBtn.onclick = () => {
  clearCardSelection(); 
  checkCardContainer.innerHTML = ''; // remove previous card
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



if (cardSelect) {
  cardSelect.onchange = () => {
    const code = cardSelect.value;
    if (!code || !cards?.[code]) return;

    const card = cards[code];
    const resultSpan = showCard(card);

    let resultText = 'No win yet';
    if (checkFullHouse(card)) resultText = 'FULL HOUSE!';
    else if (checkLine(card)) resultText = 'LINE!';

    showCardResult(resultText, resultSpan);
  };
}

window.addEventListener('DOMContentLoaded', () => {
    const nightModeBtn = document.getElementById('nightModeBtn'); // The night mode toggle button
    const body = document.body;

    // Set night mode to 'on' by default if no saved preference exists
    const nightPref = localStorage.getItem('nightMode');
    if (nightPref === null) {
        body.classList.add('night-mode'); // Apply night mode on first load
        localStorage.setItem('nightMode', 'on'); // Save preference as 'on' for future visits
    } else if (nightPref === 'on') {
        body.classList.add('night-mode'); // Apply saved night mode state
    } else {
        body.classList.remove('night-mode'); // If preference is 'off', disable night mode
    }




});

// ===============================
// INITIALIZATION
// ===============================

window.addEventListener('load', () => {
  initBingoGrid();
  loadGameState();
  updateButtonGlows(); // glow now matches real game state
  if (window.cards) populateCardSelect();
});
