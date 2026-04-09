function buildTable(matches) {
  const table = {};

  matches.forEach(m => {

    if (!table[m.home_team]) {
      table[m.home_team] = {P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,PTS:0};
    }

    if (!table[m.away_team]) {
      table[m.away_team] = {P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,PTS:0};
    }

    table[m.home_team].P++;
    table[m.away_team].P++;

    table[m.home_team].GF += m.home_score;
    table[m.home_team].GA += m.away_score;

    table[m.away_team].GF += m.away_score;
    table[m.away_team].GA += m.home_score;

    if (m.home_score > m.away_score) {
      table[m.home_team].W++;
      table[m.away_team].L++;
      table[m.home_team].PTS += 3;
    } else if (m.home_score < m.away_score) {
      table[m.away_team].W++;
      table[m.home_team].L++;
      table[m.away_team].PTS += 3;
    } else {
      table[m.home_team].D++;
      table[m.away_team].D++;
      table[m.home_team].PTS += 1;
      table[m.away_team].PTS += 1;
    }

    table[m.home_team].GD = table[m.home_team].GF - table[m.home_team].GA;
    table[m.away_team].GD = table[m.away_team].GF - table[m.away_team].GA;

  });

  return table;
}

function getTopScorers(appearances, seasonMatches) {
  const matchIds = seasonMatches.map(m => m.id);
  const scorers = {};

  appearances.forEach(a => {
    if (matchIds.includes(a.match_id) && a.goals > 0) {
      if (!scorers[a.player_id]) scorers[a.player_id] = 0;
      scorers[a.player_id] += Number(a.goals);
    }
  });

  return scorers;
}

<td><a href="team.html?id=${team.id}">${team.name}</a></td>

const leagueMatches = seasonMatches.filter(m => m.competition === "League");

const cupMatches = seasonMatches.filter(m => m.competition !== "League");