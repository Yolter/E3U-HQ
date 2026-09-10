const E3U = {
  keys: {
    users: "e3u_users",
    current: "e3u_current_user",
    music: "e3u_music"
  }
};

window.E3U = E3U;

const defaultUsers = [
  { name: "Yolter", role: "Founder" }
];

function loadUsers() {
  return JSON.parse(localStorage.getItem(E3U.keys.users)) || defaultUsers;
}

function saveUsers(users) {
  localStorage.setItem(E3U.keys.users, JSON.stringify(users));
}

window.loadUsers = loadUsers;
window.saveUsers = saveUsers;

if (!localStorage.getItem(E3U.keys.users)) {
  saveUsers(defaultUsers);
}

window.currentUser = JSON.parse(
  localStorage.getItem(E3U.keys.current) ||
  '{"name":"Yolter","role":"Founder"}'
);if (loadUsers().length === 0) {
    saveUsers(defaultUsers);
    localStorage.setItem(
        E3U.keys.current,
        JSON.stringify(defaultUsers[0])
    );
}window.E3U = window.E3U || {};

E3U.players = function () {
    return loadUsers();
};

E3U.savePlayers = function (users) {
    saveUsers(users);
};