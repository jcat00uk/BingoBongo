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
    td.classList.remove('called','highlight');
  });

  saveState();
};

// ========================
// POPULATE CARD LIST
// ========================
// ========================
// POPULATE CARD LIST WITH PREVIEW
// ========================
let previewState = {}; // store which cards are previewed

function populateCardList(filter='') {
  cardList.innerHTML = '';

  // Filter cards by search
  const filteredCards = Object.values(cards).filter(c => c.code.toLowerCase().includes(filter.toLowerCase()));

  // Sort selected cards to top
  const sortedCards = filteredCards.sort((a, b) => {
    const aSelected = tempSelection.includes(a.code);
    const bSelected = tempSelection.includes(b.code);
    if(aSelected && !bSelected) return -1;
    if(!aSelected && bSelected) return 1;
    return 0;
  });

  const reachedMax = tempSelection.length >= maxSelection;

  sortedCards.forEach(c => {
    const id = 'chk_' + c.code;
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.flexDirection = 'column';

    // Top row: checkbox + code + info button
    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.alignItems = 'center';
    topRow.style.gap = '6px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = tempSelection.includes(c.code);
    checkbox.disabled = reachedMax && !tempSelection.includes(c.code);

    checkbox.addEventListener('change', () => {
      const code = c.code;
      if (checkbox.checked) {
        if (tempSelection.length >= maxSelection) {
          checkbox.checked = false;
          alert(`You can select up to ${maxSelection} cards`);
          return;
        }
        if (!tempSelection.includes(code)) tempSelection.push(code);
      } else {
        tempSelection = tempSelection.filter(x => x !== code);
      }
      populateCardList(searchInput.value); // re-render list
    });

    const span = document.createElement('span');
    span.textContent = c.code;

    // Info button
    const infoBtn = document.createElement('button');
    infoBtn.textContent = 'ℹ️';
    infoBtn.className = 'preview-btn';

    // Card preview table
    const previewTable = document.createElement('table');
    previewTable.className = 'card-preview';

    c.numbers.forEach(row => {
      const tr = document.createElement('tr');
      row.forEach(n => {
        const td = document.createElement('td');
        if (n !== null) td.textContent = n;
        tr.appendChild(td);
      });
      previewTable.appendChild(tr);
    });

    // Restore preview state if it exists
    previewTable.style.display = previewState[c.code] ? 'table' : 'none';

    infoBtn.addEventListener('click', () => {
      previewState[c.code] = !previewState[c.code];  // toggle state
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

  // Remove previous Quick Pick cards from tempSelection, keep manual ones
  tempSelection = [
    ...tempSelection.filter(code => !allCodes.includes(code)),
    ...selected
  ];

  // Re-render list so checked boxes are updated at top
  populateCardList(searchInput.value);

  // FLASH the newly selected cards
  selected.forEach(code=>{
    const checkbox = document.getElementById('chk_' + code);
    if(checkbox){
      const label = checkbox.parentElement;  // flash the label, not the tiny checkbox
      label.classList.add('flash');
      setTimeout(()=>label.classList.remove('flash'), 600);
    }
  });
}


// Quick pick buttons
quickPickButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const count = parseInt(btn.dataset.count);
    pickRandomCards(count);
  });
});


// This prevents the list from re-rendering on every keystroke, which is important for 1000+ cards.
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
          td.addEventListener('click', ()=>{
            td.classList.toggle('called');
            td.classList.add('highlight');
            setTimeout(()=>td.classList.remove('highlight'),500);
            checkFullHouse(div, c);
            saveState();
          });
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

// ========================
// INIT
// ========================
window.addEventListener('load', ()=>{ loadState(); });
