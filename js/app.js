let players = [];
let teams = [];

Promise.all([
  fetch("data/players.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading players.json`);
    return r.json();
  }),
  fetch("data/teams.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading teams.json`);
    return r.json();
  })
]).then(([playerData, teamData]) => {
  players = playerData;
  teams = teamData;
  render(players);
}).catch(err => {
  console.error(err);
  const table = document.getElementById("playerTable");
  if (table) {
    table.innerHTML = `<tr><td colspan="5">Error loading data: ${err.message}</td></tr>`;
  }
});

function getTeamName(teamId) {
  const team = teams.find(t => String(t.id).trim() === String(teamId).trim());
  return team ? team.name : teamId;
}

function render(list) {
  const el = document.getElementById("playerTable");
  if (!el) return;

  el.innerHTML = "";

  if (!list || list.length === 0) {
    el.innerHTML = `<tr><td colspan="5">No players found.</td></tr>`;
    return;
  }

  const sorted = [...list].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );

  sorted.forEach(p => {
    el.innerHTML += `
      <tr>
        <td>
          <a href="player.html?id=${p.id}">${p.name}</a>
        </td>
        <td>${p.position || ""}</td>
        <td><a href="team.html?id=${p.team}">${getTeamName(p.team || "")}</a></td>
        <td>${p.apps ?? ""}</td>
        <td>${p.goals ?? ""}</td>
      </tr>
    `;
  });
}

document.getElementById("search").addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();

  const filtered = players.filter(p =>
    String(p.name || "").toLowerCase().includes(q) ||
    String(p.position || "").toLowerCase().includes(q) ||
    String(getTeamName(p.team || "")).toLowerCase().includes(q)
  );

  render(filtered);
});