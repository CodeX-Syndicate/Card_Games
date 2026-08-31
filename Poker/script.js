// POKER TEXAS HOLD'EM - PEERJS WEBRTC MULTIPLAYER & SOLO ENGINE

const suits = ['C', 'D', 'H', 'S'];
const rankValues = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
};
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const HAND_RANKS = {
    STRAIGHT_FLUSH: 9, FOUR_OF_A_KIND: 8, FULL_HOUSE: 7,
    FLUSH: 6, STRAIGHT: 5, THREE_OF_A_KIND: 4, TWO_PAIR: 3, ONE_PAIR: 2, HIGH_CARD: 1
};

// MULTIPLAYER & P2P NETWORKING STATE
let isMultiplayer = false;
let isHost = false;
let peer = null;
let hostConn = null;
let connections = {}; // For host: peerId -> conn
let roomCode = '';
let myPeerId = '';
let myPlayerName = 'Joueur';
let myHoleCards = [];
let myBankroll = 1000;

// GAME ENGINE STATE (Used by Host & Solo)
let players = []; // [{ peerId, name, bankroll, cards, currentBet, isFolded, isAllIn, seatIndex, conn }]
let communityCards = [];
let deck = [];
let currentPot = 0;
let currentHighestBet = 0;
let activePlayerIndex = 0;
let dealerIndex = 0;
let currentPhase = 'IDLE'; // IDLE, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN

// DOM ELEMENTS
const lobbyOverlay = document.getElementById('lobbyOverlay');
const lobbyStepMode = document.getElementById('lobbyStepMode');
const lobbyStepMulti = document.getElementById('lobbyStepMulti');
const lobbyStepHost = document.getElementById('lobbyStepHost');
const lobbyStepJoin = document.getElementById('lobbyStepJoin');

const playerNameInput = document.getElementById('playerNameInput');
const hostRoomCodeDisplay = document.getElementById('hostRoomCodeDisplay');
const joinCodeInput = document.getElementById('joinCodeInput');
const hostPlayerList = document.getElementById('hostPlayerList');
const modeBadge = document.getElementById('modeBadge');

const seatsContainer = document.getElementById('seatsContainer');
const communityCardsDiv = document.getElementById('communityCards');
const potDisplay = document.getElementById('potDisplay');
const handEvalTag = document.getElementById('handEvalTag');
const gamerBoard = document.getElementById('gamerBoard');

const checkBtn = document.getElementById('checkBtn');
const callBtn = document.getElementById('callBtn');
const bet25Btn = document.getElementById('bet25Btn');
const bet50Btn = document.getElementById('bet50Btn');
const bet100Btn = document.getElementById('bet100Btn');
const foldBtn = document.getElementById('foldBtn');

const popUp = document.getElementById('popUp');
const resultTitle = document.getElementById('resultTitle');
const resultSub = document.getElementById('resultSub');
const resetBtn = document.getElementById('resetBtn');

// ==========================================
// 1. LOBBY & NAVIGATION SYSTEM
// ==========================================

function setupSoloMode() {
    isMultiplayer = false;
    isHost = true;
    myPlayerName = playerNameInput.value || 'Joueur';
    modeBadge.textContent = '👤 Solo vs IA';
    lobbyOverlay.style.display = 'none';

    players = [
        { peerId: 'local_player', name: myPlayerName, bankroll: 1000, cards: [], currentBet: 0, isFolded: false, isAllIn: false, seatIndex: 0 },
        { peerId: 'cpu_dealer', name: 'Croupier IA', bankroll: 1000, cards: [], currentBet: 0, isFolded: false, isAllIn: false, seatIndex: 1 }
    ];

    dealerIndex = 1;
    startSoloHand();
}

function showMultiplayerStep() {
    lobbyStepMode.style.display = 'none';
    lobbyStepMulti.style.display = 'flex';
}

function showJoinRoomForm() {
    lobbyStepMulti.style.display = 'none';
    lobbyStepJoin.style.display = 'flex';
}

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'POKER-';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function copyRoomCode() {
    navigator.clipboard.writeText(roomCode);
    alert(`Code de salon copié : ${roomCode}`);
}

// ==========================================
// 2. PEERJS WEBRTC P2P NETWORKING
// ==========================================

function createRoom() {
    isMultiplayer = true;
    isHost = true;
    myPlayerName = playerNameInput.value.trim() || 'Hôte';
    roomCode = generateRoomCode();

    hostRoomCodeDisplay.textContent = roomCode;
    lobbyStepMulti.style.display = 'none';
    lobbyStepHost.style.display = 'flex';
    modeBadge.textContent = `🌐 Hôte : ${roomCode}`;

    // Initialize Host Peer
    peer = new Peer(roomCode);

    peer.on('open', (id) => {
        myPeerId = id;
        players = [{
            peerId: myPeerId,
            name: myPlayerName,
            bankroll: 1000,
            cards: [],
            currentBet: 0,
            isFolded: false,
            seatIndex: 0
        }];
        updateHostLobbyUI();
    });

    peer.on('connection', (conn) => {
        conn.on('data', (data) => handleHostIncomingData(conn, data));
        conn.on('close', () => removePlayerByPeerId(conn.peer));
    });

    peer.on('error', (err) => {
        alert(`Erreur PeerJS : ${err.type}`);
    });
}

function updateHostLobbyUI() {
    hostPlayerList.innerHTML = '';
    players.forEach(p => {
        const item = document.createElement('div');
        item.className = 'player-item';
        item.innerHTML = `<span>👤 ${p.name}</span> ${p.peerId === myPeerId ? '<span class="host-tag">Hôte</span>' : ''}`;
        hostPlayerList.appendChild(item);
    });
}

function joinRoom() {
    const code = joinCodeInput.value.trim().toUpperCase();
    if (!code) {
        alert('Veuillez entrer un code de salon valide.');
        return;
    }

    isMultiplayer = true;
    isHost = false;
    myPlayerName = playerNameInput.value.trim() || 'Joueur';
    roomCode = code;
    modeBadge.textContent = `🌐 Connecté : ${roomCode}`;

    peer = new Peer();

    peer.on('open', (id) => {
        myPeerId = id;
        hostConn = peer.connect(roomCode);

        hostConn.on('open', () => {
            hostConn.send({ type: 'JOIN_ROOM', name: myPlayerName });
            lobbyOverlay.style.display = 'none';
        });

        hostConn.on('data', (data) => handleClientIncomingData(data));
        hostConn.on('close', () => alert('Déconnecté du salon par l\'hôte.'));
    });

    peer.on('error', () => {
        alert('Impossible de trouver un salon avec ce code.');
    });
}

function handleHostIncomingData(conn, data) {
    if (data.type === 'JOIN_ROOM') {
        if (players.length >= 6) {
            conn.send({ type: 'ERROR', message: 'Le salon est complet (6 joueurs max).' });
            return;
        }

        const newPlayer = {
            peerId: conn.peer,
            name: data.name || `Joueur ${players.length + 1}`,
            bankroll: 1000,
            cards: [],
            currentBet: 0,
            isFolded: false,
            seatIndex: players.length,
            conn: conn
        };

        players.push(newPlayer);
        connections[conn.peer] = conn;
        updateHostLobbyUI();

        broadcastLobbyState();
    } else if (data.type === 'PLAYER_ACTION') {
        processPlayerAction(conn.peer, data.action, data.amount);
    }
}

function handleClientIncomingData(data) {
    if (data.type === 'PRIVATE_CARDS') {
        myHoleCards = data.cards;
        renderBoard(data.state);
    } else if (data.type === 'GAME_STATE') {
        renderBoard(data);
    }
}

function broadcastLobbyState() {
    const playerNames = players.map(p => p.name);
    players.forEach(p => {
        if (p.conn) {
            p.conn.send({ type: 'LOBBY_UPDATE', players: playerNames });
        }
    });
}

function broadcastGameState() {
    players.forEach(p => {
        const publicState = getPublicStateForPlayer(p.peerId);
        if (p.peerId === myPeerId) {
            renderBoard(publicState);
        } else if (p.conn) {
            p.conn.send({ type: 'GAME_STATE', ...publicState });
            p.conn.send({ type: 'PRIVATE_CARDS', cards: p.cards, state: publicState });
        }
    });
}

function getPublicStateForPlayer(recipientId) {
    return {
        phase: currentPhase,
        pot: currentPot,
        communityCards: communityCards,
        currentHighestBet: currentHighestBet,
        activePlayerIndex: activePlayerIndex,
        dealerIndex: dealerIndex,
        players: players.map(p => ({
            peerId: p.peerId,
            name: p.name,
            bankroll: p.bankroll,
            currentBet: p.currentBet,
            isFolded: p.isFolded,
            cards: (currentPhase === 'SHOWDOWN' || p.peerId === recipientId) ? p.cards : null,
            cardCount: p.cards.length
        }))
    };
}

function removePlayerByPeerId(peerId) {
    players = players.filter(p => p.peerId !== peerId);
    delete connections[peerId];
    if (isHost) updateHostLobbyUI();
}

// ==========================================
// 3. POKER GAME ENGINE (HOST & SOLO)
// ==========================================

function hostStartGame() {
    if (players.length < 2) {
        alert('Il faut au moins 2 joueurs pour démarrer une partie.');
        return;
    }
    lobbyOverlay.style.display = 'none';
    startMultiplayerHand();
}

function startMultiplayerHand() {
    currentPhase = 'PREFLOP';
    deck = shuffle(createDeck());
    communityCards = [];
    currentPot = 0;
    currentHighestBet = 20;

    // Reset players
    players.forEach(p => {
        p.cards = [deck.pop(), deck.pop()];
        p.currentBet = 0;
        p.isFolded = false;
        if (p.bankroll < 20) p.bankroll = 1000;
    });

    dealerIndex = (dealerIndex + 1) % players.length;
    const sbIndex = (dealerIndex + 1) % players.length;
    const bbIndex = (dealerIndex + 2) % players.length;

    // Small blind ($10) and Big blind ($20)
    players[sbIndex].bankroll -= 10;
    players[sbIndex].currentBet = 10;
    players[bbIndex].bankroll -= 20;
    players[bbIndex].currentBet = 20;

    currentPot = 30;
    activePlayerIndex = (bbIndex + 1) % players.length;

    broadcastGameState();
}

function startSoloHand() {
    startMultiplayerHand();
}

function processPlayerAction(peerId, action, amount = 0) {
    const player = players[activePlayerIndex];
    if (!player || player.peerId !== peerId) return;

    if (action === 'FOLD') {
        player.isFolded = true;
    } else if (action === 'CHECK') {
        // Valid if currentBet matches highest bet
    } else if (action === 'CALL') {
        const diff = currentHighestBet - player.currentBet;
        const actual = Math.min(player.bankroll, diff);
        player.bankroll -= actual;
        player.currentBet += actual;
        currentPot += actual;
    } else if (action === 'BET') {
        const totalBet = currentHighestBet + amount;
        const diff = totalBet - player.currentBet;
        const actual = Math.min(player.bankroll, diff);
        player.bankroll -= actual;
        player.currentBet += actual;
        currentPot += actual;
        currentHighestBet = player.currentBet;
    }

    advanceBettingRound();
}

function advanceBettingRound() {
    const activePlayers = players.filter(p => !p.isFolded);

    // If only 1 player remains non-folded -> instant win
    if (activePlayers.length === 1) {
        activePlayers[0].bankroll += currentPot;
        currentPhase = 'SHOWDOWN';
        broadcastGameState();
        return;
    }

    // Advance to next active player
    do {
        activePlayerIndex = (activePlayerIndex + 1) % players.length;
    } while (players[activePlayerIndex].isFolded);

    // Check if betting round is complete (everyone matches highest bet)
    const isRoundComplete = activePlayers.every(p => p.currentBet === currentHighestBet);

    if (isRoundComplete && activePlayerIndex === (dealerIndex + 1) % players.length) {
        advanceGamePhase();
    } else {
        // If Solo Mode and current active player is CPU -> Trigger AI turn
        if (!isMultiplayer && players[activePlayerIndex].peerId === 'cpu_dealer') {
            setTimeout(() => triggerCpuTurn(), 800);
        } else {
            broadcastGameState();
        }
    }
}

function triggerCpuTurn() {
    const cpu = players[activePlayerIndex];
    const diff = currentHighestBet - cpu.currentBet;

    if (diff === 0) {
        processPlayerAction('cpu_dealer', 'CHECK');
    } else if (diff <= 50) {
        processPlayerAction('cpu_dealer', 'CALL');
    } else {
        processPlayerAction('cpu_dealer', 'FOLD');
    }
}

function advanceGamePhase() {
    // Reset round bets
    players.forEach(p => p.currentBet = 0);
    currentHighestBet = 0;

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
        evaluateShowdownWinners();
        broadcastGameState();
        return;
    }

    activePlayerIndex = (dealerIndex + 1) % players.length;
    while (players[activePlayerIndex].isFolded) {
        activePlayerIndex = (activePlayerIndex + 1) % players.length;
    }

    broadcastGameState();
}

function evaluateShowdownWinners() {
    const activePlayers = players.filter(p => !p.isFolded);
    let bestScore = -1;
    let winners = [];

    activePlayers.forEach(p => {
        const evalRes = evaluateBestHand([...p.cards, ...communityCards]);
        p.evalRes = evalRes;

        if (evalRes.rankScore > bestScore) {
            bestScore = evalRes.rankScore;
            winners = [p];
        } else if (evalRes.rankScore === bestScore) {
            if (evalRes.kickerSum > winners[0].evalRes.kickerSum) {
                winners = [p];
            } else if (evalRes.kickerSum === winners[0].evalRes.kickerSum) {
                winners.push(p);
            }
        }
    });

    const share = Math.floor(currentPot / winners.length);
    winners.forEach(w => w.bankroll += share);
}

// ==========================================
// 4. RENDERING & USER CONTROLS
// ==========================================

function sendAction(action, amount = 0) {
    if (isHost) {
        processPlayerAction(myPeerId, action, amount);
    } else if (hostConn) {
        hostConn.send({ type: 'PLAYER_ACTION', action, amount });
    }
}

function renderBoard(state) {
    if (!state) return;

    potDisplay.textContent = `$${state.pot}`;

    // Render Community Cards
    communityCardsDiv.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        if (i < state.communityCards.length) {
            communityCardsDiv.appendChild(createCardImg(state.communityCards[i]));
        } else {
            const slot = document.createElement('div');
            slot.style.width = '76px';
            slot.style.height = '108px';
            slot.style.border = '1px dashed rgba(255, 255, 255, 0.15)';
            slot.style.borderRadius = '8px';
            communityCardsDiv.appendChild(slot);
        }
    }

    // Render Seats
    seatsContainer.innerHTML = '';
    state.players.forEach((p, idx) => {
        const seat = document.createElement('div');
        const isActive = idx === state.activePlayerIndex;
        seat.className = `seat-box ${isActive ? 'active-turn' : ''} ${p.isFolded ? 'folded' : ''}`;

        let cardsHTML = '';
        if (p.cards && p.cards.length > 0) {
            p.cards.forEach(c => {
                cardsHTML += `<img src="/images/cards/${c.suit}/${c.rank}${c.suit}.png" class="mini-card">`;
            });
        } else {
            cardsHTML = `<img src="/images/cards/cardBack.png" class="mini-card"><img src="/images/cards/cardBack.png" class="mini-card">`;
        }

        seat.innerHTML = `
            <div class="seat-name">${p.name} ${idx === state.dealerIndex ? '🎩' : ''}</div>
            <div class="seat-chips">$${p.bankroll}</div>
            <div class="seat-cards">${cardsHTML}</div>
            <div class="seat-action">${p.isFolded ? 'Couché' : (p.currentBet > 0 ? `Mise: $${p.currentBet}` : '')}</div>
        `;
        seatsContainer.appendChild(seat);
    });

    // Render Local Hand Evaluation
    if (myHoleCards.length > 0) {
        const evalRes = evaluateBestHand([...myHoleCards, ...state.communityCards]);
        handEvalTag.textContent = `Votre main : ${evalRes.name}`;
    }

    // Action buttons states
    const isMyTurn = (state.players[state.activePlayerIndex]?.peerId === myPeerId) && state.phase !== 'SHOWDOWN';
    const diff = state.currentHighestBet - (state.players.find(p => p.peerId === myPeerId)?.currentBet || 0);

    checkBtn.disabled = !isMyTurn || diff > 0;
    callBtn.disabled = !isMyTurn || diff === 0;
    callBtn.textContent = `Suivre ($${diff})`;

    bet25Btn.disabled = !isMyTurn;
    bet50Btn.disabled = !isMyTurn;
    bet100Btn.disabled = !isMyTurn;
    foldBtn.disabled = !isMyTurn;

    // Showdown Modal
    if (state.phase === 'SHOWDOWN') {
        resultTitle.textContent = 'Abattage des Mains (Showdown)';
        resultSub.textContent = `Le pot de $${state.pot} a été distribué !`;
        popUp.style.display = 'block';
        if (isHost) resetBtn.style.display = 'inline-block';
        else resetBtn.style.display = 'none';
    }
}

function onResetClick() {
    if (isHost) {
        popUp.style.display = 'none';
        if (isMultiplayer) startMultiplayerHand();
        else startSoloHand();
    }
}

function createCardImg(card) {
    const img = document.createElement('img');
    img.src = `/images/cards/${card.suit}/${card.rank}${card.suit}.png`;
    img.className = 'card';
    img.alt = `${card.rank} ${card.suit}`;
    return img;
}

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

// 7-CARD HAND EVALUATOR
function evaluateBestHand(cards) {
    if (cards.length < 5) return { name: 'Pré-flop', rankScore: 0, kickerSum: 0 };
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
        if (combo.length === size) { results.push([...combo]); return; }
        for (let i = start; i < array.length; i++) {
            combo.push(array[i]); helper(i + 1, combo); combo.pop();
        }
    }
    helper(0, []);
    return results;
}

function score5CardHand(hand) {
    const sorted = [...hand].sort((a, b) => b.value - a.value);
    const values = sorted.map(c => c.value);
    const suitsArr = sorted.map(c => c.suit);
    const isFlush = suitsArr.every(s => s === suitsArr[0]);
    
    let isStraight = false;
    let straightHigh = 0;

    if (values[0] - values[4] === 4 && new Set(values).size === 5) {
        isStraight = true; straightHigh = values[0];
    } else if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
        isStraight = true; straightHigh = 5;
    }

    const counts = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const freqPairs = Object.entries(counts).map(([v, count]) => ({ val: Number(v), count }));
    freqPairs.sort((a, b) => b.count - a.count || b.val - a.val);

    const kickerSum = values.reduce((acc, v, idx) => acc + v * Math.pow(15, 4 - idx), 0);

    if (isFlush && isStraight) return { name: straightHigh === 14 ? 'Quinte Flush Royale 👑' : 'Quinte Flush', rankScore: HAND_RANKS.STRAIGHT_FLUSH, kickerSum: straightHigh };
    if (freqPairs[0].count === 4) return { name: `Carré de ${getRankName(freqPairs[0].val)}`, rankScore: HAND_RANKS.FOUR_OF_A_KIND, kickerSum: freqPairs[0].val * 100 + freqPairs[1].val };
    if (freqPairs[0].count === 3 && freqPairs[1].count === 2) return { name: `Full aux ${getRankName(freqPairs[0].val)}`, rankScore: HAND_RANKS.FULL_HOUSE, kickerSum: freqPairs[0].val * 100 + freqPairs[1].val };
    if (isFlush) return { name: `Couleur au ${getRankName(values[0])}`, rankScore: HAND_RANKS.FLUSH, kickerSum };
    if (isStraight) return { name: `Quinte au ${getRankName(straightHigh)}`, rankScore: HAND_RANKS.STRAIGHT, kickerSum: straightHigh };
    if (freqPairs[0].count === 3) return { name: `Brelan de ${getRankName(freqPairs[0].val)}`, rankScore: HAND_RANKS.THREE_OF_A_KIND, kickerSum: freqPairs[0].val * 1000 + kickerSum };
    if (freqPairs[0].count === 2 && freqPairs[1].count === 2) return { name: `Double Paire (${getRankName(freqPairs[0].val)}/${getRankName(freqPairs[1].val)})`, rankScore: HAND_RANKS.TWO_PAIR, kickerSum: freqPairs[0].val * 1000 + freqPairs[1].val * 100 };
    if (freqPairs[0].count === 2) return { name: `Paire de ${getRankName(freqPairs[0].val)}`, rankScore: HAND_RANKS.ONE_PAIR, kickerSum: freqPairs[0].val * 10000 + kickerSum };

    return { name: `Hauteur ${getRankName(values[0])}`, rankScore: HAND_RANKS.HIGH_CARD, kickerSum };
}

function getRankName(val) {
    const map = { 14: 'As', 13: 'Roi', 12: 'Dame', 11: 'Valet' };
    return map[val] || `${val}`;
}
