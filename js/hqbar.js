// =========================================
// HQ Live Bar
// =========================================

function renderHQBar(){

    const box=document.getElementById("hq-bar");

    if(!box) return;

    const players=E3U.players().length;

    const bank=Object.keys(E3U.get(E3U.keys.bank,{})).length;

    const cash=Object.keys(E3U.get(E3U.keys.cash,{})).length;

    const truck=localStorage.getItem(E3U.keys.truck);

    box.innerHTML=`

    <div class="badge">👥 ${players} бойцов</div>

    <div class="badge">🏦 ${bank}</div>

    <div class="badge">💵 ${cash}</div>

    <div class="badge">${truck?"🚛 "+truck:"🚛 —"}</div>

    <div class="badge">👤 ${Auth.user()}</div>

    `;

}

window.renderHQBar=renderHQBar;