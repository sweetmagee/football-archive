const cupsDiv = document.getElementById("cups");

const grouped = {};

cupMatches.forEach(m => {
  if (!grouped[m.competition]) grouped[m.competition] = [];
  grouped[m.competition].push(m);
});

Object.entries(grouped).forEach(([comp, matches]) => {

  cupsDiv.innerHTML += `<h3>${comp}</h3>`;

  matches.forEach(m => {
    cupsDiv.innerHTML += `
      <div>
        ${m.round || ""} -
        <a href="match.html?id=${m.id}">
          ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}
        </a>
      </div>
    `;
  });

});