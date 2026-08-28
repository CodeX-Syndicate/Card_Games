const suits = ['C', 'D', 'H', 'S'];
const rankValues = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
};
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const HAND_RANKS = {
    STRAIGHT_FLUSH: 9,
    FOUR_OF_A_KIND: 8,
    FULL_HOUSE: 7,
    FLUSH: 6,
    STRAIGHT: 5,
    THREE_OF_A_KIND: 4,
    TWO_PAIR: 3,
    ONE_PAIR: 2,
    HIGH_CARD: 1
};

// Game State
let bankroll = 1000;
let currentPot = 0;
let playerBet = 0;
let dealerBet = 0;

let deck = [];
let playerCards = [];
let dealerCards = [];
let communityCards = [];
let currentPhase = 'IDLE'; // IDLE, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN

// DOM Elements
const bankrollDisplay = document.getElementById('bankrollDisplay');
const potDisplay = document.getElementById('potDisplay');
const playGameBtn = document.getElementById('playGame');
const dealerSection = document.getElementById('dealerSection');
const playerSection = document.getElementById('playerSection');
const communityArea = document.getElementById('communityArea');
const gamerBoard = document.getElementById('gamerBoard');

const dealerCardsDiv = document.getElementById('dealerCards');
const playerCardsDiv = document.getElementById('playerCards');
const communityCardsDiv = document.getElementById('communityCards');
const handEvalTag = document.getElementById('handEvalTag');
const dealerStatusText = document.getElementById('dealerStatusText');
const playerBetText = document.getElementById('playerBetText');

const checkBtn = document.getElementById('checkBtn');
const callBtn = document.getElementById('callBtn');
const bet25Btn = document.getElementById('bet25Btn');
const bet50Btn = document.getElementById('bet50Btn');
const bet100Btn = document.getElementById('bet100Btn');
const foldBtn = document.getElementById('foldBtn');

const popUp = document.getElementById('popUp');
const resultTitle = document.getElementById('resultTitle');
const resultSub = document.getElementById('resultSub');

function createDeck() {
    const newDeck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            newDeck.push({ rank, suit, value: rankValues[rank] });
        }
    }
    return newDeck;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function updateBankrollDisplay() {
    bankrollDisplay.textContent = `$${bankroll}`;
    potDisplay.textContent = `$${currentPot}`;
    dealerStatusText.textContent = `(Mise : $${dealerBet})`;
    playerBetText.textContent = `(Mise : $${playerBet})`;
}

function startNewHand() {
    if (bankroll < 25) {
        bankroll = 1000; // Refill bankroll if broke
    }

    popUp.style.display = 'none';
    playGameBtn.style.display = 'none';

    dealerSection.style.display = 'flex';
    playerSection.style.display = 'flex';
    communityArea.style.display = 'flex';
    gamerBoard.style.display = 'flex';

    deck = shuffle(createDeck());
    playerCards = [deck.pop(), deck.pop()];
    dealerCards = [deck.pop(), deck.pop()];
    communityCards = [];

    currentPot = 0;
    playerBet = 0;
    dealerBet = 0;

    // Small blind & Big blind
    deductMoney(25);
    playerBet = 25;
    dealerBet = 25;
    currentPot = 50;

    currentPhase = 'PREFLOP';
    renderBoard();
    updateActionButtons();
    updateBankrollDisplay();
}

function deductMoney(amount) {
    bankroll = Math.max(0, bankroll - amount);
}

function renderBoard() {
    // Render Player Cards
    playerCardsDiv.innerHTML = '';
    playerCards.forEach(card => playerCardsDiv.appendChild(createCardImg(card)));

    // Render Dealer Cards
    dealerCardsDiv.innerHTML = '';
    if (currentPhase === 'SHOWDOWN') {
        dealerCards.forEach(card => dealerCardsDiv.appendChild(createCardImg(card)));
    } else {
        dealerCardsDiv.appendChild(createCardBack());
        dealerCardsDiv.appendChild(createCardBack());
    }

    // Render Community Cards
    communityCardsDiv.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        if (i < communityCards.length) {
            communityCardsDiv.appendChild(createCardImg(communityCards[i]));
        } else {
            const emptySlot = document.createElement('div');
            emptySlot.style.width = '80px';
            emptySlot.style.height = '115px';
            emptySlot.style.border = '1px dashed rgba(255, 255, 255, 0.15)';
            emptySlot.style.borderRadius = '8px';
            communityCardsDiv.appendChild(emptySlot);
        }
    }

    // Hand evaluation text for player
    if (playerCards.length > 0) {
        const allAvailable = [...playerCards, ...communityCards];
        const bestHand = evaluateBestHand(allAvailable);
        handEvalTag.textContent = `Votre main : ${bestHand.name}`;
    }
}

function createCardImg(card) {
    const img = document.createElement('img');
    img.src = `/images/cards/${card.suit}/${card.rank}${card.suit}.png`;
    img.className = 'card';
    img.alt = `${card.rank} ${card.suit}`;
    return img;
}

function createCardBack() {
    const img = document.createElement('img');
    img.src = '/images/cards/cardBack.png';
    img.className = 'card-back';
    img.alt = 'Dos de carte';
    return img;
}

function updateActionButtons() {
    const diff = dealerBet - playerBet;

    if (diff === 0) {
        checkBtn.style.display = 'inline-block';
        callBtn.style.display = 'none';
    } else {
        checkBtn.style.display = 'none';
        callBtn.style.display = 'inline-block';
        callBtn.textContent = `Suivre ($${diff})`;
    }

    bet25Btn.disabled = bankroll < 25;
    bet50Btn.disabled = bankroll < 50;
    bet100Btn.disabled = bankroll < 100;
}

function userCheck() {
    advancePhase();
}

function userCall() {
    const diff = dealerBet - playerBet;
    if (bankroll >= diff) {
        deductMoney(diff);
        playerBet += diff;
        currentPot += diff;
        updateBankrollDisplay();
        advancePhase();
    }
}

function userBet(amount) {
    if (bankroll >= amount) {
        deductMoney(amount);
        playerBet += amount;
        currentPot += amount;

        // Dealer calls the bet
        dealerBet += amount;
        currentPot += amount;

        updateBankrollDisplay();
        advancePhase();
    }
}

function userFold() {
    stopHand('FOLD');
}

function advancePhase() {
    if (currentPhase === 'PREFLOP') {
        currentPhase = 'FLOP';
        communityCards = [deck.pop(), deck.pop(), deck.pop()];
    } else if (currentPhase === 'FLOP') {
        currentPhase = 'TURN';
        communityCards.push(deck.pop());
    } else if (currentPhase === 'TURN') {
        currentPhase = 'RIVER';
        communityCards.push(deck.pop());
    } else if (currentPhase === 'RIVER') {
        currentPhase = 'SHOWDOWN';
        renderBoard();
        evaluateShowdown();
        return;
    }

    renderBoard();
    updateActionButtons();
}

function evaluateShowdown() {
    const playerBest = evaluateBestHand([...playerCards, ...communityCards]);
    const dealerBest = evaluateBestHand([...dealerCards, ...communityCards]);

    if (playerBest.rankScore > dealerBest.rankScore) {
        winPot(`Victoire ! 🎉`, `Votre ${playerBest.name} bat le ${dealerBest.name} du croupier !`);
    } else if (dealerBest.rankScore > playerBest.rankScore) {
        loseHand(`Défaite... 😞`, `Le croupier l'emporte avec un ${dealerBest.name} contre votre ${playerBest.name}.`);
    } else {
        // Tie break kickers
        if (playerBest.kickerSum > dealerBest.kickerSum) {
            winPot(`Victoire Kicker ! 🎉`, `Égalité sur ${playerBest.name}, mais votre Kicker gagne !`);
        } else if (dealerBest.kickerSum > playerBest.kickerSum) {
            loseHand(`Défaite Kicker... 😞`, `Égalité sur le ${dealerBest.name}, mais le Kicker du croupier l'emporte.`);
        } else {
            splitPot();
        }
    }
}

function winPot(title, message) {
    bankroll += currentPot;
    updateBankrollDisplay();
    resultTitle.textContent = title;
    resultSub.textContent = `${message} Vous gagnez $${currentPot} !`;
    popUp.style.display = 'block';
    gamerBoard.style.display = 'none';
}

function loseHand(title, message) {
    updateBankrollDisplay();
    resultTitle.textContent = title;
    resultSub.textContent = message;
    popUp.style.display = 'block';
    gamerBoard.style.display = 'none';
}

function splitPot() {
    const share = Math.floor(currentPot / 2);
    bankroll += share;
    updateBankrollDisplay();
    resultTitle.textContent = `Partage du Pot (Split) 🤝`;
    resultSub.textContent = `Égalité parfaite ! Le pot de $${currentPot} est divisé ($${share} chacun).`;
    popUp.style.display = 'block';
    gamerBoard.style.display = 'none';
}

function stopHand(reason) {
    if (reason === 'FOLD') {
        loseHand(`Couché 🏳️`, `Vous vous êtes couché. Le croupier remporte le pot de $${currentPot}.`);
    }
}

// 7-CARD POKER HAND EVALUATOR
function evaluateBestHand(cards) {
    if (cards.length < 5) {
        return { name: 'Pré-flop', rankScore: 0, kickerSum: 0 };
    }

    // Get all 5-card combinations out of N cards
    const combos = getCombinations(cards, 5);
    let best = { rankScore: 0, kickerSum: 0, name: 'Carte Haute' };

    for (const combo of combos) {
        const evalRes = score5CardHand(combo);
        if (evalRes.rankScore > best.rankScore || 
           (evalRes.rankScore === best.rankScore && evalRes.kickerSum > best.kickerSum)) {
            best = evalRes;
        }
    }

    return best;
}

function getCombinations(array, size) {
    const results = [];

    function helper(start, combo) {
        if (combo.length === size) {
            results.push([...combo]);
            return;
        }
        for (let i = start; i < array.length; i++) {
            combo.push(array[i]);
            helper(i + 1, combo);
            combo.pop();
        }
    }

    helper(0, []);
    return results;
}

function score5CardHand(hand) {
    // Sort descending by rank value
    const sorted = [...hand].sort((a, b) => b.value - a.value);
    const values = sorted.map(c => c.value);
    const suitsArr = sorted.map(c => c.suit);

    const isFlush = suitsArr.every(s => s === suitsArr[0]);
    
    // Check straight
    let isStraight = false;
    let straightHigh = 0;

    if (values[0] - values[4] === 4 && new Set(values).size === 5) {
        isStraight = true;
        straightHigh = values[0];
    } else if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
        // Ace-low straight A-2-3-4-5
        isStraight = true;
        straightHigh = 5;
    }

    // Rank frequencies
    const counts = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const freqPairs = Object.entries(counts).map(([v, count]) => ({ val: Number(v), count }));
    freqPairs.sort((a, b) => b.count - a.count || b.val - a.val);

    const kickerSum = values.reduce((acc, v, idx) => acc + v * Math.pow(15, 4 - idx), 0);

    if (isFlush && isStraight) {
        return {
            name: straightHigh === 14 ? 'Quinte Flush Royale 👑' : 'Quinte Flush',
            rankScore: HAND_RANKS.STRAIGHT_FLUSH,
            kickerSum: straightHigh
        };
    }

    if (freqPairs[0].count === 4) {
        return {
            name: `Carré de ${getRankName(freqPairs[0].val)}`,
            rankScore: HAND_RANKS.FOUR_OF_A_KIND,
            kickerSum: freqPairs[0].val * 100 + freqPairs[1].val
        };
    }

    if (freqPairs[0].count === 3 && freqPairs[1].count === 2) {
        return {
            name: `Full aux ${getRankName(freqPairs[0].val)} par les ${getRankName(freqPairs[1].val)}`,
            rankScore: HAND_RANKS.FULL_HOUSE,
            kickerSum: freqPairs[0].val * 100 + freqPairs[1].val
        };
    }

    if (isFlush) {
        return {
            name: `Couleur au ${getRankName(values[0])}`,
            rankScore: HAND_RANKS.FLUSH,
            kickerSum
        };
    }

    if (isStraight) {
        return {
            name: `Quinte au ${getRankName(straightHigh)}`,
            rankScore: HAND_RANKS.STRAIGHT,
            kickerSum: straightHigh
        };
    }

    if (freqPairs[0].count === 3) {
        return {
            name: `Brelan de ${getRankName(freqPairs[0].val)}`,
            rankScore: HAND_RANKS.THREE_OF_A_KIND,
            kickerSum: freqPairs[0].val * 1000 + kickerSum
        };
    }

    if (freqPairs[0].count === 2 && freqPairs[1].count === 2) {
        return {
            name: `Double Paire (${getRankName(freqPairs[0].val)} et ${getRankName(freqPairs[1].val)})`,
            rankScore: HAND_RANKS.TWO_PAIR,
            kickerSum: freqPairs[0].val * 1000 + freqPairs[1].val * 100 + freqPairs[2].val
        };
    }

    if (freqPairs[0].count === 2) {
        return {
            name: `Paire de ${getRankName(freqPairs[0].val)}`,
            rankScore: HAND_RANKS.ONE_PAIR,
            kickerSum: freqPairs[0].val * 10000 + kickerSum
        };
    }

    return {
        name: `Hauteur ${getRankName(values[0])}`,
        rankScore: HAND_RANKS.HIGH_CARD,
        kickerSum
    };
}

function getRankName(val) {
    const map = { 14: 'As', 13: 'Roi', 12: 'Dame', 11: 'Valet' };
    return map[val] || `${val}`;
}
