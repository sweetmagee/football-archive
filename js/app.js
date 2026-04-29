let players = [];
let appearances = [];
let matches = [];

let sortColumn = "default";
let sortAsc = true;

Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json())
]).then(([playerData, appearanceData, matchData]) => {
  players = playerData;
  appearances = appearanceData;
  matches = matchData;

  render(getFilteredPlayers());
  attachSortHandlers();
  updateSortHeaders();
}).catch(err => {
  console.error(err);
  const table = document.getElementById("playerTable");
  const countEl = document.getElementById("playerCount");

  if (countEl) countEl.textContent = "Error loading players";
  if (table) table.innerHTML = `<tr><td colspan="4">Error loading data: ${err.message}</td></tr>`;
});

function includeFriendlies() {
  const box = document.getElementById("includeFriendlies");
  return box ? box.checked : false;
}

function isCountableMatch(match) {
  return (
    match &&
    String(match.abandoned || "").trim().toUpperCase() !== "Y" &&
    match.home_score !== "?" &&
    match.away_score !== "?" &&
    !Number.isNaN(Number(match.home_score)) &&
    !Number.isNaN(Number(match.away_score))
  );
}

function isFriendly(match) {
  const comp = String(match.competition || "").trim().toLowerCase();
  return comp === "friendly" || comp === "fr" || comp === "friendlies";
}

function positionLabel(shirt) {
  const map = {
    1: "Goalkeeper",
    2: "Right-back",
    3: "Left-back",
    4: "Right-half",
    5: "Centre-half",
    6: "Left-half",
    7: "Outside-right",
    8: "Inside-right",
    9: "Centre-forward",
    10: "Inside-left",
    11: "Outside-left"
  };

  return map[Number(shirt)] || "Unknown";
}

function primaryPositionForPlayer(playerId) {
  const counts = {};

  appearances.forEach(a => {
    if (String(a.player_id).trim() !== String(playerId).trim()) return;

    const match = matches.find(m =>
      String(m.id).trim() === String(a.match_id).trim()
    );

    if (!isCountableMatch(match)) return;

    const pos = positionLabel(a.shirt_number);
    counts[pos] = (counts[pos] || 0) + 1;
  });

  const rows = Object.entries(counts)
    .map(([position, count]) => ({ position, count }))
    .sort((a, b) =>
      b.count - a.count ||
      a.position.localeCompare(b.position)
    );

  return rows.length ? rows[0].position : "";
}

function positionSortRank(position) {
  const order = [
    "Goalkeeper",
    "Right-back",
    "Left-back",
    "Centre-half",
    "Right-half",
    "Left-half",
    "Outside-right",
    "Inside-right",
    "Centre-forward",
    "Inside-left",
    "Outside-left"
  ];

  const index = order.indexOf(String(position || "").trim());
  return index === -1 ? order.length : index;
}

function getPlayerStats(playerId) {
  const showAll = includeFriendlies();

  const pa = appearances.filter(a => {
    if (String(a.player_id).trim() !== String(playerId).trim()) return false;

    const match = matches.find(m =>
      String(m.id).trim() === String(a.match_id).trim()
    );

    if (!isCountableMatch(match)) return false;
    if (!showAll && isFriendly(match)) return false;

    return true;
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

function specialPlayerSortInfo(name) {
  const value = String(name || "").trim();
  const match = value.match(/^(Trialist|Unknown)(?:\s*#?\s*(\d+))?$/i);

  if (!match) {
    return {
      isSpecial: false,
      typeRank: 0,
      number: 0
    };
  }

  const type = match[1].toLowerCase();
  const number = match[2] ? Number(match[2]) : 0;

  return {
    isSpecial: true,
    typeRank: type === "trialist" ? 1 : 2,
    number
  };
}

function compareSpecialPlayers(a, b) {
  const sa = specialPlayerSortInfo(a.name);
  const sb = specialPlayerSortInfo(b.name);

  if (sa.isSpecial && !sb.isSpecial) return 1;
  if (!sa.isSpecial && sb.isSpecial) return -1;

  if (sa.isSpecial && sb.isSpecial) {
    return (
      sa.typeRank - sb.typeRank ||
      sa.number - sb.number ||
      String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true })
    );
  }

  return 0;
}

function enrichPlayers(list) {
  return list.map(p => {
    const stats = getPlayerStats(p.id);
    const nameParts = splitName(p.name);

    return {
      id: p.id,
      name: p.name || "",
      position: primaryPositionForPlayer(p.id) || p.position || "",
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
  }).filter(p => p.apps > 0);
}

function compare(a, b) {
  const specialResult = compareSpecialPlayers(a, b);
  if (specialResult !== 0) return specialResult;

  let result = 0;

  if (sortColumn === "default" || sortColumn === "name") {
    result =
      String(a.lastName || "").localeCompare(String(b.lastName || "")) ||
      String(a.firstName || "").localeCompare(String(b.firstName || "")) ||
      b.apps - a.apps;
  }

  if (sortColumn === "position") {
    result =
      positionSortRank(a.position) - positionSortRank(b.position) ||
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

  const rows = enrichPlayers(list).sort(compare);
  el.innerHTML = "";

  if (countEl) {
    const mode = includeFriendlies() ? "all matches" : "competitive matches";
    countEl.textContent = `${rows.length} players shown (${mode})`;
  }

  if (rows.length === 0) {
    el.innerHTML = `<tr><td colspan="4">No players found.</td></tr>`;
    return;
  }

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
    String(p.position || "").toLowerCase().includes(q) ||
    String(primaryPositionForPlayer(p.id) || "").toLowerCase().includes(q)
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
    { id: "sort-position", key: "position", label: "Primary Position" },
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
  const friendlies = document.getElementById("includeFriendlies");

  if (sortName) sortName.onclick = () => setSort("name");
  if (sortPosition) sortPosition.onclick = () => setSort("position");
  if (sortApps) sortApps.onclick = () => setSort("apps");
  if (sortGoals) sortGoals.onclick = () => setSort("goals");

  if (search) {
    search.addEventListener("input", () => {
      render(getFilteredPlayers());
    });
  }

  if (friendlies) {
    friendlies.addEventListener("change", () => {
      render(getFilteredPlayers());
    });
  }
}