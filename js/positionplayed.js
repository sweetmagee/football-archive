Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json())
]).then(([players, appearances, matches]) => {
  const table = document.getElementById("positionPlayedTable");
  const countEl = document.getElementById("positionPlayedCount");
  const includeFriendliesBox = document.getElementById("includeFriendlies");
  const positionSelect = document.getElementById("positionSelect");
  const topTenTable = document.getElementById("topTenPositionTable");
  const topTenCount = document.getElementById("topTenCount");

  const positions = [
    { shirt: 1, name: "Goalkeeper" },
    { shirt: 2, name: "Right-back" },
    { shirt: 3, name: "Left-back" },
    { shirt: 4, name: "Right-half" },
    { shirt: 5, name: "Centre-half" },
    { shirt: 6, name: "Left-half" },
    { shirt: 7, name: "Outside-right" },
    { shirt: 8, name: "Inside-right" },
    { shirt: 9, name: "Centre-forward" },
    { shirt: 10, name: "Inside-left" },
    { shirt: 11, name: "Outside-left" }
  ];

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

  function playerName(playerId) {
    const player = players.find(p => normalise(p.id) === normalise(playerId));
    return player ? player.name : playerId;
  }

  function getMatch(matchId) {
    return matches.find(m => normalise(m.id) === normalise(matchId));
  }

  function positionName(shirt) {
    const position = positions.find(p => Number(p.shirt) === Number(shirt));
    return position ? position.name : "Unknown";
  }

  function buildPositionData(includeFriendlies) {
    const playerTotals = {};
    const positionTotals = {};

    appearances.forEach(app => {
      if (normalise(app.team) !== "t1") return;

      const match = getMatch(app.match_id);
      if (!isCountableMatch(match)) return;
      if (!includeFriendlies && isFriendly(match)) return;

      const playerId = normalise(app.player_id);
      const shirt = Number(app.shirt_number || 0);

      playerTotals[playerId] = (playerTotals[playerId] || 0) + 1;

      if (!positionTotals[shirt]) positionTotals[shirt] = {};
      positionTotals[shirt][playerId] = (positionTotals[shirt][playerId] || 0) + 1;
    });

    return { playerTotals, positionTotals };
  }

  function getPlayersForPosition(shirt, data) {
    const positionRows = Object.entries(data.positionTotals[shirt] || {})
      .map(([playerId, apps]) => ({
        playerId,
        name: playerName(playerId),
        apps,
        totalApps: data.playerTotals[playerId] || 0,
        pct: data.playerTotals[playerId] ? Math.round((apps / data.playerTotals[playerId]) * 100) : 0
      }))
      .sort((a, b) =>
        b.apps - a.apps ||
        b.pct - a.pct ||
        a.name.localeCompare(b.name)
      );

    return positionRows;
  }

  function addRanks(rows) {
    let lastApps = null;
    let lastRank = 0;

    return rows.map((row, index) => {
      if (row.apps !== lastApps) {
        lastRank = index + 1;
        lastApps = row.apps;
      }

      return { ...row, rank: lastRank };
    });
  }

  function renderMainTable(data, includeFriendlies) {
    table.innerHTML = "";

    positions.forEach(position => {
      const leader = getPlayersForPosition(position.shirt, data)[0] || null;

      if (!leader) {
        table.innerHTML += `
          <tr>
            <td>${position.shirt} ${position.name}</td>
            <td>No appearances recorded</td>
            <td>0</td>
            <td>0%</td>
          </tr>
        `;
        return;
      }

      table.innerHTML += `
        <tr>
          <td>${position.shirt} ${position.name}</td>
          <td><a href="player.html?id=${leader.playerId}">${leader.name}</a></td>
          <td>${leader.apps}</td>
          <td>${leader.pct}%</td>
        </tr>
      `;
    });

    if (countEl) {
      countEl.textContent = `${positions.length} positions shown (${includeFriendlies ? "all matches" : "competitive matches"})`;
    }
  }

  function renderTopTen(data, includeFriendlies) {
    if (!positionSelect || !topTenTable) return;

    const shirt = Number(positionSelect.value || 1);
    const posName = positionName(shirt);
    const rows = addRanks(getPlayersForPosition(shirt, data)).slice(0, 10);

    topTenTable.innerHTML = "";

    if (!rows.length) {
      topTenTable.innerHTML = `<tr><td colspan="4">No appearances recorded for this position.</td></tr>`;
    } else {
      rows.forEach(row => {
        topTenTable.innerHTML += `
          <tr>
            <td>${row.rank}</td>
            <td><a href="player.html?id=${row.playerId}">${row.name}</a></td>
            <td>${row.apps}</td>
            <td>${row.pct}%</td>
          </tr>
        `;
      });
    }

    if (topTenCount) {
      topTenCount.textContent = `Top ${rows.length} for ${posName} (${includeFriendlies ? "all matches" : "competitive matches"})`;
    }
  }

  function render() {
    const includeFriendlies = includeFriendliesBox ? includeFriendliesBox.checked : false;
    const data = buildPositionData(includeFriendlies);

    renderMainTable(data, includeFriendlies);
    renderTopTen(data, includeFriendlies);
  }

  if (includeFriendliesBox) {
    includeFriendliesBox.addEventListener("change", render);
  }

  if (positionSelect) {
    positionSelect.addEventListener("change", render);
  }

  render();

}).catch(err => {
  console.error(err);

  const table = document.getElementById("positionPlayedTable");
  const topTenTable = document.getElementById("topTenPositionTable");
  const countEl = document.getElementById("positionPlayedCount");
  const topTenCount = document.getElementById("topTenCount");

  if (countEl) countEl.textContent = "Error loading position played";
  if (topTenCount) topTenCount.textContent = "Error loading position played";
  if (table) table.innerHTML = `<tr><td colspan="4">Error loading data: ${err.message}</td></tr>`;
  if (topTenTable) topTenTable.innerHTML = `<tr><td colspan="4">Error loading data: ${err.message}</td></tr>`;
});
