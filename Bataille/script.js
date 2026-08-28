const suitTypes = ['C', 'D', 'H', 'S'];
const rankValues = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
};
const rankKeys = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let playerDeck = [];
let cpuDeck = [];
let pot = [];
let isTurnInProgress = false;
let autoPlayInterval = null;

// DOM Elements
const playGameBtn = document.getElementById('playGame');
const arenaZone = document.getElementById('arenaZone');
const cpuSection = document.getElementById('cpuSection');
const humanSection = document.getElementById('humanSection');
const gamerBoard = document.getElementById('gamerBoard');
const drawBtn = document.getElementById('drawBtn');
const autoBtn = document.getElementById('autoBtn');
const popUp = document.getElementById('popUp');

const cpuScoreText = document.getElementById('cpuScoreText');
const playerScoreText = document.getElementById('playerScoreText');
const cpuBar = document.getElementById('cpuBar');
const playerBar = document.getElementById('playerBar');

const cpuCardContainer = document.getElementById('cpuCardContainer');
const playerCardContainer = document.getElementById('playerCardContainer');
const statusBanner = document.getElementById('statusBanner');
const resultTitle = document.getElementById('resultTitle');
const resultSub = document.getElementById('resultSub');

function createFullDeck() {
    const deck = [];
    for (const suit of suitTypes) {
        for (const rank of rankKeys) {
            deck.push({ rank, suit, value: rankValues[rank] });
        }
    }
    return deck;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function launchGame() {
    stopAutoPlay();
    popUp.style.display = 'none';
    playGameBtn.style.display = 'none';

    arenaZone.style.display = 'flex';
    cpuSection.style.display = 'flex';
    humanSection.style.display = 'flex';
    gamerBoard.style.display = 'flex';

    const fullDeck = shuffle(createFullDeck());
    playerDeck = fullDeck.slice(0, 26);
    cpuDeck = fullDeck.slice(26, 52);
    pot = [];
    isTurnInProgress = false;

    resetContainers();
    updateScores();
    hideStatusBanner();
}

function resetContainers() {
    cpuCardContainer.innerHTML = '<img src="/images/cards/cardBack.png" class="card-back" alt="Dos de carte">';
    playerCardContainer.innerHTML = '<img src="/images/cards/cardBack.png" class="card-back" alt="Dos de carte">';
}

function updateScores() {
    const pCount = playerDeck.length;
    const cCount = cpuDeck.length;

    playerScoreText.textContent = `Vous : ${pCount} carte${pCount > 1 ? 's' : ''}`;
    cpuScoreText.textContent = `Ordinateur : ${cCount} carte${cCount > 1 ? 's' : ''}`;

    const pPercent = Math.min(100, Math.max(0, (pCount / 52) * 100));
    const cPercent = Math.min(100, Math.max(0, (cCount / 52) * 100));

    playerBar.style.width = `${pPercent}%`;
    cpuBar.style.width = `${cPercent}%`;

    checkGameOver();
}

function showStatusBanner(text, isWar = false) {
    statusBanner.textContent = text;
    statusBanner.className = `status-banner show ${isWar ? 'war' : ''}`;
}

function hideStatusBanner() {
    statusBanner.className = 'status-banner';
}

function getCardImagePath(card) {
    return `/images/cards/${card.suit}/${card.rank}${card.suit}.png`;
}

function playTurn() {
    if (isTurnInProgress) return;
    if (playerDeck.length === 0 || cpuDeck.length === 0) {
        checkGameOver();
        return;
    }

    isTurnInProgress = true;
    hideStatusBanner();

    pot = [];
    
    // Draw 1 card each
    const pCard = playerDeck.pop();
    const cCard = cpuDeck.pop();
    pot.push(pCard, cCard);

    renderCard(playerCardContainer, pCard);
    renderCard(cpuCardContainer, cCard);

    evaluateRound(pCard, cCard);
}

function renderCard(container, card) {
    container.innerHTML = '';
    const img = document.createElement('img');
    img.src = getCardImagePath(card);
    img.className = 'card';
    img.alt = `${card.rank} ${card.suit}`;
    container.appendChild(img);
}

function renderWarStack(container, faceUpCard) {
    container.innerHTML = '';
    const stackDiv = document.createElement('div');
    stackDiv.className = 'card-war-stack';

    // Face down card
    const backImg = document.createElement('img');
    backImg.src = '/images/cards/cardBack.png';
    backImg.className = 'card-back';
    stackDiv.appendChild(backImg);

    // Face up card
    const frontImg = document.createElement('img');
    frontImg.src = getCardImagePath(faceUpCard);
    frontImg.className = 'card';
    stackDiv.appendChild(frontImg);

    container.appendChild(stackDiv);
}

function evaluateRound(pCard, cCard) {
    if (pCard.value > cCard.value) {
        // Player wins round
        showStatusBanner('Vous gagnez le pli !');
        setTimeout(() => {
            playerDeck.unshift(...shuffle(pot));
            pot = [];
            updateScores();
            isTurnInProgress = false;
        }, 500);
    } else if (cCard.value > pCard.value) {
        // CPU wins round
        showStatusBanner("L'ordinateur gagne le pli !");
        setTimeout(() => {
            cpuDeck.unshift(...shuffle(pot));
            pot = [];
            updateScores();
            isTurnInProgress = false;
        }, 500);
    } else {
        // TIE -> BATAILLE !
        showStatusBanner('BATAILLE !', true);
        setTimeout(() => {
            handleWar();
        }, 800);
    }
}

function handleWar() {
    if (playerDeck.length === 0 || cpuDeck.length === 0) {
        // If someone runs out during war, the remaining player wins the pot
        if (playerDeck.length === 0) {
            cpuDeck.unshift(...pot);
        } else {
            playerDeck.unshift(...pot);
        }
        pot = [];
        updateScores();
        isTurnInProgress = false;
        return;
    }

    // Draw 1 card face down (if available)
    if (playerDeck.length > 1) {
        pot.push(playerDeck.pop());
    }
    if (cpuDeck.length > 1) {
        pot.push(cpuDeck.pop());
    }

    // Draw 1 card face up for comparison
    const pWarCard = playerDeck.pop();
    const cWarCard = cpuDeck.pop();
    pot.push(pWarCard, cWarCard);

    renderWarStack(playerCardContainer, pWarCard);
    renderWarStack(cpuCardContainer, cWarCard);

    evaluateRound(pWarCard, cWarCard);
}

function checkGameOver() {
    if (playerDeck.length === 0 && cpuDeck.length === 0) return;

    if (playerDeck.length === 0) {
        stopAutoPlay();
        resultTitle.textContent = 'Dommage... 😞';
        resultSub.textContent = "L'ordinateur a remporté toutes les cartes de la partie.";
        popUp.style.display = 'block';
    } else if (cpuDeck.length === 0) {
        stopAutoPlay();
        resultTitle.textContent = 'Victoire ! 🎉';
        resultSub.textContent = 'Félicitations ! Vous avez capturé la totalité du paquet de cartes !';
        popUp.style.display = 'block';
    }
}

function toggleAutoPlay() {
    if (autoPlayInterval) {
        stopAutoPlay();
    } else {
        startAutoPlay();
    }
}

function startAutoPlay() {
    if (playerDeck.length === 0 || cpuDeck.length === 0) return;
    autoBtn.classList.add('active');
    autoBtn.textContent = '⏸️ Arrêter le mode Auto';
    drawBtn.disabled = true;

    autoPlayInterval = setInterval(() => {
        if (!isTurnInProgress) {
            playTurn();
        }
    }, 450);
}

function stopAutoPlay() {
    if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }
    autoBtn.classList.remove('active');
    autoBtn.textContent = '▶️ Mode Automatique';
    drawBtn.disabled = false;
}
