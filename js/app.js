let players = [];
let appearances = [];
let matches = [];

let sortColumn = "default";
let sortAsc = true;

Promise.all([
  fetch("data/players.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading players.json`);
    return r.json();
  }),
  fetch("data/appearances.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading appearances.json`);
    return r.json();
  }),
  fetch("data/matches.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading matches.json`);
    return r.json();
  })
]).then(([playerData, appearanceData, matchData]) => {
  players = playerData;
  appearances = appearanceData;
  matches = matchData;

  render(players);
  attachSortHandlers();
  updateSortHeaders();
}).catch(err => {
  console.error(err);

  const table = document.getElementById("playerTable");
  const countEl = document.getElementById("playerCount");

  if (countEl) countEl.textContent = "Error loading players";

  if (table) {
    table.innerHTML = `<tr><td colspan="4">Error loading data: ${err.message}</td></tr>`;
  }
});

function isCountableMatch(match) {
  return (
    match &&
    match.home_score !== "?" &&
    match.away_score !== "?" &&
    !Number.isNaN(Number(match.home_score)) &&
    !Number.isNaN(Number(match.away_score))
  );
}

function getPlayerStats(playerId) {
  const pa = appearances.filter(a => {
    if (String(a.player_id).trim() !== String(playerId).trim()) return false;

    const match = matches.find(m =>
      String(m.id).trim() === String(a.match_id).trim()
    );

    return isCountableMatch(match);
  });

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

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: "", last: parts[0] };

  const last = parts.pop();
  const first = parts.join(" ");

  return { first, last };
}

function enrichPlayers(list) {
  return list.map(p => {
    const stats = getPlayerStats(p.id);
    const nameParts = splitName(p.name);

    return {
      id: p.id,
      name: p.name || "",
      position: p.position || "",
      team: p.team || "t1",
      photo: p.photo || "",
      date_added: p.date_added || "",
      starts: stats.starts,
      subs: stats.subs,
      apps: stats.apps,
      goalsCalc: stats.goals,
      firstName: p.firstname || nameParts.first,
      lastName: p.surname || nameParts.last
    };
  });
}

function compare(a, b) {
  let result = 0;

  if (sortColumn === "default" || sortColumn === "name") {
    result =
      String(a.lastName || "").localeCompare(String(b.lastName || "")) ||
      String(a.firstName || "").localeCompare(String(b.firstName || "")) ||
      b.apps - a.apps;
  }

  if (sortColumn === "position") {
    result =
      String(a.position || "").localeCompare(String(b.position || "")) ||
      String(a.lastName || "").localeCompare(String(b.lastName || "")) ||
      String(a.firstName || "").localeCompare(String(b.firstName || ""));
  }

  if (sortColumn === "apps") {
    result =
      b.apps - a.apps ||
      b.starts - a.starts ||
      b.subs - a.subs ||
      String(a.lastName || "").localeCompare(String(b.lastName || "")) ||
      String(a.firstName || "").localeCompare(String(b.firstName || ""));
  }

  if (sortColumn === "goals") {
    result =
      b.goalsCalc - a.goalsCalc ||
      b.apps - a.apps ||
      String(a.lastName || "").localeCompare(String(b.lastName || "")) ||
      String(a.firstName || "").localeCompare(String(b.firstName || ""));
  }

  return sortAsc ? result : -result;
}

function render(list) {
  const el = document.getElementById("playerTable");
  const countEl = document.getElementById("playerCount");

  if (!el) return;

  el.innerHTML = "";

  const totalPlayers = players.length;
  const visiblePlayers = list ? list.length : 0;

  if (countEl) {
    countEl.textContent =
      visiblePlayers === totalPlayers
        ? `${totalPlayers} players shown`
        : `${visiblePlayers} of ${totalPlayers} players shown`;
  }

  if (!list || list.length === 0) {
    el.innerHTML = `<tr><td colspan="4">No players found.</td></tr>`;
    return;
  }

  const rows = enrichPlayers(list).sort(compare);

  rows.forEach(p => {
    el.innerHTML += `
      <tr>
        <td><a href="player.html?id=${p.id}">${p.name}</a></td>
        <td>${p.position}</td>
        <td>${p.apps}</td>
        <td>${p.goalsCalc}</td>
      </tr>
    `;
  });
}

function getFilteredPlayers() {
  const searchEl = document.getElementById("search");
  const q = searchEl ? searchEl.value.toLowerCase().trim() : "";

  return players.filter(p =>
    String(p.name || "").toLowerCase().includes(q) ||
    String(p.firstname || "").toLowerCase().includes(q) ||
    String(p.surname || "").toLowerCase().includes(q) ||
    String(p.position || "").toLowerCase().includes(q)
  );
}

function setSort(col) {
  if (sortColumn === col) {
    sortAsc = !sortAsc;
  } else {
    sortColumn = col;
    sortAsc = true;
  }

  updateSortHeaders();
  render(getFilteredPlayers());
}

function updateSortHeaders() {
  const headers = [
    { id: "sort-name", key: "name", label: "Name" },
    { id: "sort-position", key: "position", label: "Position" },
    { id: "sort-apps", key: "apps", label: "Apps" },
    { id: "sort-goals", key: "goals", label: "Goals" }
  ];

  headers.forEach(h => {
    const el = document.getElementById(h.id);
    if (!el) return;

    if (sortColumn === h.key) {
      el.innerHTML = `${h.label} ${sortAsc ? "▲" : "▼"}`;
    } else {
      el.innerHTML = `${h.label} <span class="sort-muted">▲▼</span>`;
    }
  });
}

function attachSortHandlers() {
  const sortName = document.getElementById("sort-name");
  const sortPosition = document.getElementById("sort-position");
  const sortApps = document.getElementById("sort-apps");
  const sortGoals = document.getElementById("sort-goals");
  const search = document.getElementById("search");

  if (sortName) sortName.onclick = () => setSort("name");
  if (sortPosition) sortPosition.onclick = () => setSort("position");
  if (sortApps) sortApps.onclick = () => setSort("apps");
  if (sortGoals) sortGoals.onclick = () => setSort("goals");

  if (search) {
    search.addEventListener("input", () => {
      render(getFilteredPlayers());
    });
  }
}