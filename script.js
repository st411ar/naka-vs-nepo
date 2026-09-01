const API_URL =
    'https://chess-api-production-4ee5.up.railway.app';

let players = [];
let tournaments = [];
let results = [];

const elements = {
    statusMessage: document.getElementById('statusMessage'),
    timelineContainer: document.getElementById('timelineContainer'),
    comparisonContainer: document.getElementById('comparisonContainer'),
    firstPlayerSelect: document.getElementById('firstPlayerSelect'),
    secondPlayerSelect: document.getElementById('secondPlayerSelect'),
    bothParticipatedFilter: document.getElementById('bothParticipatedFilter'),
    sameEditionFilter: document.getElementById('sameEditionFilter')
};

async function apiRequest(path) {
    const response = await fetch(`${API_URL}${path}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data;
}

async function loadData() {
    try {
        [players, tournaments, results] = await Promise.all([
            apiRequest('/players'),
            apiRequest('/tournaments'),
            apiRequest('/results')
        ]);

        configurePlayerSelectors();
        renderTimeline();
        renderComparison();
        elements.statusMessage.className = 'status-message success';
        elements.statusMessage.textContent = '';
    }
    catch (error) {
        elements.statusMessage.className = 'status-message error';
        elements.statusMessage.textContent = `Не удалось загрузить данные: ${error.message}`;
    }
}

function setupTabs() {
    const buttons = [...document.querySelectorAll('.tab-button')];
    const panels = [...document.querySelectorAll('.tab-panel')];

    for (const button of buttons) {
        button.addEventListener('click', () => {
            const target = button.dataset.tab;

            for (const currentButton of buttons) {
                const isActive = currentButton === button;
                currentButton.classList.toggle('active', isActive);
                currentButton.setAttribute('aria-selected', String(isActive));
            }

            for (const panel of panels) {
                const isActive = panel.id === `${target}Panel`;
                panel.classList.toggle('active', isActive);
                panel.hidden = !isActive;
            }
        });
    }
}

function getPlayerName(playerId) {
    return players.find(player => player.id === playerId)?.name || playerId;
}

function getTournamentName(tournamentId) {
    return tournaments.find(tournament => tournament.id === tournamentId)?.name || tournamentId;
}

function getTournamentResults(tournamentId) {
    return results
        .filter(result => result.tournamentId === tournamentId)
        .sort((left, right) => Number(left.year) - Number(right.year));
}

function tournamentMatchesFilters(tournament) {
    const tournamentResults = getTournamentResults(tournament.id);
    const hasNepo = tournamentResults.some(result =>
        result.players.some(player => player.playerId === 'nepo')
    );
    const hasNaka = tournamentResults.some(result =>
        result.players.some(player => player.playerId === 'naka')
    );

    if (elements.bothParticipatedFilter.checked && !(hasNepo && hasNaka)) {
        return false;
    }

    if (elements.sameEditionFilter.checked) {
        if (tournament.id === 'national-championships') {
            return false;
        }

        const playedSameEdition = tournamentResults.some(result => {
            const playerIds = new Set(result.players.map(player => player.playerId));
            return playerIds.has('nepo') && playerIds.has('naka');
        });

        if (!playedSameEdition) {
            return false;
        }
    }

    return true;
}

function getFilteredTournaments() {
    return tournaments.filter(tournamentMatchesFilters);
}

function getVisibleTournamentResults(tournamentId) {
    const tournamentResults = getTournamentResults(tournamentId);

    if (!elements.sameEditionFilter.checked) {
        return tournamentResults;
    }

    return tournamentResults.filter(result => {
        const playerIds = new Set(
            result.players.map(player => player.playerId)
        );

        return playerIds.has('nepo') && playerIds.has('naka');
    });
}

function createDetails(title, metaText) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const titleWrap = document.createElement('span');
    const titleElement = document.createElement('span');
    const content = document.createElement('div');

    titleElement.textContent = title;
    content.className = 'details-content';

    titleWrap.appendChild(titleElement);
    summary.appendChild(titleWrap);
    details.append(summary, content);

    return { details, content };
}

function renderTimeline() {
    elements.timelineContainer.innerHTML = '';

    for (const tournament of getFilteredTournaments()) {
        const tournamentResults = getVisibleTournamentResults(tournament.id);
        const yearsLabel = tournamentResults.length === 1
            ? '1 проведение'
            : `${tournamentResults.length} проведений`;
        const { details, content } = createDetails(tournament.name, yearsLabel);

        if (tournamentResults.length === 0) {
            const message = document.createElement('p');
            message.className = 'empty-message';
            message.textContent = 'Для этого турнира результатов пока нет.';
            content.appendChild(message);
        }
        else {
            for (const tournamentResult of tournamentResults) {
                const yearBlock = document.createElement('section');
                const yearHeading = document.createElement('h3');
                const list = document.createElement('ul');

                yearBlock.className = 'year-block';
                yearHeading.textContent = tournamentResult.year;
                list.className = 'result-list';

                for (const playerResult of tournamentResult.players) {
                    const item = document.createElement('li');
                    const playerName = document.createElement('span');
                    const resultValue = document.createElement('span');

                    playerName.textContent = getPlayerName(playerResult.playerId);
                    resultValue.className = 'result-value';
                    resultValue.textContent = formatResult(playerResult.result);
                    item.append(playerName, resultValue);
                    list.appendChild(item);
                }

                yearBlock.append(yearHeading, list);
                content.appendChild(yearBlock);
            }
        }

        elements.timelineContainer.appendChild(details);
    }
}

function configurePlayerSelectors() {
    const firstCurrent = elements.firstPlayerSelect.value;
    const secondCurrent = elements.secondPlayerSelect.value;

    fillPlayerSelect(elements.firstPlayerSelect);
    fillPlayerSelect(elements.secondPlayerSelect);

    elements.firstPlayerSelect.value = choosePlayerId(
        firstCurrent,
        'nepo',
        players[0]?.id
    );

    elements.secondPlayerSelect.value = choosePlayerId(
        secondCurrent,
        'naka',
        players[1]?.id || players[0]?.id
    );
}

function fillPlayerSelect(select) {
    select.innerHTML = '';

    for (const player of players) {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.name;
        select.appendChild(option);
    }
}

function choosePlayerId(currentId, preferredId, fallbackId) {
    if (players.some(player => player.id === currentId)) {
        return currentId;
    }

    if (players.some(player => player.id === preferredId)) {
        return preferredId;
    }

    return fallbackId || '';
}

function renderComparison() {
    elements.comparisonContainer.innerHTML = '';

    const firstPlayerId = elements.firstPlayerSelect.value;
    const secondPlayerId = elements.secondPlayerSelect.value;

    if (!firstPlayerId || !secondPlayerId) {
        const message = document.createElement('p');
        message.className = 'empty-message';
        message.textContent = 'Для сравнения нужны как минимум два игрока.';
        elements.comparisonContainer.appendChild(message);
        return;
    }

    for (const tournament of getFilteredTournaments()) {
        const tournamentResults = getVisibleTournamentResults(tournament.id);
        const format = getTournamentFormat(tournament, tournamentResults);
        const isKnockout = format === 'knockout';
        const showPodiums = format === 'standings';
        const firstStats = calculateStats(tournamentResults, firstPlayerId, showPodiums, isKnockout);
        const secondStats = calculateStats(tournamentResults, secondPlayerId, showPodiums, isKnockout);
        const { details, content } = createDetails(
            tournament.name,
            getFormatDescription(format, tournamentResults.length)
        );

        content.appendChild(createComparisonTable(
            firstPlayerId,
            secondPlayerId,
            firstStats,
            secondStats,
            isKnockout,
            showPodiums
        ));

        elements.comparisonContainer.appendChild(details);
    }
}

function getTournamentFormat(tournament, tournamentResults) {
    if (['standings', 'knockout', 'match'].includes(tournament.format)) {
        return tournament.format;
    }

    return isCupTournament(tournament, tournamentResults)
        ? 'knockout'
        : 'standings';
}

function getFormatDescription(format, resultCount) {
    if (format === 'knockout') {
        return 'кубковая система';
    }

    if (format === 'match') {
        return 'матч за титул';
    }

    return `${resultCount} проведений`;
}

function isCupTournament(tournament, tournamentResults) {
    const nameLooksLikeCup = /кубок/i.test(tournament.name);
    const hasKnockoutResult = tournamentResults.some(result =>
        result.players.some(player => parseKnockoutRound(player.result) !== null)
    );

    return nameLooksLikeCup || hasKnockoutResult;
}

function calculateStats(tournamentResults, playerId, showPodiums, isKnockout) {
    const values = tournamentResults
        .map(result => result.players.find(player => player.playerId === playerId)?.result)
        .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
        .map(value => String(value).trim());

    const frequencies = new Map();

    for (const value of values) {
        frequencies.set(value, (frequencies.get(value) || 0) + 1);
    }

    const numericPlaces = values
        .map(parseNumericPlace)
        .filter(value => value !== null);

    return {
        participations: values.length,
        podiums: showPodiums
            ? numericPlaces.filter(place => place >= 1 && place <= 3).length
            : null,
        frequencies,
        bestResult: getBestResult(values, isKnockout)
    };
}

function parseNumericPlace(value) {
    const normalized = String(value).trim();

    if (!/^\d+$/.test(normalized)) {
        return null;
    }

    const number = Number(normalized);
    return Number.isInteger(number) && number > 0 ? number : null;
}

function parseKnockoutRound(value) {
    const normalized = String(value)
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .trim();

    const match = normalized.match(/^1\s*\/\s*(\d+)\s*(?:финала)?$/);

    if (!match) {
        return null;
    }

    const denominator = Number(match[1]);
    return denominator >= 2 ? denominator : null;
}

function getBestResult(values, isCup) {
    if (values.length === 0) {
        return '—';
    }

    if (isCup) {
        return [...values].sort(compareCupResults)[0];
    }

    const numericPlaces = values
        .map(parseNumericPlace)
        .filter(value => value !== null);

    return numericPlaces.length > 0
        ? String(Math.min(...numericPlaces))
        : '—';
}

function compareCupResults(left, right) {
    return cupResultRank(left) - cupResultRank(right);
}

function cupResultRank(value) {
    const numericPlace = parseNumericPlace(value);

    if (numericPlace !== null) {
        return numericPlace;
    }

    const denominator = parseKnockoutRound(value);

    if (denominator !== null) {
        return 4 + Math.log2(denominator);
    }

    return Number.MAX_SAFE_INTEGER;
}

function getResultRows(firstStats, secondStats, isCup) {
    const values = new Set([
        ...firstStats.frequencies.keys(),
        ...secondStats.frequencies.keys()
    ]);

    const rows = [...values].sort((left, right) => {
        if (isCup) {
            return compareCupResults(left, right);
        }

        const leftPlace = parseNumericPlace(left);
        const rightPlace = parseNumericPlace(right);

        if (leftPlace !== null && rightPlace !== null) {
            return leftPlace - rightPlace;
        }

        if (leftPlace !== null) {
            return -1;
        }

        if (rightPlace !== null) {
            return 1;
        }

        return left.localeCompare(right, 'ru');
    });

    return rows.map(value => ({
        label: isCup ? formatResult(value) : `${value}-е место`,
        firstValue: firstStats.frequencies.get(value) || 0,
        secondValue: secondStats.frequencies.get(value) || 0
    }));
}

function formatResult(value) {
    const normalized = String(value).trim();
    const denominator = parseKnockoutRound(normalized);

    if (denominator !== null) {
        return `1/${denominator} финала`;
    }

    return normalized;
}

function createComparisonTable(
    firstPlayerId,
    secondPlayerId,
    firstStats,
    secondStats,
    isKnockout,
    showPodiums
) {
    const wrapper = document.createElement('div');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headerRow = document.createElement('tr');

    wrapper.className = 'table-wrap';
    table.className = 'comparison-table';

    appendCells(headerRow, [
        'Показатель',
        getPlayerName(firstPlayerId),
        getPlayerName(secondPlayerId)
    ], 'th');

    thead.appendChild(headerRow);
    appendStatRow(tbody, 'Участий', firstStats.participations, secondStats.participations);

    if (showPodiums) {
        appendStatRow(tbody, 'Подиумов', firstStats.podiums, secondStats.podiums);
    }

    for (const row of getResultRows(firstStats, secondStats, isKnockout)) {
        appendStatRow(tbody, row.label, row.firstValue, row.secondValue);
    }

    appendStatRow(
        tbody,
        'Лучший результат',
        formatResult(firstStats.bestResult),
        formatResult(secondStats.bestResult),
        'highlight-row'
    );

    table.append(thead, tbody);
    wrapper.appendChild(table);
    return wrapper;
}

function appendStatRow(tbody, label, firstValue, secondValue, className = '') {
    const row = document.createElement('tr');
    row.className = className;
    appendCells(row, [label, firstValue, secondValue], 'td');
    tbody.appendChild(row);
}

function appendCells(row, values, tagName) {
    for (const value of values) {
        const cell = document.createElement(tagName);
        cell.textContent = value === 0 ? '—' : value;
        row.appendChild(cell);
    }
}

elements.firstPlayerSelect.addEventListener('change', renderComparison);
elements.secondPlayerSelect.addEventListener('change', renderComparison);
elements.bothParticipatedFilter.addEventListener('change', () => {
    if (!elements.bothParticipatedFilter.checked) {
        elements.sameEditionFilter.checked = false;
    }
    renderTimeline();
    renderComparison();
});
elements.sameEditionFilter.addEventListener('change', () => {
    if (elements.sameEditionFilter.checked) {
        elements.bothParticipatedFilter.checked = true;
    }
    renderTimeline();
    renderComparison();
});

setupTabs();
loadData();
