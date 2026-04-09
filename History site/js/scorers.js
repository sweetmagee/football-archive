const scorers = getTopScorers(appearances, seasonMatches);

Object.entries(scorers)
  .sort((a,b) => b[1] - a[1])
  .slice(0,10)
  .forEach(([playerId, goals]) => {

    const player = players.find(p => p.id === playerId);

    const div = document.createElement("div");
    div.innerHTML = `
      <a href="player.html?id=${player.id}">
        ${player.name}
      </a> - ${goals}
    `;

    document.getElementById("scorers").appendChild(div);
  });
