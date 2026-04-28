Promise.all([
  fetch("data/managers.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json())
]).then(([managers, matches, teams]) => {
  const el = document.getElementById("managerList");
  const searchBox = document.getElementById("managerSearch");
  const includeFriendlies = document.getElementById("includeFriendliesManagers");
  const countEl = document.getElementById("managerCount");

  function parseDate(value) {
    if (!value) return null;

    const clean = String(value).replace(/\./g, "/").replace(/-/g, "/").trim();
    const parts = clean.split("/");

    if (parts.length !== 3) return null;

    let [d, m, y] = parts;

    if (y.length === 2) {
      y = Number(y) >= 50 ? `18${y}` : `19${y}`;
    }

    const dt = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function isFriendly(match) {
    const comp = String(match.competition || "").trim().toLowerCase();
    return (
      comp === "friendly" ||
      comp === "friendlies" ||
      comp === "fr" ||
      comp.includes("friendly")
    );
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

  const baseRows = managers.map(mgr => {
    const allMgrMatches = matches.filter(m =>
      String(m.home_manager_id || "").trim() === String(mgr.id).trim() ||
      String(m.away_manager_id || "").trim() === String(mgr.id).trim()
    );

    const sortedAll = [...allMgrMatches].sort(
      (a, b) => parseDate(a.date) - parseDate(b.date)
    );

    const firstMatch = sortedAll[0];
    const lastMatch = sortedAll[sortedAll.length - 1];

    return {
      ...mgr,
      firstMatchDate: firstMatch ? firstMatch.date : "",
      lastMatchDate: lastMatch ? lastMatch.date : "",
      allMatches: allMgrMatches
    };
  });

  function render() {
    const query = searchBox.value.trim().toLowerCase();
    const includeFr = includeFriendlies.checked;

    let rows = baseRows.map(row => {
      const validMatches = row.allMatches.filter(m =>
        isCountableMatch(m) &&
        (includeFr || !isFriendly(m))
      );

      return {
        ...row,
        matchCount: validMatches.length
      };
    });

    if (query) {
      rows = rows.filter(row =>
        row.name.toLowerCase().includes(query)
      );
    }

    rows.sort((a, b) => a.name.localeCompare(b.name));

    countEl.textContent = rows.length;

    if (!rows.length) {
      el.innerHTML = "<p>No managers found.</p>";
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
  }

  searchBox.addEventListener("input", render);
  includeFriendlies.addEventListener("change", render);

  render();

}).catch(err => {
  document.getElementById("managerList").innerHTML =
    `<p>Error loading managers: ${err.message}</p>`;
  console.error(err);
});