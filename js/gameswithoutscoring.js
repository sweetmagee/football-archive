Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json())
]).then(([players, appearances, matches]) => {
  const consecutiveTable = document.getElementById("consecutiveTable");
  const overallTable = document.getElementById("overallTable");
  const runCount = document.getElementById("runCount");
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
    const d = parseDate(match.date);
    const time = d ? d.getTime() : 0;
    const index = matches.findIndex(m => normalise(m.id) === normalise(match.id));
    return time + (index / 100000);
  }

  function playerName(playerId) {
    const player = players.find(p => normalise(p.id) === normalise(playerId));
    return player ? player.name : playerId;
  }

  function matchLabel(match) {
    if (!match) return "";
    return `${match.date || ""}`;
  }

  function playerRows(playerId, includeFriendlies) {
    return appearances
      .filter(app => normalise(app.player_id) === normalise(playerId))
      .map(app => ({
        app,
        match: matches.find(m => normalise(m.id) === normalise(app.match_id))
      }))
      .filter(row => row.match && isCountableMatch(row.match))
      .filter(row => includeFriendlies || !isFriendly(row.match))
      .sort((a, b) => matchSortValue(a.match) - matchSortValue(b.match));
  }

  function isGoalkeeperByAppearances(rows) {
    const counts = {};

    rows.forEach(row => {
      const shirt = Number(row.app.shirt_number || 0);
      counts[shirt] = (counts[shirt] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .map(([shirt, count]) => ({ shirt: Number(shirt), count }))
      .sort((a, b) => b.count - a.count || a.shirt - b.shirt);

    return sorted.length > 0 && sorted[0].shirt === 1;
  }

  function bestRunWithoutScoring(rows) {
    let best = { length: 0, from: null, to: null };
    let current = { length: 0, from: null, to: null };

    rows.forEach(row => {
      const goals = Number(row.app.goals || 0);

      if (goals === 0) {
        if (current.length === 0) current.from = row.match;
        current.length += 1;
        current.to = row.match;

        if (current.length > best.length) {
          best = { ...current };
        }
      } else {
        current = { length: 0, from: null, to: null };
      }
    });

    return best;
  }

  function render() {
    const includeFriendlies = includeFriendliesBox ? includeFriendliesBox.checked : false;

    const rows = players.map(player => {
      const playerId = normalise(player.id);
      const records = playerRows(playerId, includeFriendlies);
      const apps = records.length;
      const goals = records.reduce((sum, row) => sum + Number(row.app.goals || 0), 0);
      const run = bestRunWithoutScoring(records);

      return {
        playerId,
        name: player.name || playerId,
        apps,
        goals,
        run
      };
    }).filter(row => {
      if (row.apps <= 0) return false;

      const records = playerRows(row.playerId, includeFriendlies);
      const isGoalkeeper = isGoalkeeperByAppearances(records);

      return !isGoalkeeper || row.goals > 0;
    });

    const consecutiveRows = rows
      .filter(row => row.run.length > 0)
      .sort((a, b) =>
        b.run.length - a.run.length ||
        b.apps - a.apps ||
        a.name.localeCompare(b.name)
      );

    const overallRows = rows
      .filter(row => row.goals === 0)
      .sort((a, b) =>
        b.apps - a.apps ||
        a.name.localeCompare(b.name)
      );

    consecutiveTable.innerHTML = "";
    overallTable.innerHTML = "";

    if (!consecutiveRows.length) {
      consecutiveTable.innerHTML = `<tr><td colspan="4">No records found.</td></tr>`;
    } else {
      consecutiveRows.forEach(row => {
        consecutiveTable.innerHTML += `
          <tr>
            <td><a href="player.html?id=${row.playerId}">${row.name}</a></td>
            <td>${row.run.length}</td>
            <td>${matchLabel(row.run.from)}</td>
            <td>${matchLabel(row.run.to)}</td>
          </tr>
        `;
      });
    }

    if (!overallRows.length) {
      overallTable.innerHTML = `<tr><td colspan="4">No players found.</td></tr>`;
    } else {
      overallRows.forEach(row => {
        overallTable.innerHTML += `
          <tr>
            <td><a href="player.html?id=${row.playerId}">${row.name}</a></td>
            <td>${row.apps}</td>
            <td>${row.apps}</td>
            <td>${row.goals}</td>
          </tr>
        `;
      });
    }

    if (runCount) {
      runCount.textContent =
        `${rows.length} players shown (${includeFriendlies ? "all matches" : "competitive matches"})`;
    }
  }

  if (includeFriendliesBox) {
    includeFriendliesBox.addEventListener("change", render);
  }

  render();

}).catch(err => {
  console.error(err);

  const consecutiveTable = document.getElementById("consecutiveTable");
  const overallTable = document.getElementById("overallTable");
  const runCount = document.getElementById("runCount");

  if (runCount) runCount.textContent = "Error loading games without scoring";
  if (consecutiveTable) consecutiveTable.innerHTML = `<tr><td colspan="4">Error loading data: ${err.message}</td></tr>`;
  if (overallTable) overallTable.innerHTML = `<tr><td colspan="4">Error loading data: ${err.message}</td></tr>`;
});
