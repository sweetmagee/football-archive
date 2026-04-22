const id = new URLSearchParams(window.location.search).get("id");

Promise.all([
  fetch("data/managers.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json())
]).then(([managers, matches, teams]) => {
  const manager = managers.find(m => String(m.id).trim() === String(id).trim());
  const el = document.getElementById("managerPage");

  if (!manager) {
    el.innerHTML = `<div class="content-box"><p>Manager not found.</p></div>`;
    return;
  }

  function parseDate(value) {
    if (!value) return null;
    const parts = String(value).split("/");
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return null;
  }

  function isCountableMatch(match) {
    return (
      match &&
      match.home_score !== "?" &&
      match.away_score !== "?" &&
      !Number.isNaN(Number(match.home_score)) &&
      !Number.isNaN(Number(match.away_score))
    );
  }

  function teamName(teamId) {
    const team = teams.find(t => String(t.id).trim() === String(teamId).trim());
    return team ? team.name : teamId;
  }

  const mgrMatches = matches.filter(m =>
    (
      String(m.home_manager_id || "").trim() === String(manager.id).trim() ||
      String(m.away_manager_id || "").trim() === String(manager.id).trim()
    ) &&
    isCountableMatch(m)
  );

  const sortedMatches = [...mgrMatches].sort((a, b) => parseDate(a.date) - parseDate(b.date));

  let played = 0;
  let won = 0;
  let drawn = 0;
  let lost = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  sortedMatches.forEach(m => {
    const isHomeManager = String(m.home_manager_id || "").trim() === String(manager.id).trim();
    const gf = isHomeManager ? Number(m.home_score || 0) : Number(m.away_score || 0);
    const ga = isHomeManager ? Number(m.away_score || 0) : Number(m.home_score || 0);

    played += 1;
    goalsFor += gf;
    goalsAgainst += ga;

    if (gf > ga) won += 1;
    else if (gf < ga) lost += 1;
    else drawn += 1;
  });

  const firstMatch = sortedMatches[0];
  const lastMatch = sortedMatches[sortedMatches.length - 1];
  const photo = manager.photo && manager.photo.trim() !== "" ? manager.photo.trim() : "default.png";

  el.innerHTML = `
    <div class="content-box">
      <div class="player-card">
        <div>
          <img src="images/managers/${photo}" alt="${manager.name}" onerror="this.src='images/managers/default.png'">
        </div>
        <div class="player-meta">
          <h2>${manager.name}</h2>
          <p><strong>Date of birth:</strong> ${manager.dob || "Not recorded"}</p>
          <p><strong>First match:</strong> ${firstMatch ? firstMatch.date : "Not recorded"}</p>
          <p><strong>Last match:</strong> ${lastMatch ? lastMatch.date : "Not recorded"}</p>
          <p><strong>Played:</strong> ${played}</p>
          <p><strong>Won:</strong> ${won}</p>
          <p><strong>Drawn:</strong> ${drawn}</p>
          <p><strong>Lost:</strong> ${lost}</p>
          <p><strong>Goals For:</strong> ${goalsFor}</p>
          <p><strong>Goals Against:</strong> ${goalsAgainst}</p>
          <p>${manager.bio || ""}</p>
        </div>
      </div>
    </div>

    <div class="content-box section-block">
      <h3>Matches as Manager</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Match</th>
            <th>Competition</th>
          </tr>
        </thead>
        <tbody>
          ${sortedMatches.map(m => `
            <tr>
              <td>${m.date || ""}</td>
              <td>
                <a href="match.html?id=${m.id}">
                  ${teamName(m.home_team)} ${m.home_score}-${m.away_score} ${teamName(m.away_team)}
                </a>
              </td>
              <td>${m.competition || ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}).catch(err => {
  document.getElementById("managerPage").innerHTML = `<div class="content-box"><p>Error loading manager page: ${err.message}</p></div>`;
  console.error(err);
});