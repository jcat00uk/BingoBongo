let selectedCards = [];
const maxSelection = 3;
let tempSelection = []; // holds random picks or manual ticks before confirm

const newGameBtn = document.getElementById('newGameBtn');
const endGameBtn = document.getElementById('endGameBtn');

const cardSelectionWrapper = document.getElementById('cardSelectionWrapper');
const searchInput = document.getElementById('searchInput');
const cardList = document.getElementById('cardList');
const confirmSelectionBtn = document.getElementById('confirmSelectionBtn');

const cardsWrapper = document.getElementById('cardsWrapper');
const bingoText = document.getElementById('bingoText');

const quickPickButtons = document.querySelectorAll('.quick-pick-btn[data-count]');

// ========================
// STATE PERSISTENCE
// ========================
function saveState() {
  const cardsProgress = {};
  selectedCards.forEach(code => {
    const cardDiv = document.querySelector(`.card[data-code='${code}']`);
    if(!cardDiv) return;
    const calledNumbers = [];
    cardDiv.querySelectorAll('td').forEach(td=>{
      if(td.classList.contains('called') && td.textContent) calledNumbers.push(Number(td.textContent));
    });
    cardsProgress[code] = calledNumbers;
  });

  localStorage.setItem('playercard_state', JSON.stringify({
    selectedCards,
    cardsProgress
  }));
}

// ========================
// LOAD STATE
// ========================
function loadState() {
  const state = JSON.parse(localStorage.getItem('playercard_state') || '{}');
  if (!state) return;

  selectedCards = state.selectedCards || [];
  if(selectedCards.length){
    cardSelectionWrapper.style.display='none';
    newGameBtn.disabled=true;
    endGameBtn.disabled=false;
    renderSelectedCards(state.cardsProgress);
  }
}

// ========================
// NEW GAME
// ========================
newGameBtn.onclick = () => {
  cardSelectionWrapper.style.display = 'flex';
  newGameBtn.disabled = true;
  endGameBtn.disabled = false;
  tempSelection = [];
  populateCardList();
};

// ========================
// END GAME
// ========================
endGameBtn.onclick = () => {
  if(!confirm('End the game?')) return;
  selectedCards = [];
  cardsWrapper.innerHTML = '';
  cardSelectionWrapper.style.display = 'none';
  newGameBtn.disabled = false;
  endGameBtn.disabled = true;

  document.querySelectorAll('.card td').forEach(td=>{
    td.classList.remove('called','highlight','undo-highlight');
  });

  saveState();
};

function positionPopover() {
  const rect = infoPopover.getBoundingClientRect();

  if (rect.right > window.innerWidth - 8) {
    infoPopover.style.left = "auto";
    infoPopover.style.right = "0";
  }
}

// ========================
// CARD SELECTION LOGIC
// ========================

// Temporary storage for selections before confirming
let tempSelection = []; 
const maxSelection = 3;

const cardSelectionWrapper = document.getElementById('cardSelectionWrapper');
const cardList = document.getElementById('cardList');
const searchInput = document.getElementById('searchInput');
const quickPickButtons = document.querySelectorAll('.quick-pick-btn[data-count]');
const confirmSelectionBtn = document.getElementById('confirmSelectionBtn');

let previewState = {}; // store which cards are being previewed
let searchTimeout;

// ------------------------
// Populate the card list
// ------------------------
function populateCardList(filter = '') {
  cardList.innerHTML = '';

  // Filter cards by search input
  const filteredCards = Object.values(cards).filter(c =>
    c.code.toLowerCase().includes(filter.toLowerCase())
  );

  // Sort: selected cards first
  const sortedCards = filteredCards.sort((a, b) => {
    const aSelected = tempSelection.includes(a.code);
    const bSelected = tempSelection.includes(b.code);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });

  const reachedMax = tempSelection.length >= maxSelection;

  sortedCards.forEach(c => {
    const id = 'chk_' + c.code;
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.flexDirection = 'column';
    label.style.border = tempSelection.includes(c.code) ? '2px solid limegreen' : '1px solid #555';
    label.style.borderRadius = '6px';
    label.style.padding = '6px';
    label.style.marginBottom = '6px';
    label.style.backgroundColor = reachedMax && !tempSelection.includes(c.code) ? '#444' : '#333';
    label.style.color = '#eee';

    // Top row: checkbox, code, preview button
    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.alignItems = 'center';
    topRow.style.gap = '8px';

    // BIG CHECKBOX
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = tempSelection.includes(c.code);
    checkbox.disabled = reachedMax && !tempSelection.includes(c.code);
    checkbox.style.transform = 'scale(1.5)'; // big mobile-friendly tickbox
    checkbox.style.cursor = checkbox.disabled ? 'not-allowed' : 'pointer';

    // On change: select/deselect
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (tempSelection.length >= maxSelection) {
          checkbox.checked = false;
          alert(`You can select up to ${maxSelection} cards`);
          return;
        }
        tempSelection.push(c.code);

        // flash green animation
        label.classList.add('flash-green');
        setTimeout(() => label.classList.remove('flash-green'), 200);

      } else {
        tempSelection = tempSelection.filter(x => x !== c.code);

        // flash red animation
        label.classList.add('flash-red');
        setTimeout(() => label.classList.remove('flash-red'), 200);
      }

      // Clear search box after selection
      searchInput.value = '';

      // Re-render list to stick selected at top
      populateCardList(searchInput.value);
    });

    // Card code
    const span = document.createElement('span');
    span.textContent = c.code;
    span.style.flex = '1';

    // Preview button
    const infoBtn = document.createElement('button');
    infoBtn.textContent = '👁️';
    infoBtn.className = 'preview-btn';
    infoBtn.style.background = '#444';
    infoBtn.style.color = '#eee';
    infoBtn.style.border = '1px solid #555';
    infoBtn.style.borderRadius = '6px';
    infoBtn.style.padding = '4px 6px';
    infoBtn.style.cursor = 'pointer';

    // Mini preview table
    const previewTable = document.createElement('table');
    previewTable.className = 'card-preview';
    previewTable.style.display = previewState[c.code] ? 'table' : 'none';
    previewTable.style.marginTop = '6px';
    previewTable.style.borderCollapse = 'collapse';

    c.numbers.forEach(row => {
      const tr = document.createElement('tr');
      row.forEach(n => {
        const td = document.createElement('td');
        td.textContent = n !== null ? n : '';
        td.style.border = '1px solid #555';
        td.style.padding = '4px';
        td.style.textAlign = 'center';
        td.style.width = '28px';
        td.style.height = '28px';
        tr.appendChild(td);
      });
      previewTable.appendChild(tr);
    });

    // Preview toggle
    infoBtn.addEventListener('click', () => {
      previewState[c.code] = !previewState[c.code];
      previewTable.style.display = previewState[c.code] ? 'table' : 'none';
    });

    topRow.appendChild(checkbox);
    topRow.appendChild(span);
    topRow.appendChild(infoBtn);

    label.appendChild(topRow);
    label.appendChild(previewTable);

    cardList.appendChild(label);
  });
}

// ------------------------
// Search input handling
// ------------------------
searchInput.addEventListener('input', () => {
  searchInput.value = searchInput.value.replace(/\D/g, ''); // digits only
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => populateCardList(searchInput.value), 150);
});

// ------------------------
// Quick pick random cards
// ------------------------
function pickRandomCards(count) {
  const allCodes = Object.keys(cards);
  const selected = [];

  while (selected.length < count && selected.length < allCodes.length) {
    const rand = allCodes[Math.floor(Math.random() * allCodes.length)];
    if (!tempSelection.includes(rand)) selected.push(rand);
  }

  tempSelection = [...tempSelection, ...selected];
  searchInput.value = '';
  populateCardList();

  // Flash newly picked cards
  selected.forEach(code => {
    const checkbox = document.getElementById('chk_' + code);
    if (checkbox) {
      const label = checkbox.parentElement;
      label.classList.add('flash-green');
      setTimeout(() => label.classList.remove('flash-green'), 600);
    }
  });
}

quickPickButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const count = parseInt(btn.dataset.count);
    pickRandomCards(count);
  });
});
searchInput.addEventListener('input', () => {
  // Remove anything that is not a digit
  searchInput.value = searchInput.value.replace(/\D/g, '');
  
  // Then do your normal search
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => populateCardList(searchInput.value), 150);
});

// ========================
// QUICK PICK RANDOM CARDS
// ========================
function pickRandomCards(count){
  const allCodes = Object.keys(cards);
  const selected = [];

  while(selected.length < count && selected.length < allCodes.length){
    const rand = allCodes[Math.floor(Math.random() * allCodes.length)];
    if(!selected.includes(rand)) selected.push(rand);
  }

  tempSelection = [
    ...tempSelection.filter(code => !allCodes.includes(code)),
    ...selected
  ];
searchInput.value = '';
  populateCardList(searchInput.value);

  selected.forEach(code=>{
    const checkbox = document.getElementById('chk_' + code);
    if(checkbox){
      const label = checkbox.parentElement;
      label.classList.add('flash');
      setTimeout(()=>label.classList.remove('flash'), 600);
    }
  });
  
}

quickPickButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const count = parseInt(btn.dataset.count);
    pickRandomCards(count);
  });
  
});

let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => populateCardList(searchInput.value), 150);
});

// ========================
// CONFIRM SELECTION BUTTON
// ========================
confirmSelectionBtn.onclick = () => {
  if(tempSelection.length === 0) return alert('Select at least one card');
  if(tempSelection.length > maxSelection) return alert(`You can select up to ${maxSelection} cards`);

  selectedCards = [...tempSelection];
  cardSelectionWrapper.style.display='none';
  renderSelectedCards();
  saveState();
};

// ========================
// RENDER SELECTED CARDS
// ========================
function renderSelectedCards(cardsProgress={}) {
  cardsWrapper.innerHTML='';
  selectedCards.forEach(code=>{
    const c = cards[code];
    const div = document.createElement('div');
    div.className='card';
    div.dataset.code = code;
    div.innerHTML=`<h4>${c.code}</h4>`;
    const table = document.createElement('table');

    c.numbers.forEach(row=>{
      const tr = document.createElement('tr');
      row.forEach(n=>{
        const td = document.createElement('td');
        if(n!==null){
          td.textContent = n;
          if(cardsProgress[code] && cardsProgress[code].includes(n)){
            td.classList.add('called');
          }

          // ======= NEW TAP HANDLER =======
          let lastTapTime = 0;
          let lastTappedCell = null;
          const DOUBLE_TAP_DELAY = 300;
          const TAP_LOCK_DELAY = 80;
          let tapLocked = false;

function handleCellTap(cell, cardDiv, cardData) {
  if (tapLocked) return;
  tapLocked = true;
  setTimeout(() => tapLocked = false, TAP_LOCK_DELAY);

  // Only check double-tap if the cell is already called
  if (cell.classList.contains("called")) {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;
    const isSameCell = cell === lastTappedCell;
    const isDoubleTap = isSameCell && timeSinceLastTap < DOUBLE_TAP_DELAY;

    if (isDoubleTap) {
      undoCell(cell);
    }

    lastTapTime = now;
    lastTappedCell = cell;
    return;
  }

  // Cell not yet called → just select it
  selectCell(cell, cardDiv, cardData);
};

          function selectCell(cell, cardDiv, cardData) {
            cell.classList.add("called");
            cell.classList.add("highlight");

            cell.style.transform = "scale(1.1)";
            setTimeout(() => {
              cell.classList.remove("highlight");
              cell.style.transform = "";
            }, 200);

            checkFullHouse(cardDiv, cardData);
            saveState();

            if (navigator.vibrate) navigator.vibrate(15);
          }

          function undoCell(cell) {
            cell.classList.remove("called");
            cell.classList.add("undo-highlight");

            cell.style.transform = "scale(1.1)";
            setTimeout(() => {
              cell.classList.remove("undo-highlight");
              cell.style.transform = "";
            }, 200);

            saveState();

            if (navigator.vibrate) navigator.vibrate([10,40,10]);
          }

          td.addEventListener("click", () => handleCellTap(td, div, c));
          td.addEventListener("touchend", (e) => {
            e.preventDefault();
            handleCellTap(td, div, c);
          }, { passive: false });

        }
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });
    div.appendChild(table);
    cardsWrapper.appendChild(div);
  });
}

// ========================
// CHECK FULL HOUSE
// ========================
function checkFullHouse(div, card){
  const allCalled = card.numbers.flat().filter(n=>n!==null).every(n=>{
    return [...div.querySelectorAll('td.called')].some(td=>td.textContent==n);
  });

  if(allCalled){
    bingoText.style.display='block';
    const rect = div.getBoundingClientRect();
    bingoText.style.top = (window.scrollY + rect.top + rect.height / 2) + 'px';
    bingoText.style.left = (rect.left + rect.width / 2) + 'px';

    bingoText.style.transform = 'translate(-50%, -50%) scale(0.5)';
    bingoText.style.opacity = '1';

    let colors = ['limegreen','cyan','yellow','magenta'];
    let i=0;
    let interval = setInterval(()=>{
      bingoText.style.color = colors[i%colors.length];
      bingoText.style.textShadow = `0 0 10px ${colors[i%colors.length]}, 0 0 20px ${colors[i%colors.length]}`;
      i++;
    },150);

    setTimeout(()=>{
      bingoText.style.transform = 'translate(-50%, -50%) scale(1.5)';
      bingoText.style.opacity = '0';
      clearInterval(interval);
    },2000);

    setTimeout(()=>{ bingoText.style.display='none'; },2200);
  }
}


// Info toggle
const infoBtn = document.getElementById('infoBtn');
const infoPopover = document.getElementById('infoPopover');

function positionPopover() {
  const rect = infoPopover.getBoundingClientRect();

  // If overflowing right side
  if (rect.right > window.innerWidth) {
    infoPopover.style.right = "auto";
    infoPopover.style.left = "0";
  } else {
    infoPopover.style.left = "";
    infoPopover.style.right = "0";
  }
}

infoBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  infoPopover.classList.toggle('show');

  if (infoPopover.classList.contains('show')) {
    positionPopover();
  }
});

// Close if clicking outside
document.addEventListener('click', (e) => {
  if (!infoPopover.contains(e.target) && e.target !== infoBtn) {
    infoPopover.classList.remove('show');
  }
});

// Recheck position on resize
window.addEventListener('resize', () => {
  if (infoPopover.classList.contains('show')) {
    positionPopover();
  }
});

// ========================
// INIT
// ========================
window.addEventListener('load', ()=>{ loadState(); });