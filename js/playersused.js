Promise.all([
  fetch("data/seasons.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json())
]).then(([seasons, matches, appearances]) => {
  const table = document.getElementById("playersUsedTable");
  const countEl = document.getElementById("playersUsedCount");
  const includeFriendliesBox = document.getElementById("includeFriendlies");

  function normalise(value) {
    return String(value || "").trim();
  }

  function isFriendly(match) {
    const comp = normalise(match.competition).toLowerCase();
    return comp === "friendly" || comp === "friendlies" || comp === "fr" || comp.includes("friendly");
  }

  function isCountableMatch(match) {
    return (
      match &&
      normalise(match.abandoned).toUpperCase() !== "Y" &&
      normalise(match.home_score) !== "?" &&
      normalise(match.away_score) !== "?" &&
      !Number.isNaN(Number(match.home_score)) &&
      !Number.isNaN(Number(match.away_score))
    );
  }

  function parseDate(value) {
    if (!value) return null;

    const parts = normalise(value)
      .replace(/\./g, "/")
      .replace(/-/g, "/")
      .split("/");

    if (parts.length !== 3) return null;

    let [dd, mm, yyyy] = parts;

    if (yyyy.length === 2) {
      yyyy = Number(yyyy) >= 50 ? `18${yyyy}` : `19${yyyy}`;
    }

    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function matchSortValue(match) {
    const note = normalise(match.notes).toLowerCase();

    if (note.includes("date of match unknown")) {
      return new Date(9999, 11, 31).getTime();
    }

    const d = parseDate(match.date);
    const time = d ? d.getTime() : new Date(9999, 11, 30).getTime();
    const index = matches.findIndex(m => normalise(m.id) === normalise(match.id));

    return time + (index / 100000);
  }

  function seasonName(seasonId) {
    const season = seasons.find(s => normalise(s.id) === normalise(seasonId));
    return season ? season.name : seasonId;
  }

  function goldStarWrap(value) {
    return `<span class="gold-star">★</span>${value}<span class="gold-star">★</span>`;
  }

  function seasonSortValue(season) {
    const startYear = Number(season.start_year);
    if (!Number.isNaN(startYear)) return startYear;

    const name = normalise(season.name || season.id);
    const match = name.match(/(\d{4})/);
    if (match) return Number(match[1]);

    return 999999;
  }

  function filteredMatches(includeFriendlies) {
    return matches
      .filter(match => isCountableMatch(match))
      .filter(match => includeFriendlies || !isFriendly(match));
  }

  function filteredAppearances(includeFriendlies) {
    const matchMap = new Map(
      filteredMatches(includeFriendlies).map(match => [normalise(match.id), match])
    );

    return appearances
      .filter(app => normalise(app.team) === "t1")
      .map(app => ({
        app,
        match: matchMap.get(normalise(app.match_id))
      }))
      .filter(row => row.match);
  }

  function playerFirstLastSeasons(includeFriendlies) {
    const rows = filteredAppearances(includeFriendlies)
      .sort((a, b) => matchSortValue(a.match) - matchSortValue(b.match));

    const map = {};

    rows.forEach(row => {
      const playerId = normalise(row.app.player_id);
      const seasonId = normalise(row.match.season_id);

      if (!map[playerId]) {
        map[playerId] = {
          firstSeason: seasonId,
          lastSeason: seasonId
        };
      }

      map[playerId].lastSeason = seasonId;
    });

    return map;
  }

  function render() {
    const includeFriendlies = includeFriendliesBox ? includeFriendliesBox.checked : false;
    const allRows = filteredAppearances(includeFriendlies);
    const firstLast = playerFirstLastSeasons(includeFriendlies);

    table.innerHTML = "";

    const orderedSeasons = [...seasons].sort((a, b) =>
      seasonSortValue(a) - seasonSortValue(b) ||
      normalise(a.name || a.id).localeCompare(normalise(b.name || b.id))
    );

    let seasonsShown = 0;
    let bestPlayersUsed = 0;

    orderedSeasons.forEach(season => {
      const seasonId = normalise(season.id);
      const seasonRows = allRows.filter(row => normalise(row.match.season_id) === seasonId);

      if (!seasonRows.length) return;

      const playersUsed = new Set(seasonRows.map(row => normalise(row.app.player_id)));

      let debutants = 0;
      let lastOutings = 0;

      playersUsed.forEach(playerId => {
        if (firstLast[playerId] && firstLast[playerId].firstSeason === seasonId) debutants++;
        if (firstLast[playerId] && firstLast[playerId].lastSeason === seasonId) lastOutings++;
      });

      const playersUsedDisplay = playersUsed.size > bestPlayersUsed
        ? goldStarWrap(playersUsed.size)
        : playersUsed.size;

      table.innerHTML += `
        <tr>
          <td><a href="season.html?id=${seasonId}">${seasonName(seasonId)}</a></td>
          <td>${playersUsedDisplay}</td>
          <td>${debutants}</td>
          <td>${lastOutings}</td>
        </tr>
      `;

      if (playersUsed.size > bestPlayersUsed) {
        bestPlayersUsed = playersUsed.size;
      }

      seasonsShown++;
    });

    if (!seasonsShown) {
      table.innerHTML = `<tr><td colspan="4">No season records found.</td></tr>`;
    }

    if (countEl) {
      countEl.textContent = `${seasonsShown} season${seasonsShown === 1 ? "" : "s"} shown (${includeFriendlies ? "all matches" : "competitive matches"})`;
    }
  }

  if (includeFriendliesBox) {
    includeFriendliesBox.addEventListener("change", render);
  }

  render();

}).catch(err => {
  console.error(err);

  const table = document.getElementById("playersUsedTable");
  const countEl = document.getElementById("playersUsedCount");

  if (countEl) countEl.textContent = "Error loading players used";
  if (table) table.innerHTML = `<tr><td colspan="4">Error loading data: ${err.message}</td></tr>`;
});
