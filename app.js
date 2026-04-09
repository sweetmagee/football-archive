let players = [];

fetch("data/players.json")
  .then(r => r.json())
  .then(data => {
    players = data;
    render(players);
  });

function render(list) {
  const el = document.getElementById('playerTable'); // ✅ FIXED
  el.innerHTML = '';

  list.slice(0, 50).forEach(p => {
    el.innerHTML += `
      <tr>
        <td><a href="player.html?id=${p.id}">${p.name}</a></td>
        <td>${p.position}</td>
        <td>${p.apps}</td>
        <td>${p.goals}</td>
      </tr>
    `;
  });
}

document.getElementById('search').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  render(players.filter(p => p.name.toLowerCase().includes(q)));
});