const fs = require('fs');

// Prompt for number of cards
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('How many bingo cards do you want to generate? ', input => {
  const numCards = parseInt(input);
  if (isNaN(numCards) || numCards <= 0) {
    console.log('Please enter a valid number.');
    readline.close();
    return;
  }

  const cardsObj = {};
  for (let i = 0; i < numCards; i++) {
    const code = `CARD${i+1}`;
    cardsObj[code] = {
      code,
      numbers: generateUKBingoCard()
    };
  }

  // Write to cards.js
  const fileContent = `window.cards = ${JSON.stringify(cardsObj, null, 2)};\n`;
  fs.writeFileSync('cards.js', fileContent, 'utf-8');
  console.log(`Generated ${numCards} cards in cards.js`);
  readline.close();
});

// --- UK Bingo card generator ---
function generateUKBingoCard() {
  const rows = 3;
  const cols = 9;
  const numbersPerRow = 5;
  const card = Array.from({ length: rows }, () => Array(cols).fill(null));

  // Column ranges
  const colRanges = [
    [1, 9], [10, 19], [20, 29], [30, 39],
    [40, 49], [50, 59], [60, 69], [70, 79], [80, 90]
  ];

  // Step 1: Ensure at least 1 number per column
  for (let c = 0; c < cols; c++) {
    const range = colRanges[c];
    const num = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    const row = Math.floor(Math.random() * rows);
    card[row][c] = num;
  }

  // Step 2: Fill rows to have exactly 5 numbers each
  for (let r = 0; r < rows; r++) {
    let currentCount = card[r].filter(n => n !== null).length;
    while (currentCount < numbersPerRow) {
      const emptyCols = card[r].map((v,i) => v===null ? i : -1).filter(i=>i!==-1);
      if (emptyCols.length === 0) break;
      const c = emptyCols[Math.floor(Math.random()*emptyCols.length)];
      const range = colRanges[c];
      let num;
      do {
        num = Math.floor(Math.random()*(range[1]-range[0]+1))+range[0];
      } while (card.some(row=>row[c]===num));
      card[r][c] = num;
      currentCount++;
    }
  }

  // Step 3: Sort numbers in each column top to bottom
  for (let c = 0; c < cols; c++) {
    const nums = [];
    for (let r = 0; r < rows; r++) {
      if (card[r][c] !== null) nums.push(card[r][c]);
    }
    nums.sort((a,b)=>a-b);
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      if (card[r][c] !== null) {
        card[r][c] = nums[idx++];
      }
    }
  }

  return card;
}
