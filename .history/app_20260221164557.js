

// ===============================
// BINGO APP SCRIPT
// ===============================

// Array to store remaining numbers and called numbers
let numbers = [];
let calledNumbers = [];
let gameActive = false; // Indicates whether the game is active or not
let callingLock = false; // Prevents multiple calls at once
let soundEnabled = true; // Controls whether the sound is enabled
let ttsEnabled = true; // Controls whether Text-to-Speech is enabled

let selectedCards = []; // Stores selected cards
let modalSelections = new Set(); // Manages card selection in the modal

let firstLineCalled = false; // Flag to check if the first line has been called
let firstFullHouseCalled = false; // Flag to check if the first full house has been called

let lastLineCards = new Set(); // Set of cards with last line win
let lastFullHouseCards = new Set(); // Set of cards with last full house win

// Elements associated with the game controls
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
// Modal related elements for card selection
const selectCardsModal = document.getElementById('selectCardsModal');
const modalCardList = document.getElementById('modalCardList');
const selectAllCardsBtn = document.getElementById('selectAllCardsBtn');
const clearAllCardsBtn = document.getElementById('clearAllCardsBtn');
const confirmCardsBtn = document.getElementById('confirmCardsBtn');
const closeCardsModalBtn = document.getElementById('closeCardsModalBtn');
const cardSearchBox = document.getElementById('cardSearchBox');
const selectCardsBtn = document.getElementById('selectCardsBtn');


// Animation for when someone wins
const winAnimation = document.getElementById('winAnimation');

// 1-90 mapping for Bingo grid cells
const cells = {}; // 1–90 mapping



// ===============================
// SOUND
// ===============================
// Audio object for the "ding" sound when a number is called
const dingAudio = new Audio('ding.mp3');

undoNumberBtn.disabled = true; // Disable the undo button initially

autoCheckToggle.onchange = () => {
  localStorage.setItem('bingobongo_autoCheck', autoCheckToggle.checked); // Save auto-check toggle state in localStorage
};



function playSound() {
  if (!soundEnabled) return; // If sound is disabled, do nothing
  dingAudio.currentTime = 0; // Restart the audio from the beginning
  dingAudio.play().catch(() => {}); // Play the sound
}

// Function to speak the number using Text-to-Speech (TTS) if enabled
function speakNumber(num) {
  if (!ttsEnabled || !('speechSynthesis' in window)) return; // Check if TTS is enabled and supported
  window.speechSynthesis.cancel(); // Cancel any ongoing speech
  setTimeout(() => {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(num.toString())); // Speak the number
  }, 50); // Delay to prevent interruption
}




// ===============================
// BINGO GRID
// ===============================

// Function to initialize the Bingo grid
function initBingoGrid() {
  bingoGrid.innerHTML = ''; // Clear the grid before re-building it
  for (let row = 0; row < 11; row++) { // Loop through rows
    for (let col = 0; col < 9; col++) { // Loop through columns
      const cell = document.createElement('div');
      cell.className = 'grid-cell'; // Assign class to style the grid cell
      let num = null;

      // Assign numbers to cells based on row and column
      if (col === 0 && row >= 1 && row <= 9) num = row;
      else if (col >= 1 && col <= 7 && row <= 9) num = col * 10 + row;
      else if (col === 8) num = 80 + row;

      if (num && num <= 90) { // Ensure the number is valid
        cell.textContent = num; // Display the number
        cell.id = `cell-${num}`; // Set a unique id for each cell
        cells[num] = cell; // Store the cell in the 'cells' object for later reference
      }
      bingoGrid.appendChild(cell); // Append the cell to the grid
    }
  }
}

// Function to mark a called number in the Bingo grid
function markCalledNumber(num) {
  if (!cells[num]) return; // If the cell doesn't exist, do nothing
  if (window.lastCalledCell) window.lastCalledCell.classList.remove('lastCalled'); // Remove previous 'lastCalled' class
  cells[num].classList.add('called', 'lastCalled'); // Mark the cell as called and the last called
  window.lastCalledCell = cells[num]; // Store the last called cell
}

// Function to undo the marking of a called number
function undoCalledNumber(num) {
  if (cells[num]) cells[num].classList.remove('called', 'lastCalled'); // Remove the 'called' and 'lastCalled' classes
}

// Function to clear all markings from the Bingo grid
function clearBingoGrid() {
  Object.values(cells).forEach(cell => cell.classList.remove('called', 'lastCalled')); // Remove 'called' and 'lastCalled' from all cells
  window.lastCalledCell = null; // Reset the last called cell
}

// ===============================
// GAME UI
// ===============================

// Function to update the remaining numbers display
function updateRemaining() {
  document.getElementById('remainingCount').textContent = numbers.length; // Display the remaining numbers
}

// Function to update the called numbers display
function updateCalledNumbersDisplay() {
  calledNumbersContainer.innerHTML = ''; // Clear the display
  calledNumbers.forEach((num, i) => {
    const span = document.createElement('span');
    span.textContent = num;
    if (i === calledNumbers.length - 1) span.id = 'lastNumber'; // Highlight the last number
    calledNumbersContainer.appendChild(span); // Append the span with the called number
  });
  const wrapper = document.getElementById('calledNumbersContainerWrapper');
  wrapper.scrollLeft = wrapper.scrollWidth; // Scroll to the end of the called numbers list
}

// Function to update the display of the last called number
function updateBigLastNumber() {
  const last = calledNumbers.at(-1) ?? '–'; // Get the last called number or display '–' if none
  bigLastNumber.textContent = last; // Display the last called number

  if (last !== '–') {
    bigLastNumber.classList.remove('new-call'); // Remove the 'new-call' class
    void bigLastNumber.offsetWidth; // Trigger a reflow
    bigLastNumber.classList.add('new-call'); // Add the 'new-call' class to trigger animation
  }
}

// Function to update the undo button state
function updateUndoButton() {
  undoNumberBtn.disabled = !gameActive || !calledNumbers.length; // Disable undo if game is inactive or no numbers have been called
}

// Function to update the glow effect on the buttons based on the game state
function updateButtonGlows() {
  if (!gameActive) startGameBtn.classList.add('enabled-glow'); // Add glow to start button if game is inactive
  else startGameBtn.classList.remove('enabled-glow'); // Remove glow if game is active

  if (gameActive && numbers.length) nextNumberBtn.classList.add('enabled-glow'); // Add glow to next number button if game is active and numbers remain
  else nextNumberBtn.classList.remove('enabled-glow'); // Remove glow if no numbers remain
}

// ===============================
// GAME LOGIC
// ===============================

// Function to start a new game
function startGame() {
  numbers = Array.from({ length: 90 }, (_, i) => i + 1); // Initialize numbers from 1 to 90
  calledNumbers = []; // Clear called numbers
  gameActive = true; // Set game to active
  firstLineCalled = false; // Reset first line flag
  firstFullHouseCalled = false; // Reset first full house flag
  startGameBtn.disabled = true; // Disable the start button
  nextNumberBtn.disabled = false; // Enable the next number button
  endGameBtn.disabled = false; // Enable the end game button
  cardSelect.disabled = false; // Enable card selection dropdown
  selectCardsBtn.disabled = true; // Disable card select button during game
  updateRemaining(); // Update remaining numbers count
  updateCalledNumbersDisplay(); // Update called numbers display
  updateBigLastNumber(); // Update the last called number
  updateUndoButton(); // Update the undo button
  clearBingoGrid(); // Clear the Bingo grid

  if (!selectedCards.length) {
    selectedCards = Object.keys(cards || {}); // Default to all cards if none selected
    modalSelections = new Set(selectedCards); // Set the selected cards
  }

  updateAutoCheckToggle(); // Update auto-check toggle state
  saveGameState(); // Save game state to localStorage
  updateButtonGlows(); // Update button glow states
}

// Function to call the next random number
function nextNumber() {
  if (!gameActive || callingLock || !numbers.length) return; // Prevent multiple calls if the game is inactive or no numbers remain
  callingLock = true; // Lock the calling process to prevent multiple calls

  const idx = Math.floor(Math.random() * numbers.length); // Get a random index
  const num = numbers.splice(idx, 1)[0]; // Remove the number from the list
  calledNumbers.push(num); // Add the number to the called numbers list

  // Speak the number before performing any other actions
  speakNumber(num);
  markCalledNumber(num); // Mark the number on the Bingo grid
  playSound(); // Play sound for the called number


  updateRemaining(); // Update the remaining numbers count
  updateCalledNumbersDisplay(); // Update the called numbers display
  updateBigLastNumber(); // Update the last called number
  updateUndoButton(); // Update the undo button

  // Disable next number button if all numbers have been called
  if (numbers.length === 0) {
    nextNumberBtn.disabled = true;
  }

  if (autoCheckToggle.checked) checkAllSelectedCards(); // Check all selected cards if auto-check is enabled

  callingLock = false; // Unlock the calling process
  saveGameState(); // Save the game state to localStorage
}

// Function to undo the last number called
function undoNumber() {
  if (!gameActive || !calledNumbers.length) return; // If the game is not active or no numbers are called, do nothing
  if (!confirm('Undo last number?')) return; // Confirm if the user wants to undo the last number

  const num = calledNumbers.pop(); // Remove the last called number
  numbers.push(num); // Add the number back to the remaining numbers list
  numbers.sort((a, b) => a - b); // Sort the remaining numbers

  firstLineCalled = false; // Reset first line called flag
  firstFullHouseCalled = false; // Reset first full house called flag

  clearBingoGrid(); // Clear the Bingo grid
  calledNumbers.forEach(markCalledNumber); // Redraw the called numbers

  // Handle affected cards after undo
  const affectedCards = new Set([...lastLineCards, ...lastFullHouseCards]);

  affectedCards.forEach(code => {
    const cardDiv = checkCardContainer.querySelector(`.card[data-code="${code}"]`);
    if (cardDiv) cardDiv.remove(); // Remove previously winning card divs
  });

  lastLineCards.clear(); // Clear the last line cards set
  lastFullHouseCards.clear(); // Clear the last full house cards set

  // Recalculate results for affected cards
  affectedCards.forEach(code => {
    const card = cards[code];
    if (!card) return;

    const resultSpan = showCard(card, false); // Do not clear the container
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

   updateRemaining(); // Update remaining numbers count
  updateCalledNumbersDisplay(); // Update called numbers display
  updateBigLastNumber(); // Update last called number
  updateUndoButton(); // Update undo button
  saveGameState(); // Save the game state to localStorage
}

// Function to end the game
function endGame() {
  if (!confirm('End the game?')) return; // Confirm if the user wants to end the game
  calledNumbers = []; // Clear called numbers
  numbers = []; // Clear remaining numbers
  updateCalledNumbersDisplay(); // Update called numbers display
  updateBigLastNumber(); // Update last called number
  clearBingoGrid(); // Clear the Bingo grid
  gameActive = false; // Set game to inactive

  firstLineCalled = false; // Reset first line called flag
  firstFullHouseCalled = false; // Reset first full house called flag

  startGameBtn.disabled = false; // Enable the start button
  nextNumberBtn.disabled = true; // Disable the next number button
  endGameBtn.disabled = true; // Disable the end game button

  selectCardsBtn.disabled = false; // Enable the card select button
  undoNumberBtn.disabled = true; // Disable the undo button
  cardSelect.disabled = true; // Disable card selection dropdown
  cardSelect.value = ''; // Clear card selection

  numbers = []; // Clear numbers array
  updateRemaining(); // Update remaining count to 0

  modalSelections.clear(); // Clear modal selections
  selectedCards = []; // Clear selected cards
  populateCardSelect(); // Repopulate the card select dropdown
  checkCardContainer.innerHTML = ''; // Clear the card check container

  updateButtonGlows(); // Update button glows
  saveGameState(); // Save the game state to localStorage
}



// ===============================
// CARD CHECK
// ===============================

// Function to display a card and its results
function showCard(card, clearExisting = true) {
  if (clearExisting) checkCardContainer.innerHTML = ''; // Clear the container before adding new cards
  const last = calledNumbers.at(-1); // Get the last called number

  const div = document.createElement('div');
  div.className = 'card';
  div.dataset.code = card.code; // Store the card code in the dataset
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
         if (calledNumbers.includes(n)) td.classList.add('called'); // Mark called numbers
        if (n === last) td.classList.add('lastCalled'); // Mark the last called number
    }
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  div.appendChild(table);
  checkCardContainer.appendChild(div);

  // Smoothly scroll the card into view
  div.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return resultSpan; // Return the result span for later updates
}

function showCardResult(resultText, element) {
  element.textContent = resultText;
   if (resultText === 'LINE!') element.style.color = 'orange'; // Style the text based on the result
  else if (resultText === 'FULL HOUSE!') element.style.color = 'limegreen';
  else element.style.color = 'yellow';

  showWinAnimation(resultText); // Trigger the win animation

  // Use setTimeout to delay win state speech to after number is spoken
  if (ttsEnabled && 'speechSynthesis' in window) {
    setTimeout(() => {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(resultText));
    }, 1000);  // 1 second delay to make sure the number is spoken first
  }
}

function checkLine(card) {
  return card.numbers.some(row => row.filter(n => n !== null).every(n => calledNumbers.includes(n))); // Check if all numbers in a row are called
}

function checkFullHouse(card) {
  return card.numbers.flat().filter(n => n !== null).every(n => calledNumbers.includes(n)); // Check if all numbers on the card are called
}

function checkSelectedCard() {
  const code = cardSelect.value;


  let resultText = 'No win yet';
  if (checkFullHouse(card)) resultText = 'FULL HOUSE!';
  else if (checkLine(card)) resultText = 'LINE!';

    if (!code || !cards?.[code]) return alert('Please select a valid card');
  const card = cards[code];
  const resultSpan = showCard(card);

  showCardResult(resultText, resultSpan);
}

// ===============================
// AUTO CHECK
// ===============================

// Function to update the auto-check toggle state
function updateAutoCheckToggle() {
  if (!selectedCards.length || selectedCards.length === Object.keys(cards).length) {
    autoCheckToggle.disabled = true; // Disable toggle if all cards are selected
    autoCheckToggle.checked = false; // Set it to unchecked
  } else {
    autoCheckToggle.disabled = false;
    const saved = localStorage.getItem('bingobongo_autoCheck');
    if (saved !== null) autoCheckToggle.checked = saved === 'true'; // Restore saved state
  }
}

// Function to update the state of auto-check toggle based on selected cards
function updateAutoCheckState() {
  // Disable slider if all cards are selected
  if (selectedCards.length === Object.keys(cards || {}).length) {
    autoCheckToggle.disabled = true;
    autoCheckToggle.checked = false;
  } else {
    autoCheckToggle.disabled = false;
  }
}
// Function to check all selected cards for wins
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

// Function to display the win animation
function showWinAnimation(text) {
  winAnimation.textContent = text; // Set the win text
  winAnimation.style.display = 'block'; // Show the animation
  winAnimation.classList.remove('show');
  void winAnimation.offsetWidth; // Trigger a reflow
  winAnimation.classList.add('show'); // Add animation class to show it
  setTimeout(() => {
    winAnimation.style.display = 'none'; // Hide the animation after 9 seconds
  }, 9000);
}

// ===============================
// CARD SELECT / MODAL LOGIC
// ===============================

// Function to populate the card select dropdown
function populateCardSelect() {
  cardSelect.innerHTML = '<option value="">Select card…</option>'; // Add default option

  const list = selectedCards.length ? selectedCards : Object.keys(cards || {}); // Use selected cards or all cards

  list
    .slice() // Clone to avoid modifying the original
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB; // Sort numerically by card code
    })
    .forEach(code => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = code;
      cardSelect.appendChild(opt);
    });
}

function clearCardSelection() {
  cardSelect.value = ''; // Clear the card selection
}

// Function to adjust the width of the card select dropdown to fit the longest option

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
   select.style.width = `${tmp.offsetWidth + 24}px`; // Adjust width based on longest option text
  tmp.remove(); // Remove the temporary element
}

// Function to adjust the width of each card item in the modal
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

// Function to render the modal card list for selecting cards
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
  adjustModalCardItemWidth();  // Adjust width after rendering modal items
}

// Event listeners and handlers for modals and checkboxes
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
// STATE MANAGEMENT
// ===============================
// Function to save the game state to localStorage
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
// Function to load the game state from localStorage
function loadGameState() {
  const state = JSON.parse(localStorage.getItem('bingobongo_state') || '{}');

  // Check if it's the first visit (no state in localStorage)
  const isFirstVisit = !localStorage.getItem('firstVisit');
  
  // Set night mode as default on first visit
  if (isFirstVisit) {
    document.body.classList.add('night-mode');
    localStorage.setItem('firstVisit', 'false');  // Mark that first visit has occurred
    // Also set nightMode in localStorage to persist it for future visits
    localStorage.setItem('bingobongo_state', JSON.stringify({
      nightMode: true,
      ...state // keep existing state values
    }));
  }

  // Load saved game state
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

  // Load night mode if previously enabled
  if (state.nightMode || isFirstVisit) {
    document.body.classList.add('night-mode');
  }

  // Update the toggle button to reflect night mode status
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

// Binding actions for game buttons
startGameBtn.onclick = startGame;
nextNumberBtn.onclick = () => {
  clearCardSelection(); 
  checkCardContainer.innerHTML = ''; // Clear previous card
  nextNumber();
};
undoNumberBtn.onclick = undoNumber;
endGameBtn.onclick = endGame;

window.addEventListener('load', () => {
  // Initialize sound and TTS toggles
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



// ===============================
// INITIALIZATION
// ===============================
// Initialize the game when the window is loaded
window.addEventListener('load', () => {
  initBingoGrid();
  loadGameState();
  updateButtonGlows();
  if (window.cards) populateCardSelect();
});
