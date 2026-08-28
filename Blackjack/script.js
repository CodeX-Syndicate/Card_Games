const valueOfCard = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const typeOfCard = ['C', 'D', 'H', 'S'];

let player = [],
    dealer = [],
    deck = [];

let nbOfDeck = 4;
let isPlayerOver = false;

let gamerBoard = document.getElementById('gamerBoard'),
    dealerBoard = document.getElementById('dealerBoard'),
    hitBtn = document.getElementById('hitBtn'),
    doubleBtn = document.getElementById('doubleBtn'),
    standBtn = document.getElementById('standBtn'),
    splitBtn = document.getElementById('splitBtn'),
    popUp = document.getElementById('popUp'),
    playGame = document.getElementById('playGame'),
    resetGame = document.getElementById('resetGame');

let playerScoreHTML = document.getElementById('playerScore'),
    dealerScoreHTML = document.getElementById('dealerScore');

let gamerCards = document.getElementById('gamerCards'),
    dealerCards = document.getElementById('dealerCards');

function initializeDeck() {
    deck = [];
    for (let deckCount = 0; deckCount < nbOfDeck; deckCount++) {    
        for (const value of valueOfCard) {
            for (const type of typeOfCard) {
                deck.push([value, type]);
            }
        }
    }
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function getCard() {
    if (deck.length === 0) {
        console.log('Le deck est vide. Réinitialisation du jeu.');
        initializeDeck();
        shuffleDeck();
    }
    return deck.pop();
}

function checkScore(cards) {
    let score = 0;
    let aces = 0;

    for (let i = 0; i < cards.length; i++) {
        const val = cards[i][0];
        if (val === 'A') {
            aces++;
            score += 11;
        } else if (val === 'J' || val === 'Q' || val === 'K') {
            score += 10;
        } else {
            score += parseInt(val, 10);
        }
    }

    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }

    return score;
}

function launchGame() {
    popUp.style.display = 'none';
    playGame.style.display = 'none';
    
    gamerBoard.style.visibility = 'visible';
    gamerBoard.style.opacity = '1';
    gamerBoard.style.display = 'flex';
    dealerBoard.style.display = 'flex';
    
    player = [];
    dealer = [];
    gamerCards.innerHTML = '';
    dealerCards.innerHTML = '';

    enableButton(hitBtn);
    enableButton(doubleBtn);
    enableButton(standBtn);
    enableButton(splitBtn);

    if (deck.length < 10) {
        initializeDeck();
        shuffleDeck();
    }

    // Initialisation des cartes
    let playerCard1 = getCard();
    let playerCard2 = getCard();
    let dealerCard = getCard();

    if (playerCard1[0] !== playerCard2[0]) {
        disableButton(splitBtn);
    }

    player.push(playerCard1, playerCard2);
    let playerScore = checkScore(player);

    playerScoreHTML.textContent = `Votre Score : ${playerScore}`;

    // Initialisation du dealer
    dealer.push(dealerCard);
    let dealerScore = checkScore(dealer);
    dealerScoreHTML.textContent = `Score du dealer : ${dealerScore}`;

    // Affichage des cartes du joueur
    let playerCard1HTML = document.createElement('img');
    printTheCard(playerCard1, playerCard1HTML, gamerCards);

    let playerCard2HTML = document.createElement('img');
    printTheCard(playerCard2, playerCard2HTML, gamerCards);

    // Affichage des cartes du dealer
    let dealerCardHTML = document.createElement('img');
    printTheCard(dealerCard, dealerCardHTML, dealerCards);

    let dealerCardBackHTML = document.createElement('img');
    dealerCardBackHTML.src = `/images/cards/cardBack.png`;
    dealerCardBackHTML.classList.add('reverseCard');
    dealerCards.appendChild(dealerCardBackHTML);

    if (playerScore === 21) {
        setTimeout(() => {
            isPlayerOver = false;
            dealerTurn();
        }, 1000);
    }
}

function printTheCard(variableName, variableNameHTML, playerDeck) {
    variableNameHTML.src = `/images/cards/${variableName[1]}/${variableName[0]}${variableName[1]}.png`;
    variableNameHTML.classList.add('card');
    playerDeck.appendChild(variableNameHTML);
}

function hit() {
    let playerCard = getCard();
    player.push(playerCard);
    let playerScore = checkScore(player);
    
    playerScoreHTML.textContent = `Votre Score : ${playerScore}`;

    let playerCardHTML = document.createElement('img');
    printTheCard(playerCard, playerCardHTML, gamerCards);

    if (playerScore > 21) {
        isPlayerOver = true;
        dealerTurn();
    }
}

function double() {
    // Logique pour doubler si nécessaire
}

function stand() {
    isPlayerOver = false;
    dealerTurn();
}

function dealerTurn() {
    disableButton(hitBtn);
    disableButton(doubleBtn);
    disableButton(standBtn);
    disableButton(splitBtn);

    // Remplacer la carte cachée du dealer
    if (dealerCards.lastElementChild) {
        dealerCards.lastElementChild.remove();
    }

    let dealerCard2 = getCard();
    dealer.push(dealerCard2);

    let dealerCardHTML = document.createElement('img');
    printTheCard(dealerCard2, dealerCardHTML, dealerCards);

    let dealerScore = checkScore(dealer);
    dealerScoreHTML.textContent = `Score du dealer : ${dealerScore}`;
    
    if (isPlayerOver) {
        printResults('Vous avez perdu... 😞');
    } else if (dealerScore >= 17) {
        checkResults();
    } else {
        const dealerInterval = setInterval(() => {
            whileDealerCards();
            if (checkScore(dealer) >= 17) {
                clearInterval(dealerInterval);
                checkResults();
            }
        }, 1200);
    }
}

function checkResults() {
    const dScore = checkScore(dealer);
    const pScore = checkScore(player);

    if (dScore > 21 || dScore < pScore) {
        printResults('Vous avez gagné ! 🎉');
    } else if (dScore > pScore) {
        printResults('Vous avez perdu... 😞');
    } else {
        printResults('Égalité ! 🤝');
    }
}

function printResults(txtContent) {
    popUp.style.display = 'block';
    resetGame.style.display = 'inline-block';
    const h2Element = popUp.querySelector("h2");
    if (h2Element) {
        h2Element.textContent = txtContent;
    }
}

function whileDealerCards() {
    let dealerCard = getCard();
    dealer.push(dealerCard);
    let dealerScore = checkScore(dealer);
    
    let dealerCardHTML = document.createElement('img');
    printTheCard(dealerCard, dealerCardHTML, dealerCards);

    dealerScoreHTML.textContent = `Score du dealer : ${dealerScore}`;
}

function split() {
    // Logique de séparation
}

const disableButton = (button) => {
    if (!button) return;
    button.disabled = true;
    button.style.opacity = '0.4';
}

const enableButton = (button) => {
    if (!button) return;
    button.disabled = false;
    button.style.opacity = '1';
}

function eraseGame() {
    launchGame();
}