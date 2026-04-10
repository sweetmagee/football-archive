let players = [];

fetch("data/players.json")
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading players.json`);
    return r.json();
  })
  .then(data => {
    players = data;
    render(players);
  })
  .catch(err => {
    console.error(err);
    const table = document.getElementById("playerTable");
    if (table) {
      table.innerHTML = `<tr><td colspan="4">Error loading players: ${err.message}</td></tr>`;
    }
  });

function render(list) {
  const el = document.getElementById("playerTable");
  if (!el) return;

  el.innerHTML = "";

  if (!list || list.length === 0) {
    el.innerHTML = `<tr><td colspan="4">No players found.</td></tr>`;
    return;
  }

  list.forEach(p => {
    el.innerHTML += `
      <tr>
        <td><a href="player.html?id=${p.id}">${p.name}</a></td>
        <td>${p.position || ""}</td>
        <td>${p.apps ?? ""}</td>
        <td>${p.goals ?? ""}</td>
      </tr>
    `;
  });
}

document.getElementById("search").addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();
  const filtered = players.filter(p =>
    String(p.name || "").toLowerCase().includes(q)
  );
  render(filtered);
});