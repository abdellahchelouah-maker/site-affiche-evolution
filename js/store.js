/* Données du projet partagées entre le Gantt et le tableau Kanban (stockées dans le navigateur) */
const EvoStore = (function () {
  const KEY = "evo-project-v1";
  const COLS = 12; // 3 séances x (H1, H2, H3, Maison)
  const DEFAULT_TASKS = [
    "Choisir le support technique dans la liste",
    "Lire le cahier des charges et lister les tâches",
    "Construire le Gantt prévisionnel",
    "Rechercher les étapes clés (dates, inventeurs)",
    "Rechercher les images / photos de chaque étape",
    "Rédiger les fiches d’étape (principe, ergonomie, esthétique)",
    "Imaginer et croquiser le produit du futur",
    "Expliquer le fonctionnement du produit du futur",
    "Choisir la charte graphique (polices, couleurs)",
    "Maquette et mise en page de l’affiche A3",
    "Relecture, vérification du cahier des charges, impression",
    "Dossier : Gantt effectif, ajustements, répartition des tâches",
  ];
  function blank() {
    return {
      group: { classe: "", groupe: "", noms: ["", "", ""], support: "" },
      locked: false,
      tasks: DEFAULT_TASKS.map((n, i) => newTask(n, false, i)),
    };
  }
  function newTask(name, late, i) {
    return {
      id: "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + (i || 0),
      name: name || "",
      who: "",
      plan: Array(COLS).fill(false),
      real: Array(COLS).fill(false),
      status: "todo",
      late: !!late,
      just: "",
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalise(JSON.parse(raw));
    } catch (e) {}
    return blank();
  }
  function normalise(d) {
    const b = blank();
    d = d || {};
    d.group = Object.assign(b.group, d.group || {});
    d.group.noms = (d.group.noms || []).concat(["", "", ""]).slice(0, 3);
    d.locked = !!d.locked;
    d.tasks = (Array.isArray(d.tasks) ? d.tasks : b.tasks).map((t) =>
      Object.assign(newTask("", false), t, {
        plan: (t.plan || []).concat(Array(COLS).fill(false)).slice(0, COLS),
        real: (t.real || []).concat(Array(COLS).fill(false)).slice(0, COLS),
      })
    );
    return d;
  }
  function save(d) {
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
      return true;
    } catch (e) {
      return false;
    }
  }
  return { COLS, load, save, blank, newTask, normalise, KEY };
})();
