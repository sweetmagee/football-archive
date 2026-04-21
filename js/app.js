function render(list) {
  const el = document.getElementById("playerTable");
  const countEl = document.getElementById("playerCount");

  if (!el) return;

  el.innerHTML = "";

  const totalPlayers = players.length;
  const visiblePlayers = list ? list.length : 0;

  if (countEl) {
    if (visiblePlayers === totalPlayers) {
      countEl.textContent =
        totalPlayers === 1 ? "1 player shown" : `${totalPlayers} players shown`;
    } else {
      countEl.textContent =
        visiblePlayers === 1
          ? `1 of ${totalPlayers} players shown`
          : `${visiblePlayers} of ${totalPlayers} players shown`;
    }
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
        <td>${p.position || ""}</td>
        <td>${p.apps}</td>
        <td>${p.goalsCalc}</td>
      </tr>
    `;
  });
}