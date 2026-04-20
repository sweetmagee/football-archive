let players = [];
let appearances = [];

let sortColumn = "name";
let sortAsc = true;

Promise.all([
  fetch("data/players.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading players.json`);
    return r.json();
  }),
  fetch("data/appearances.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading appearances.json`);
    return r.json();
  })
]).then(([playerData, appearanceData]) => {
  players = playerData;
  appearances = appearanceData;
  render(players);
  attachSortHandlers();
}).catch(err => {
  console.error(err);
  const table = document.getElementById("playerTable");
  if (table) {
    table.innerHTML = `<tr><td colspan="4">Error loading data: ${err.message}</td></tr>`;
  }
});

function getPlayerStats(playerId) {
  const pa = appearances.filter(a => String(a.player_id).trim() === String(playerId).trim());

  const starts = pa.filter(a => Number(a.is_starting) === 1).length;
  const subs = pa.filter(a => Number(a.is_starting) !== 1).length;
  const goals = pa.reduce((sum, a) => sum + Number(a.goals || 0), 0);

  return {
    starts,
    subs,
    apps: starts + subs,
    goals
  };
}

function enrichPlayers(list) {
  return list.map(p => {
    const stats = getPlayerStats(p.id);

    return {
      ...p,
      starts: stats.starts,
      subs: stats.subs,
      apps: stats.apps,
      goalsCalc: stats.goals
    };
  });
}

function compare(a, b) {
  let result = 0;

  if (sortColumn === "name") {
    result = a.name.localeCompare(b.name);
  }

  if (sortColumn === "position") {
    result =
      String(a.position || "").localeCompare(String(b.position || "")) ||
      a.name.localeCompare(b.name);
  }

  if (sortColumn === "apps") {
    result =
      b.apps - a.apps ||
      b.starts - a.starts ||
      b.subs - a.subs ||
      a.name.localeCompare(b.name);
  }

  if (sortColumn === "goals") {
    result =
      b.goalsCalc - a.goalsCalc ||
      b.apps - a.apps ||
      a.name.localeCompare(b.name);
  }

  return sortAsc ? result : -result;
}

function render(list) {
  const el = document.getElementById("playerTable");
  if (!el) return;

  el.innerHTML = "";

  if (!list || list.length === 0) {
    el.innerHTML = `<tr><td colspan="4">No players found.</td></tr>`;
    return;
  }

  const rows = enrichPlayers(list).sort(compare);

  rows.forEach(p => {
    el.innerHTML += `
      <tr>
        <td><a href="player.html?id=${p.id}">${p.name}</a></td>
        <td>${p.position || ""}</td>
        <td>${p.apps}</td>
        <td>${p.goalsCalc}</td>
      </tr>
    `;
  });
}

function setSort(col) {
  if (sortColumn === col) {
    sortAsc = !sortAsc;
  } else {
    sortColumn = col;
    sortAsc = true;
  }

  const q = document.getElementById("search").value.toLowerCase().trim();

  const filtered = players.filter(p =>
    String(p.name || "").toLowerCase().includes(q) ||
    String(p.position || "").toLowerCase().includes(q)
  );

  render(filtered);
}

function attachSortHandlers() {
  document.getElementById("sort-name").onclick = () => setSort("name");
  document.getElementById("sort-position").onclick = () => setSort("position");
  document.getElementById("sort-apps").onclick = () => setSort("apps");
  document.getElementById("sort-goals").onclick = () => setSort("goals");
}

document.getElementById("search").addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();

  const filtered = players.filter(p =>
    String(p.name || "").toLowerCase().includes(q) ||
    String(p.position || "").toLowerCase().includes(q)
  );

  render(filtered);
});