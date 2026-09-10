window.E3U_AUTH = (function () {

  const CURRENT_KEY = "e3u_current_user";

  function getCurrentUser() {
    const raw = localStorage.getItem(CURRENT_KEY);

    if (raw) return JSON.parse(raw);

    const founder = {
      name: "Yolter",
      role: "Founder"
    };

    localStorage.setItem(CURRENT_KEY, JSON.stringify(founder));

    return founder;
  }

  function setCurrentUser(user) {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(user));
  }

  function isFounder() {
    return getCurrentUser().role === "Founder";
  }

  function isR4() {
    const role = getCurrentUser().role;
    return role === "Founder" || role === "R4";
  }

  return {
    getCurrentUser,
    setCurrentUser,
    isFounder,
    isR4
  };

})();