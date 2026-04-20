let players = [];
let teams = [];
let appearances = [];

Promise.all([
  fetch("data/players.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading players.json`);
    return r.json();
  }),
  fetch("data/teams.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading teams.json`);
    return r.json();
  }),
  fetch("data/appearances.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading appearances.json`);
    return r.json();
  })
]).then(([playerData, teamData, appearanceData]) => {
  players = playerData;
  teams = teamData;
  appearances = appearanceData;
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

function teamBadgeHtml(teamId, sizeClass = "team-badge-small") {
  return `<img class="${sizeClass}" src="images/teams/${teamId}.png" alt="" onerror="this.style.display='none'">`;
}

function getPlayerStats(playerId) {
  const pa = appearances.filter(a => String(a.player_id).trim() === String(playerId).trim());

  const starts = pa.filter(a => Number(a.is_starting) === 1).length;
  const subs = pa.filter(a => Number(a.is_starting) !== 1).length;
  const goals = pa.reduce((sum, a) => sum + Number(a.goals || 0), 0);

  return {
    starts,
    subs,
    goals,
    appsDisplay: subs > 0 ? `${starts}+${subs}` : `${starts}`
  };
}

function render(list) {
  const el = document.getElementById("playerTable");
  if (!el) return;

  el.innerHTML = "";

  if (!list || list.length === 0) {
    el.innerHTML = `<tr><td colspan="5">No players found.</td></tr>`;
    return;
  }

  const sorted = [...list].sort((a, b) => {
  const sa = getPlayerStats(a.id);
  const sb = getPlayerStats(b.id);

  return (
    sb.starts - sa.starts ||
    sb.subs - sa.subs ||
    sb.goals - sa.goals ||
    String(a.name || "").localeCompare(String(b.name || ""))
  );
});

  sorted.forEach(p => {
    const stats = getPlayerStats(p.id);

    el.innerHTML += `
      <tr>
        <td>
          <a href="player.html?id=${p.id}">${p.name}</a>
        </td>
        <td>${p.position || ""}</td>
        <td>
          <span class="team-inline">
            ${teamBadgeHtml(p.team || "")}
            <a href="team.html?id=${p.team}">${getTeamName(p.team || "")}</a>
          </span>
        </td>
        <td>${stats.appsDisplay}</td>
        <td>${stats.goals}</td>
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