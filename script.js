document.addEventListener('DOMContentLoaded', () => {
    const deckForm = document.getElementById('deck-form');
    const deckNameInput = document.getElementById('deck-name');
    const deckFormatSelect = document.getElementById('deck-format');
    const cardListTextarea = document.getElementById('card-list');
    const savedDecksList = document.getElementById('saved-decks-list');
    const mainView = document.getElementById('main-view');
    const detailView = document.getElementById('deck-detail-view');
    const backToListBtn = document.getElementById('back-to-list-btn');
    const detailDeckName = document.getElementById('detail-deck-name');
    const detailDeckFormat = document.getElementById('detail-deck-format');
    const detailCardBreakdown = document.getElementById('card-columns');
    const totalCardsSpan = document.getElementById('total-cards');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchResultContainer = document.getElementById('search-result');
    const cardModal = document.getElementById('card-modal');
    const modalImage = document.getElementById('modal-image');
    const modalCloseBtn = document.getElementById('modal-close');
    const colorFilters = document.getElementById('color-filters');
    let downloadDeckBtn = document.getElementById('download-deck-btn');
    
    loadDecks();

    deckForm.addEventListener('submit', (e) => { e.preventDefault(); saveAndReload(); });
    backToListBtn.addEventListener('click', showMainView);
    searchForm.addEventListener('submit', (e) => { e.preventDefault(); searchCards(); });
    modalCloseBtn.addEventListener('click', hideCardModal);
    cardModal.addEventListener('click', (e) => { if (e.target === cardModal) hideCardModal(); });

    async function searchCards() {
        const cardName = searchInput.value.trim();
        if (!cardName) return;
        let query = `${cardName}`;
        const selectedColors = Array.from(colorFilters.querySelectorAll('input:checked')).map(cb => cb.value).join('');
        if (selectedColors) { query += ` color<=${selectedColors}`; }
        searchResultContainer.innerHTML = '<p>Buscando...</p>';
        try {
            const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&unique=cards`);
            if (!response.ok) {
                if(response.status === 404) throw new Error('No se encontraron cartas que coincidan.');
                else throw new Error('Error en la búsqueda.');
            }
            const resultData = await response.json();
            displaySearchResults(resultData.data);
        } catch (error) { searchResultContainer.innerHTML = `<p>${error.message}</p>`; }
    }
    function displaySearchResults(cards) {
        searchResultContainer.innerHTML = '';
        if (!cards || cards.length === 0) { searchResultContainer.innerHTML = '<p>No se encontraron cartas.</p>'; return; }
        cards.forEach(card => {
            const imageUrl = card.image_uris?.small || card.card_faces?.[0].image_uris.small;
            if (!imageUrl) return;
            const cardItem = document.createElement('div');
            cardItem.className = 'search-card-item';
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = card.name;
            img.addEventListener('click', () => showCardInModal(card));
            const addButton = document.createElement('button');
            addButton.className = 'add-card-btn';
            addButton.textContent = '+';
            addButton.title = `Añadir "${card.name}" a la baraja`;
            addButton.addEventListener('click', (e) => { e.stopPropagation(); addCardToDecklist(card.name); });
            cardItem.appendChild(img);
            cardItem.appendChild(addButton);
            searchResultContainer.appendChild(cardItem);
        });
    }
    function addCardToDecklist(cardName) {
        const list = cardListTextarea.value;
        const cardNameRegex = new RegExp(`^(\\d+)\\s*x?\\s*${escapeRegExp(cardName)}$`, 'im');
        let newList = '';
        if (cardNameRegex.test(list)) { newList = list.replace(cardNameRegex, (match, quantity) => `${parseInt(quantity, 10) + 1} ${cardName}`); }
        else { const newLine = `1 ${cardName}`; newList = list ? `${list}\n${newLine}` : newLine; }
        cardListTextarea.value = newList;
        cardListTextarea.style.transition = 'none';
        cardListTextarea.style.backgroundColor = '#4a4a50';
        setTimeout(() => { cardListTextarea.style.transition = 'background-color 0.5s'; cardListTextarea.style.backgroundColor = ''; }, 150);
    }
    function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function showCardInModal(cardData) {
        const imageUrl = cardData.image_uris?.normal || cardData.card_faces[0].image_uris.normal;
        if (imageUrl) { modalImage.src = imageUrl; modalImage.alt = cardData.name; cardModal.classList.remove('hidden'); }
    }
    function hideCardModal() { cardModal.classList.add('hidden'); modalImage.src = ""; }
    function downloadDeckAsTxt(deck) {
        const fileContent = `Nombre: ${deck.name}\nFormato: ${deck.format}\n\n---\n\n${deck.cards}`;
        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const fileName = sanitizeFilename(`${deck.name}.txt`);
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }
    function sanitizeFilename(name) { return name.replace(/[\s\/\\?%*:|"<>]/g, '_'); }
    function saveAndReload() {
        const deck = { id: Date.now(), name: deckNameInput.value.trim(), format: deckFormatSelect.value, cards: cardListTextarea.value.trim() };
        if (deck.name) { saveDeck(deck); deckForm.reset(); loadDecks(); }
        else { alert('Por favor, ponle un nombre a tu baraja.'); }
    }
    function saveDeck(deck) { const decks = getDecksFromStorage(); decks.push(deck); localStorage.setItem('magicDecks', JSON.stringify(decks)); }
    function loadDecks() {
        const decks = getDecksFromStorage();
        savedDecksList.innerHTML = '';
        if (decks.length === 0) { savedDecksList.innerHTML = '<li>No tienes barajas guardadas todavía.</li>'; return; }
        decks.forEach(deck => {
            const li = document.createElement('li');
            li.dataset.id = deck.id;
            const info = document.createElement('div');
            info.className = 'deck-info';
            info.innerHTML = `${deck.name} <small>${deck.format}</small>`;
            const btn = document.createElement('button');
            btn.textContent = 'Eliminar';
            btn.className = 'btn btn-danger';
            btn.addEventListener('click', e => { e.stopPropagation(); if (confirm(`¿Eliminar "${deck.name}"?`)) deleteDeck(deck.id); });
            li.appendChild(info);
            li.appendChild(btn);
            li.addEventListener('click', () => viewDeck(deck.id));
            savedDecksList.appendChild(li);
        });
    }
    function deleteDeck(id) { let decks = getDecksFromStorage(); decks = decks.filter(deck => deck.id !== id); localStorage.setItem('magicDecks', JSON.stringify(decks)); loadDecks(); }
    function getDecksFromStorage() { const decks = localStorage.getItem('magicDecks'); return decks ? JSON.parse(decks) : []; }
    async function viewDeck(id) {
        const decks = getDecksFromStorage();
        const deck = decks.find(d => d.id === id);
        if (deck) {
            detailDeckName.textContent = deck.name;
            detailDeckFormat.textContent = deck.format;
            const cards = deck.cards.split('\n').filter(line => line.trim() !== '');
            detailCardBreakdown.innerHTML = '';
            let totalCards = 0;
            for (const cardLine of cards) {
                const cardElement = document.createElement('p');
                cardElement.textContent = cardLine;
                const match = cardLine.trim().match(/^(?:\d+\s*x?\s*)?(.*)/i);
                if (match && match[1]) {
                    const cardName = match[1].trim();
                    cardElement.classList.add('clickable-card');
                    cardElement.addEventListener('click', async () => {
                        try {
                            const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
                            if (!response.ok) throw new Error();
                            const cardData = await response.json();
                            showCardInModal(cardData);
                        } catch (e) { alert(`No se encontró la carta: "${cardName}"`); }
                    });
                }
                detailCardBreakdown.appendChild(cardElement);
                const quantityMatch = cardLine.trim().match(/^(\d+)/);
                if (quantityMatch && quantityMatch[1]) totalCards += parseInt(quantityMatch[1], 10);
                else totalCards += 1;
            }
            totalCardsSpan.textContent = totalCards;
            const newDownloadBtn = downloadDeckBtn.cloneNode(true);
            downloadDeckBtn.parentNode.replaceChild(newDownloadBtn, downloadDeckBtn);
            downloadDeckBtn = newDownloadBtn;
            downloadDeckBtn.addEventListener('click', () => downloadDeckAsTxt(deck));
            showDetailView();
        }
    }
    function showMainView() { mainView.classList.remove('hidden'); detailView.classList.add('hidden'); }
    function showDetailView() { mainView.classList.add('hidden'); detailView.classList.remove('hidden'); }
});