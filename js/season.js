
function renderSeasonStatsDemo(){
const appearancesEl=document.getElementById('appearances');
const rows=[];
for(let i=1;i<=60;i++){
 rows.push({rank:i,playerId:'p'+i,name:'Player '+i,appsDisplay:i,goals:Math.floor(i/3)});
}
const columns=[rows.slice(0,20),rows.slice(20,40),rows.slice(40,60)];
appearancesEl.innerHTML = columns
.filter(column => column.length > 0)
.map(column => `
<div class="season-stats-column">
<div class="season-stats-row season-stats-header">
<span>Rank</span><span>Player</span><span>App</span><span>Gls</span>
</div>
${column.map(row => `
<div class="season-stats-row">
<span>${row.rank}.</span>
<span><a href="player.html?id=${row.playerId}">${row.name}</a></span>
<span>${row.appsDisplay}</span>
<span>${row.goals}</span>
</div>`).join("")}
</div>`).join("");
}
renderSeasonStatsDemo();
