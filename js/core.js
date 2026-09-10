const E3U = {
  keys: {
    players: "e3u_players",
    bank: "e3u_bank",
    cash: "e3u_cash",
    truck: "e3u_truck",
    forum: "e3u_forum",
    user: "e3u_user",
    role: "e3u_role"
  },

  get(key, fallback) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  },

  set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  players() {
    return this.get(this.keys.players, []);
  },

  savePlayers(data) {
    this.set(this.keys.players, data);
  }
};

// Первый запуск
(() => {
  if (!localStorage.getItem(E3U.keys.players)) {
    E3U.savePlayers([
      {
        name: "Yolter",
        role: "Founder"
      }
    ]);
  }
})();