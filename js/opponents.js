fetch("data/teams.json")
  .then(r => r.json())
  .then(teams => {
    const el = document.getElementById("opponentsList");

    const opponents = teams
      .filter(t => String(t.id).trim() !== "t1")
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

    if (!opponents.length) {
      el.innerHTML = "<p>No opponents found.</p>";
      return;
    }

    el.innerHTML = `
      <table class="archive-table">
        <thead>
          <tr>
            <th>Opponent</th>
          </tr>
        </thead>
        <tbody>
          ${opponents.map(team => `
            <tr>
              <td class="team-col">
                <span class="team-inline">
                  <img class="team-badge-small"
                       src="images/teams/${team.id}.png"
                       alt=""
                       onerror="this.style.display='none'">
                  <a href="team.html?id=${team.id}">${team.name}</a>
                </span>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  })
  .catch(err => {
    document.getElementById("opponentsList").innerHTML =
      `<p>Error loading opponents: ${err.message}</p>`;
    console.error(err);
  });