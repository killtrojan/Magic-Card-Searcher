document.addEventListener('DOMContentLoaded', () => {

    // --- Referencias a elementos del DOM ---
    const searchButton = document.getElementById('searchButton');
    const cardNameInput = document.getElementById('cardNameInput');
    const resultsGrid = document.getElementById('resultsGrid');
    const typeFilter = document.getElementById('typeFilter');
    
    // Modal
    const modal = document.getElementById('cardModal');
    const modalCloseButton = document.getElementById('modalClose');
    const modalBody = document.getElementById('modalBody');

    // --- NUEVO: Almacenamiento para los símbolos de maná ---
    let manaSymbols = {};

    // --- NUEVO: Función para obtener todos los símbolos de maná de la API ---
    const fetchManaSymbols = async () => {
        try {
            const response = await fetch('https://api.scryfall.com/symbology');
            if (!response.ok) throw new Error('No se pudieron cargar los símbolos de maná.');
            
            const symbologyData = await response.json();
            
            // Guardamos cada símbolo y su URL en nuestro objeto
            symbologyData.data.forEach(symbol => {
                manaSymbols[symbol.symbol] = symbol.svg_uri;
            });
            console.log('Símbolos de maná cargados exitosamente.');
        } catch (error) {
            console.error(error);
            // La app puede seguir funcionando, pero no mostrará los símbolos
        }
    };

    // --- NUEVO: Función para reemplazar texto de maná por imágenes ---
    const replaceManaSymbols = (text) => {
        if (!text) return 'N/A'; // Devuelve 'N/A' si el texto es nulo (ej. tierras sin coste)

        // Usamos una expresión regular para encontrar todos los símbolos como {W}, {2}, {T}, etc.
        return text.replace(/{([^}]+)}/g, (match) => {
            // 'match' es el texto completo, ej: "{W}"
            const symbolUrl = manaSymbols[match];
            if (symbolUrl) {
                // Si encontramos el símbolo en nuestro objeto, devolvemos una etiqueta de imagen
                return `<img src="${symbolUrl}" alt="${match}" class="mana-symbol">`;
            }
            // Si no lo encontramos, devolvemos el texto original
            return match;
        });
    };


    // --- Función para construir la consulta de búsqueda ---
    const buildSearchQuery = () => {
        let queryParts = [];
        const nameText = cardNameInput.value.trim();
        if (nameText) queryParts.push(nameText);

        const typeValue = typeFilter.value;
        if (typeValue) queryParts.push(`t:${typeValue}`);

        const selectedColors = [];
        document.querySelectorAll('.color-checkboxes input:checked').forEach(checkbox => {
            selectedColors.push(checkbox.value);
        });
        if (selectedColors.length > 0) {
            queryParts.push(`c>=${selectedColors.join('')}`);
        }
        
        return queryParts.join(' ');
    };

    // --- Función principal de búsqueda ---
    const searchCards = async () => {
        const query = buildSearchQuery();
        if (!query) {
            resultsGrid.innerHTML = '<p class="error-message">Introduce algún criterio de búsqueda.</p>';
            return;
        }

        resultsGrid.innerHTML = '<p>Buscando...</p>';

        try {
            const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'No se encontraron cartas con esos criterios.');
            }
            const cardListData = await response.json();
            displayResultsGrid(cardListData.data);
        } catch (error) {
            resultsGrid.innerHTML = `<p class="error-message">${error.message}</p>`;
        }
    };

    // --- Función para mostrar los resultados en la cuadrícula ---
    const displayResultsGrid = (cards) => {
        resultsGrid.innerHTML = '';
        if (cards.length === 0) {
            resultsGrid.innerHTML = '<p>Cards not found.</p>';
            return;
        }
        cards.forEach(card => {
            const imageUrl = card.image_uris?.small || card.card_faces?.[0].image_uris?.small;
            if (imageUrl) {
                const imgElement = document.createElement('img');
                imgElement.src = imageUrl;
                imgElement.alt = card.name;
                imgElement.classList.add('grid-card-image');
                imgElement.addEventListener('click', () => openModal(card));
                resultsGrid.appendChild(imgElement);
            }
        });
    };

    // --- Funciones para el Modal (ACTUALIZADA) ---
    const openModal = (card) => {
        const imageUrl = card.image_uris?.normal || card.card_faces?.[0].image_uris?.normal;

        // ¡BONUS! También reemplazamos los símbolos en el texto de la carta (oracle_text)
        const oracleTextWithSymbols = replaceManaSymbols(card.oracle_text || 'Sin texto de reglas.');
        
        const cardHTML = `
            <img src="${imageUrl}" alt="${card.name}">
            <div class="card-info">
                <h2>${card.name}</h2>
                <p><strong>Mana Cost:</strong> ${replaceManaSymbols(card.mana_cost)}</p>
                <p><strong>Type:</strong> ${card.type_line}</p>
                <p><strong>Text:</strong></p>
                <p>${oracleTextWithSymbols.replace(/\n/g, '<br>')}</p>
                ${card.power ? `<p><strong>Power/Toughness:</strong> ${card.power}/${card.toughness}</p>` : ''}
                <p><strong>Expansion:</strong> ${card.set_name}</p>
                <p><strong>Legality:</strong> ${Object.entries(card.legalities).filter(([_,v]) => v === 'legal').map(([k]) => k).join(', ')}</p>
            </div>
        `;
        modalBody.innerHTML = cardHTML;
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
        modalBody.innerHTML = '';
    };

    // --- Event Listeners ---
    searchButton.addEventListener('click', searchCards);
    cardNameInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') searchCards();
    });

    modalCloseButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    // --- NUEVO: Iniciar la carga de los símbolos al cargar la página ---
    fetchManaSymbols();
});