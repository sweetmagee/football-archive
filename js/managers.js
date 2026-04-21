Promise.all([
  fetch("data/managers.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json())
]).then(([managers, matches, teams]) => {
  const el = document.getElementById("managerList");

  function teamName(teamId) {
    const team = teams.find(t => String(t.id).trim() === String(teamId).trim());
    return team ? team.name : teamId;
  }

  function parseDate(value) {
    if (!value) return null;
    const parts = String(value).split("/");
    if (parts.length === 3) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    return null;
  }

  const rows = managers.map(mgr => {
    const mgrMatches = matches.filter(m =>
      String(m.home_manager_id || "").trim() === String(mgr.id).trim() ||
      String(m.away_manager_id || "").trim() === String(mgr.id).trim()
    );

    const sortedMatches = [...mgrMatches].sort((a, b) => parseDate(a.date) - parseDate(b.date));
    const firstMatch = sortedMatches[0];
    const lastMatch = sortedMatches[sortedMatches.length - 1];

    return {
      ...mgr,
      matchCount: mgrMatches.length,
      firstMatchDate: firstMatch ? firstMatch.date : "",
      lastMatchDate: lastMatch ? lastMatch.date : ""
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  if (!rows.length) {
    el.innerHTML = "<p>No managers recorded.</p>";
    return;
  }

  el.innerHTML = `
    <table class="archive-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>First Match</th>
          <th>Last Match</th>
          <th>Matches</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            <td><a href="manager.html?id=${row.id}">${row.name}</a></td>
            <td>${row.firstMatchDate || ""}</td>
            <td>${row.lastMatchDate || ""}</td>
            <td>${row.matchCount}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}).catch(err => {
  document.getElementById("managerList").innerHTML = `<p>Error loading managers: ${err.message}</p>`;
  console.error(err);
});