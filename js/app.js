let players = [];
let appearances = [];

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
    goals,
    appsDisplay: subs > 0 ? `${starts}+${subs}` : `${starts}`
  };
}

function sortByStartsThenSubsThenGoalsThenName(a, b) {
  return (
    b.starts - a.starts ||
    b.subs - a.subs ||
    b.goals - a.goals ||
    a.name.localeCompare(b.name)
  );
}

function render(list) {
  const el = document.getElementById("playerTable");
  if (!el) return;

  el.innerHTML = "";

  if (!list || list.length === 0) {
    el.innerHTML = `<tr><td colspan="4">No players found.</td></tr>`;
    return;
  }

  const sorted = [...list]
    .map(p => {
      const stats = getPlayerStats(p.id);
      return {
        ...p,
        starts: stats.starts,
        subs: stats.subs,
        goalsCalc: stats.goals,
        appsDisplay: stats.appsDisplay
      };
    })
    .sort(sortByStartsThenSubsThenGoalsThenName);

  sorted.forEach(p => {
    el.innerHTML += `
      <tr>
        <td><a href="player.html?id=${p.id}">${p.name}</a></td>
        <td>${p.position || ""}</td>
        <td>${p.starts + p.subs}</td>
        <td>${p.goalsCalc}</td>
      </tr>
    `;
  });
}

document.getElementById("search").addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();

  const filtered = players.filter(p =>
    String(p.name || "").toLowerCase().includes(q) ||
    String(p.position || "").toLowerCase().includes(q)
  );

  render(filtered);
});