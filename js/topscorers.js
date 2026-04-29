Promise.all([
  fetch("data/seasons.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/players.json").then(r => r.json())
]).then(([seasons, matches, appearances, players]) => {
  const table = document.getElementById("topScorersTable");
  const countEl = document.getElementById("topScorersCount");
  const includeFriendliesBox = document.getElementById("includeFriendlies");

  function normalise(value) {
    return String(value || "").trim();
  }

  function isAbandoned(match) {
    return normalise(match.abandoned).toUpperCase() === "Y";
  }

  function hasUnknownResult(match) {
    return (
      match.home_score === "?" ||
      match.away_score === "?" ||
      Number.isNaN(Number(match.home_score)) ||
      Number.isNaN(Number(match.away_score))
    );
  }

  function isCountableMatch(match) {
    return match && !isAbandoned(match) && !hasUnknownResult(match);
  }

  function isFriendly(match) {
    const comp = normalise(match.competition).toLowerCase();
    return comp === "friendly" || comp === "friendlies" || comp === "fr" || comp.includes("friendly");
  }

  function playerName(playerId) {
    const player = players.find(p => normalise(p.id) === normalise(playerId));
    return player ? player.name : playerId;
  }

  function seasonName(seasonId) {
    const season = seasons.find(s => normalise(s.id) === normalise(seasonId));
    return season ? season.name : seasonId;
  }

  function parseSeasonSortValue(season) {
    const startYear = Number(season.start_year);
    if (!Number.isNaN(startYear)) return startYear;

    const name = normalise(season.name || season.id);
    const match = name.match(/(\d{4})/);
    if (match) return Number(match[1]);

    return 999999;
  }

  function goldStarWrap(value) {
    return `<span class="gold-star">★</span>${value}<span class="gold-star">★</span>`;
  }

  function render() {
    const includeFriendlies = includeFriendliesBox ? includeFriendliesBox.checked : false;

    table.innerHTML = "";

    const orderedSeasons = [...seasons].sort((a, b) =>
      parseSeasonSortValue(a) - parseSeasonSortValue(b) ||
      normalise(a.name || a.id).localeCompare(normalise(b.name || b.id))
    );

    let allTimeBestBefore = 0;
    let seasonsShown = 0;

    orderedSeasons.forEach(season => {
      const seasonId = normalise(season.id);

      const seasonMatches = matches.filter(match => {
        if (normalise(match.season_id) !== seasonId) return false;
        if (!isCountableMatch(match)) return false;
        if (!includeFriendlies && isFriendly(match)) return false;
        return true;
      });

      const matchIds = new Set(seasonMatches.map(match => normalise(match.id)));
      if (matchIds.size === 0) return;

      const playerMap = {};

      appearances.forEach(app => {
        const matchId = normalise(app.match_id);
        if (!matchIds.has(matchId)) return;
        if (normalise(app.team) !== "t1") return;

        const playerId = normalise(app.player_id);
        const goals = Number(app.goals || 0);

        if (!playerMap[playerId]) {
          playerMap[playerId] = {
            playerId,
            name: playerName(playerId),
            goals: 0,
            apps: 0,
            gamesScoredIn: 0
          };
        }

        playerMap[playerId].apps += 1;
        playerMap[playerId].goals += goals;

        if (goals > 0) {
          playerMap[playerId].gamesScoredIn += 1;
        }
      });

      const rows = Object.values(playerMap)
        .filter(row => row.goals > 0)
        .sort((a, b) =>
          b.goals - a.goals ||
          b.gamesScoredIn - a.gamesScoredIn ||
          a.name.localeCompare(b.name)
        );

      if (!rows.length) return;

      // One top goalscorer per season only. Ties are broken by:
      // 1) most games scored in, 2) best percentage of their own appearances scored in, 3) name.
      const row = rows[0];
      const pct = row.apps ? Math.round((row.gamesScoredIn / row.apps) * 100) : 0;

      const isNewRecord = row.goals > allTimeBestBefore;
      const goalsDisplay = isNewRecord ? goldStarWrap(row.goals) : row.goals;

      table.innerHTML += `
        <tr>
          <td><a href="season.html?id=${seasonId}">${seasonName(seasonId)}</a></td>
          <td><a href="player.html?id=${row.playerId}">${row.name}</a></td>
          <td>${goalsDisplay}</td>
          <td>${pct}%</td>
        </tr>
      `;

      seasonsShown++;

      if (row.goals > allTimeBestBefore) {
        allTimeBestBefore = row.goals;
      }
    });

    if (countEl) {
      countEl.textContent = `${seasonsShown} season${seasonsShown === 1 ? "" : "s"} shown (${includeFriendlies ? "all matches" : "competitive matches"})`;
    }

    if (!seasonsShown) {
      table.innerHTML = `<tr><td colspan="4">No top scorer records found.</td></tr>`;
    }
  }

  if (includeFriendliesBox) {
    includeFriendliesBox.addEventListener("change", render);
  }

  render();

}).catch(err => {
  console.error(err);
  const table = document.getElementById("topScorersTable");
  const countEl = document.getElementById("topScorersCount");

  if (countEl) countEl.textContent = "Error loading top scorers";
  if (table) table.innerHTML = `<tr><td colspan="4">Error loading data: ${err.message}</td></tr>`;
});
