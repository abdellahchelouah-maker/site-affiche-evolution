/* Navigation commune + listes à cocher mémorisées */
(function () {
  const root = document.body.dataset.root || "";
  const page = document.body.dataset.page || "";
  const links = [
    ["index", "index.html", "Accueil"],
    ["consignes", "pages/consignes.html", "Consignes"],
    ["groupe", "pages/groupe.html", "Travail de groupe"],
    ["seance1", "pages/seance1.html", "Séance 1"],
    ["seance2", "pages/seance2.html", "Séance 2"],
    ["seance3", "pages/seance3.html", "Séance 3"],
    ["charte", "pages/charte.html", "Charte graphique"],
    ["gantt", "pages/gantt.html", "Diagramme de Gantt"],
    ["exemple", "pages/exemple.html", "Exemple"],
    ["bareme", "pages/bareme.html", "Évaluation"],
  ];
  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.innerHTML =
    '<div class="nav-inner"><span class="brand">📐 Évolution d’un objet technique</span>' +
    links
      .map(
        (l) =>
          `<a class="link${l[0] === page ? " active" : ""}" href="${root}${l[1]}">${l[2]}</a>`
      )
      .join("") +
    "</div>";
  document.body.prepend(nav);
  const active = nav.querySelector(".active");
  if (active && active.scrollIntoView) active.scrollIntoView({ inline: "center", block: "nearest" });

  const foot = document.createElement("footer");
  foot.className = "container";
  foot.innerHTML =
    "STI2D · Première · Mini-projet « Évolution d’un objet technique » · 3 séances de 3 h + travail à la maison";
  document.body.appendChild(foot);

  // Listes à cocher persistantes
  const PREFIX = "evo-check-";
  document.querySelectorAll("input[type=checkbox][data-key]").forEach((cb) => {
    try {
      cb.checked = localStorage.getItem(PREFIX + cb.dataset.key) === "1";
    } catch (e) {}
    cb.addEventListener("change", () => {
      try {
        localStorage.setItem(PREFIX + cb.dataset.key, cb.checked ? "1" : "0");
      } catch (e) {}
      updateProgress();
    });
  });
  function updateProgress() {
    document.querySelectorAll("[data-progress]").forEach((box) => {
      const group = box.dataset.progress;
      const all = document.querySelectorAll(`input[data-key^="${group}-"]`);
      const done = [...all].filter((c) => c.checked).length;
      const pct = all.length ? Math.round((done / all.length) * 100) : 0;
      box.querySelector(".progress>div").style.width = pct + "%";
      box.querySelector(".txt").textContent = `${done} / ${all.length} points validés`;
    });
  }
  updateProgress();
})();
