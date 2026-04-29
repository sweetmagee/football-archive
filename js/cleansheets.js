Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json())
]).then(([players, appearances, matches]) => {
  const table = document.getElementById("cleanSheetsTable");
  const countEl = document.getElementById("cleanSheetsCount");
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

  function playerName(playerId) {
    const player = players.find(p => normalise(p.id) === normalise(playerId));
    return player ? player.name : playerId;
  }

  function goldStarWrap(value) {
    return `<span class="gold-star">★</span>${value}<span class="gold-star">★</span>`;
  }

  function getMatch(matchId) {
    return matches.find(m => normalise(m.id) === normalise(matchId));
  }

  function margateGoalsAgainst(match) {
    if (normalise(match.home_team) === "t1") return Number(match.away_score);
    if (normalise(match.away_team) === "t1") return Number(match.home_score);
    return null;
  }

  function goalkeeperRows(includeFriendlies) {
    return appearances
      .filter(app => normalise(app.team) === "t1")
      .filter(app => Number(app.shirt_number || 0) === 1)
      .map(app => ({
        app,
        match: getMatch(app.match_id)
      }))
      .filter(row => row.match && isCountableMatch(row.match))
      .filter(row => includeFriendlies || !isFriendly(row.match))
      .sort((a, b) => matchSortValue(a.match) - matchSortValue(b.match));
  }

  function longestCleanSheetRun(rows) {
    let best = 0;
    let current = 0;

    rows.forEach(row => {
      const goalsAgainst = margateGoalsAgainst(row.match);

      if (goalsAgainst === 0) {
        current++;
        if (current > best) best = current;
      } else {
        current = 0;
      }
    });

    return best;
  }

  function mostSeasonCleanSheets(rows) {
    const seasonMap = {};

    rows.forEach(row => {
      if (margateGoalsAgainst(row.match) !== 0) return;

      const seasonId = normalise(row.match.season_id) || "unknown";
      seasonMap[seasonId] = (seasonMap[seasonId] || 0) + 1;
    });

    return Object.values(seasonMap).reduce((best, value) => Math.max(best, value), 0);
  }

  function render() {
    const includeFriendlies = includeFriendliesBox ? includeFriendliesBox.checked : false;
    const rows = goalkeeperRows(includeFriendlies);
    const map = {};

    rows.forEach(row => {
      const playerId = normalise(row.app.player_id);

      if (!map[playerId]) {
        map[playerId] = {
          playerId,
          name: playerName(playerId),
          rows: [],
          matches: 0,
          cleanSheets: 0
        };
      }

      map[playerId].rows.push(row);
      map[playerId].matches++;

      if (margateGoalsAgainst(row.match) === 0) {
        map[playerId].cleanSheets++;
      }
    });

    const outputRows = Object.values(map)
      .map(row => ({
        ...row,
        longestRun: longestCleanSheetRun(row.rows),
        mostSeasonCleanSheets: mostSeasonCleanSheets(row.rows),
        pct: row.matches ? Math.round((row.cleanSheets / row.matches) * 100) : 0
      }))
      .filter(row => row.matches > 0)
      .sort((a, b) =>
        b.cleanSheets - a.cleanSheets ||
        b.longestRun - a.longestRun ||
        b.pct - a.pct ||
        b.matches - a.matches ||
        a.name.localeCompare(b.name)
      );

    table.innerHTML = "";

    if (!outputRows.length) {
      table.innerHTML = `<tr><td colspan="6">No goalkeeper records found.</td></tr>`;
    } else {
      let bestCleanSheets = 0;
      let bestLongestRun = 0;
      let bestMostSeasonCleanSheets = 0;

      outputRows.forEach(row => {
        const cleanSheetsDisplay = row.cleanSheets > bestCleanSheets
          ? goldStarWrap(row.cleanSheets)
          : row.cleanSheets;

        const longestRunDisplay = row.longestRun > bestLongestRun
          ? goldStarWrap(row.longestRun)
          : row.longestRun;

        const mostSeasonDisplay = row.mostSeasonCleanSheets > bestMostSeasonCleanSheets
          ? goldStarWrap(row.mostSeasonCleanSheets)
          : row.mostSeasonCleanSheets;

        table.innerHTML += `
          <tr>
            <td><a href="player.html?id=${row.playerId}">${row.name}</a></td>
            <td>${cleanSheetsDisplay}</td>
            <td>${longestRunDisplay}</td>
            <td>${mostSeasonDisplay}</td>
            <td>${row.matches}</td>
            <td>${row.pct}%</td>
          </tr>
        `;

        if (row.cleanSheets > bestCleanSheets) bestCleanSheets = row.cleanSheets;
        if (row.longestRun > bestLongestRun) bestLongestRun = row.longestRun;
        if (row.mostSeasonCleanSheets > bestMostSeasonCleanSheets) {
          bestMostSeasonCleanSheets = row.mostSeasonCleanSheets;
        }
      });
    }

    if (countEl) {
      countEl.textContent =
        `${outputRows.length} goalkeeper${outputRows.length === 1 ? "" : "s"} shown (${includeFriendlies ? "all matches" : "competitive matches"})`;
    }
  }

  if (includeFriendliesBox) {
    includeFriendliesBox.addEventListener("change", render);
  }

  render();

}).catch(err => {
  console.error(err);

  const table = document.getElementById("cleanSheetsTable");
  const countEl = document.getElementById("cleanSheetsCount");

  if (countEl) countEl.textContent = "Error loading clean sheets";
  if (table) table.innerHTML = `<tr><td colspan="6">Error loading data: ${err.message}</td></tr>`;
});
