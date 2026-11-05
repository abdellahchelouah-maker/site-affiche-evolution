/* Barème d'évaluation interactif — affiche A3 + Gantt prévisionnel et effectif — total sur 20 */
(function () {
  const BLOCS = [
    {
      titre: "Affiche A3 — présentation",
      items: [
        { id: 1, max: 2, t: "Croquis, photos, charte graphique", d: "Images nettes et sourcées, croquis soignés ; ≤ 3 polices, ≤ 5 couleurs, contrastes lisibles ; format A3." },
        { id: 2, max: 1, t: "Qualité rédactionnelle : orthographe, grammaire, typographie", d: "Peu ou pas de fautes ; hiérarchie des titres et des textes cohérente." },
        { id: 3, max: 1, t: "Document clair et propre", d: "Mise en page aérée, alignements, ordre de lecture évident (passé → présent → futur)." },
      ],
    },
    {
      titre: "Description de l’évolution et du fonctionnement",
      items: [
        { id: 4, max: 1, t: "Idées claires et documentées : étapes datées, inventeurs", d: "Chaque étape est visible, avec sa date de première fabrication et l’inventeur (si possible) ; compréhensible par un non-technicien." },
        { id: 5, max: 2, t: "Principe de fonctionnement décrit clairement et documenté", d: "À chaque étape : principe technique, ergonomie, esthétique ; on voit ce qui a changé et pourquoi." },
      ],
    },
    {
      titre: "Gestion de projet — diagrammes de Gantt",
      items: [
        { id: 6, max: 2, t: "Gantt prévisionnel", d: "Tâches concrètes, durées réalistes, enchaînements cohérents, tâches en parallèle, responsable pour chaque tâche ; établi et figé en séance 1." },
        { id: 7, max: 2, t: "Gantt effectif", d: "Fidèle au travail réellement réalisé (y compris à la maison) ; mis à jour en cours de projet ; tâches non prévues signalées." },
        { id: 8, max: 1, t: "Écarts analysés et ajustements justifiés", d: "Chaque écart prévu/réel est expliqué (cause, décision, conséquence) ; cohérence entre les deux diagrammes." },
      ],
    },
    {
      titre: "Travail de groupe",
      items: [
        { id: 9, max: 2, t: "Partage des tâches équitable", d: "Charge de travail comparable pour chaque élève, dans le prévisionnel et dans l’effectif ; travail fourni dans ses propres tâches." },
        { id: 10, max: 1, t: "Description du rôle de chacun et des parties communes", d: "Le dossier indique qui a fait quoi et ce qui a été fait ensemble." },
      ],
    },
    {
      titre: "Évolution future du produit",
      items: [
        { id: 11, max: 2, t: "Idée de base discutée", d: "Plusieurs idées comparées, choix argumenté (cohérence, durable, innovation majeure)." },
        { id: 12, max: 2, t: "Croquis du produit du futur et évolution du design décrite correctement", d: "Croquis recherchés et annotés (pas un simple dessin rapide) ; cohérent avec l’évolution passée ; fonctionnement plausible." },
        { id: 13, max: 1, t: "Recherches menées, croisées et documentées", d: "Au moins deux sources croisées, sources citées ; informations vérifiées." },
      ],
    },
  ];
  const ITEMS = BLOCS.flatMap((b) => b.items);
  const TOTAL_MAX = ITEMS.reduce((s, i) => s + i.max, 0); // = 20
  const SKEY = "evo-bareme-saved-v1";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = (n) => (Math.round(n * 100) / 100).toString().replace(".", ",");

  /* Construction du tableau */
  let html = "";
  BLOCS.forEach((b) => {
    const sub = b.items.reduce((s, i) => s + i.max, 0);
    html += `<tr class="bloc-title"><td colspan="6">${esc(b.titre)} <span class="muted">· ${sub} pts</span></td></tr>`;
    b.items.forEach((i) => {
      const r = (v, label, pts) =>
        `<td class="pts"><label><input type="radio" name="it${i.id}" value="${v}" aria-label="${label}"> ${fmt(pts)}</label></td>`;
      html += `<tr data-id="${i.id}"><td>${i.id}</td><td class="crit">${esc(i.t)}<small>${esc(i.d)}</small></td>` +
        r("1", "Oui", i.max) + r("0.5", "Partiellement", i.max / 2) + r("0", "Non", 0) +
        `<td class="pts"><strong class="pt">–</strong> / ${i.max}</td></tr>`;
    });
  });
  $("#bbody").innerHTML = html;

  /* État */
  const fields = ["classe", "groupe", "nom1", "nom2", "nom3", "objet", "date"];
  function readState() {
    const s = { f: {}, r: {}, obs: $("#obs").value };
    fields.forEach((k) => (s.f[k] = $("#b-" + k).value));
    ITEMS.forEach((i) => {
      const c = document.querySelector(`input[name=it${i.id}]:checked`);
      if (c) s.r[i.id] = c.value;
    });
    return s;
  }
  function writeState(s) {
    fields.forEach((k) => ($("#b-" + k).value = (s.f && s.f[k]) || ""));
    $("#obs").value = s.obs || "";
    ITEMS.forEach((i) => {
      document.querySelectorAll(`input[name=it${i.id}]`).forEach((r) => (r.checked = s.r && s.r[i.id] === r.value));
    });
    compute();
  }
  function score(s) {
    let tot = 0, done = 0;
    const blocs = BLOCS.map((b) => {
      let p = 0;
      b.items.forEach((i) => {
        if (s.r[i.id] !== undefined) { p += parseFloat(s.r[i.id]) * i.max; done++; }
      });
      tot += p;
      return p;
    });
    return { tot, done, blocs };
  }
  function compute() {
    const s = readState();
    ITEMS.forEach((i) => {
      const el = document.querySelector(`tr[data-id="${i.id}"] .pt`);
      el.textContent = s.r[i.id] !== undefined ? fmt(parseFloat(s.r[i.id]) * i.max) : "–";
    });
    const sc = score(s);
    $("#total").textContent = fmt(sc.tot);
    $("#done").textContent = `${sc.done} / ${ITEMS.length} critères évalués`;
    $("#synth").innerHTML = BLOCS.map((b, k) => {
      const sub = b.items.reduce((a, i) => a + i.max, 0);
      return `<tr><td>${esc(b.titre)}</td><td><strong>${fmt(sc.blocs[k])}</strong> / ${sub}</td></tr>`;
    }).join("");
    try { localStorage.setItem("evo-bareme-draft", JSON.stringify(s)); } catch (e) {}
  }
  document.addEventListener("input", (e) => { if (e.target.closest("#bareme-root")) compute(); });
  document.addEventListener("change", (e) => { if (e.target.closest("#bareme-root")) compute(); });

  /* Évaluations enregistrées */
  function getSaved() { try { return JSON.parse(localStorage.getItem(SKEY)) || []; } catch (e) { return []; } }
  function putSaved(a) { try { localStorage.setItem(SKEY, JSON.stringify(a)); } catch (e) {} }
  function names(s) { return [s.f.nom1, s.f.nom2, s.f.nom3].filter((x) => x && x.trim()).join(", "); }
  function renderSaved() {
    const a = getSaved();
    if (!a.length) { $("#saved").innerHTML = '<p class="muted">Aucune évaluation enregistrée sur cet ordinateur.</p>'; return; }
    let h = '<div class="table-wrap"><table class="t"><thead><tr><th>Classe</th><th>Groupe</th><th>Élèves</th><th>Objet</th><th>Note /20</th><th></th></tr></thead><tbody>';
    a.forEach((s, i) => {
      h += `<tr><td>${esc(s.f.classe)}</td><td>${esc(s.f.groupe)}</td><td>${esc(names(s))}</td><td>${esc(s.f.objet)}</td><td><strong>${fmt(score(s).tot)}</strong></td><td style="white-space:nowrap"><button class="btn small secondary" data-load="${i}">Ouvrir</button> <button class="btn small danger" data-del="${i}">Suppr.</button></td></tr>`;
    });
    $("#saved").innerHTML = h + "</tbody></table></div>";
  }
  $("#btn-save").addEventListener("click", () => {
    const s = readState();
    if (!s.f.groupe.trim() && !s.f.nom1.trim()) { alert("Indiquez au moins le groupe ou un nom d’élève."); return; }
    const a = getSaved();
    const k = (s.f.classe + "|" + s.f.groupe + "|" + s.f.nom1).toLowerCase();
    const idx = a.findIndex((x) => (x.f.classe + "|" + x.f.groupe + "|" + x.f.nom1).toLowerCase() === k);
    if (idx >= 0) a[idx] = s; else a.push(s);
    putSaved(a);
    renderSaved();
  });
  $("#saved").addEventListener("click", (e) => {
    const a = getSaved();
    if (e.target.dataset.load !== undefined) { writeState(a[+e.target.dataset.load]); window.scrollTo({ top: 0, behavior: "smooth" }); }
    if (e.target.dataset.del !== undefined && confirm("Supprimer cette évaluation enregistrée ?")) {
      a.splice(+e.target.dataset.del, 1); putSaved(a); renderSaved();
    }
  });
  $("#btn-new").addEventListener("click", () => {
    if (confirm("Vider la grille pour évaluer un autre groupe ? (pensez à enregistrer)")) writeState({ f: {}, r: {}, obs: "" });
  });
  $("#btn-print").addEventListener("click", () => window.print());
  $("#btn-csv").addEventListener("click", () => {
    const a = getSaved();
    if (!a.length) { alert("Aucune évaluation enregistrée."); return; }
    const head = ["Classe", "Groupe", "Élèves", "Objet", ...ITEMS.map((i) => "C" + i.id + " (/" + i.max + ")"), "Note /20", "Observations"];
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const rows = a.map((s) => [s.f.classe, s.f.groupe, names(s), s.f.objet,
      ...ITEMS.map((i) => (s.r[i.id] !== undefined ? fmt(parseFloat(s.r[i.id]) * i.max) : "")),
      fmt(score(s).tot), s.obs]);
    const csv = "﻿" + [head, ...rows].map((r) => r.map(q).join(";")).join("\n");
    const el = document.createElement("a");
    el.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    el.download = "notes-evolution-objet-technique.csv";
    el.click();
    setTimeout(() => URL.revokeObjectURL(el.href), 1000);
  });

  // Brouillon précédent
  try {
    const d = JSON.parse(localStorage.getItem("evo-bareme-draft"));
    if (d) writeState(d); else compute();
  } catch (e) { compute(); }
  renderSaved();
  document.getElementById("maxtotal").textContent = TOTAL_MAX;
  if (TOTAL_MAX !== 20) console.warn("Le barème ne totalise pas 20 points : " + TOTAL_MAX);
})();
