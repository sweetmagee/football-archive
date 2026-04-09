const tableData = buildTable(seasonMatches);

Object.entries(tableData)
  .sort((a, b) => b[1].PTS - a[1].PTS || b[1].GD - a[1].GD)
  .forEach(([teamId, stats]) => {

    const team = teams.find(t => t.id === teamId);

const tableData = buildTable(leagueMatches);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${team.name}</td>
      <td>${stats.P}</td>
      <td>${stats.W}</td>
      <td>${stats.D}</td>
      <td>${stats.L}</td>
      <td>${stats.GF}</td>
      <td>${stats.GA}</td>
      <td>${stats.GD}</td>
      <td>${stats.PTS}</td>
    `;

    tableBody.appendChild(row);
  });

