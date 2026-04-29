Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json())
]).then(([players, appearances, matches]) => {
  const table = document.getElementById("positionPlayedTable");
  const countEl = document.getElementById("positionPlayedCount");

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

  function buildRows() {
    const playerTotals = {};
    const positionTotals = {};

    appearances.forEach(app => {
      if (normalise(app.team) !== "t1") return;

      const match = getMatch(app.match_id);
      if (!isCountableMatch(match)) return;

      const playerId = normalise(app.player_id);
      const shirt = Number(app.shirt_number || 0);

      if (!playerTotals[playerId]) playerTotals[playerId] = 0;
      playerTotals[playerId] += 1;

      if (!positionTotals[shirt]) positionTotals[shirt] = {};
      if (!positionTotals[shirt][playerId]) positionTotals[shirt][playerId] = 0;
      positionTotals[shirt][playerId] += 1;
    });

    return positions.map(position => {
      const playersForPosition = Object.entries(positionTotals[position.shirt] || {})
        .map(([playerId, apps]) => ({
          playerId,
          name: playerName(playerId),
          apps,
          totalApps: playerTotals[playerId] || 0,
          pct: playerTotals[playerId] ? Math.round((apps / playerTotals[playerId]) * 100) : 0
        }))
        .sort((a, b) =>
          b.apps - a.apps ||
          b.pct - a.pct ||
          a.name.localeCompare(b.name)
        );

      return {
        position,
        leader: playersForPosition[0] || null
      };
    });
  }

  function render() {
    const rows = buildRows();
    table.innerHTML = "";

    rows.forEach(row => {
      if (!row.leader) {
        table.innerHTML += `
          <tr>
            <td>${row.position.shirt} ${row.position.name}</td>
            <td>No appearances recorded</td>
            <td>0</td>
            <td>0%</td>
          </tr>
        `;
        return;
      }

      table.innerHTML += `
        <tr>
          <td>${row.position.shirt} ${row.position.name}</td>
          <td><a href="player.html?id=${row.leader.playerId}">${row.leader.name}</a></td>
          <td>${row.leader.apps}</td>
          <td>${row.leader.pct}%</td>
        </tr>
      `;
    });

    if (countEl) {
      countEl.textContent = `${positions.length} positions shown`;
    }
  }

  render();

}).catch(err => {
  console.error(err);

  const table = document.getElementById("positionPlayedTable");
  const countEl = document.getElementById("positionPlayedCount");

  if (countEl) countEl.textContent = "Error loading position played";
  if (table) table.innerHTML = `<tr><td colspan="4">Error loading data: ${err.message}</td></tr>`;
});
