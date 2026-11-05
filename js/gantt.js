/* Outil Diagramme de Gantt : prévisionnel / effectif / comparaison */
(function () {
  const C = EvoStore.COLS;
  let data = EvoStore.load();
  let view = "plan"; // plan | real | compare
  let painting = false,
    paintVal = false;

  const $ = (s) => document.querySelector(s);
  const tbody = $("#gbody"),
    table = $("#gantt");

  function persist() {
    const ok = EvoStore.save(data);
    $("#savestate").textContent = ok ? "✔ enregistré dans ce navigateur" : "⚠ enregistrement impossible";
  }

  /* ---------- Groupe ---------- */
  function memberNames() {
    return [0, 1, 2]
      .map((i) => ({ i, n: (data.group.noms[i] || "").trim() }))
      .filter((m) => m.n || m.i < 2)
      .map((m) => ({ i: m.i, n: m.n || "Élève " + (m.i + 1) }));
  }
  function bindGroup() {
    const map = { classe: "#f-classe", groupe: "#f-groupe", support: "#f-support" };
    Object.keys(map).forEach((k) => {
      const el = $(map[k]);
      el.value = data.group[k] || "";
      el.addEventListener("change", () => {
        data.group[k] = el.value;
        persist();
        renderPrintHead();
      });
    });
    [0, 1, 2].forEach((i) => {
      const el = $("#f-nom" + (i + 1));
      el.value = data.group.noms[i] || "";
      el.addEventListener("change", () => {
        data.group.noms[i] = el.value;
        persist();
        renderAll();
      });
    });
  }
  function renderPrintHead() {
    const g = data.group;
    const names = memberNames().map((m) => m.n).join(", ");
    const vname = { plan: "Diagramme de Gantt PRÉVISIONNEL", real: "Diagramme de Gantt EFFECTIF", compare: "Gantt : prévisionnel et effectif (comparaison)" }[view];
    $("#printhead").innerHTML =
      `<h2 style="margin-top:0">${vname}</h2><p><strong>Support :</strong> ${esc(g.support) || "…"} · <strong>Classe :</strong> ${esc(g.classe) || "…"} · <strong>Groupe :</strong> ${esc(g.groupe) || "…"} · <strong>Élèves :</strong> ${esc(names)}</p>`;
  }
  function esc(s) {
    return String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* ---------- Tableau ---------- */
  function whoOptions(sel) {
    let h = `<option value="">— à attribuer —</option><option value="all"${sel === "all" ? " selected" : ""}>Tous (tâche commune)</option>`;
    memberNames().forEach((m) => {
      h += `<option value="${m.i}"${String(sel) === String(m.i) ? " selected" : ""}>${esc(m.n)}</option>`;
    });
    return h;
  }
  function renderTable() {
    table.className = `gantt view-${view} mode-${view}` + (data.locked ? " locked-plan" : "");
    tbody.innerHTML = "";
    data.tasks.forEach((t, ti) => {
      const tr = document.createElement("tr");
      let h = `<td class="task"><input type="text" value="${esc(t.name)}" data-ti="${ti}" aria-label="Nom de la tâche ${ti + 1}" placeholder="Nom de la tâche">${t.late ? '<span class="tag">non prévue</span>' : ""}</td>`;
      h += `<td class="who"><select data-ti="${ti}" aria-label="Responsable">${whoOptions(t.who)}</select></td>`;
      for (let c = 0; c < C; c++) {
        const cls = "cell" + (c % 4 === 3 ? " home" : "") + (c % 4 === 0 && c > 0 ? " sepl" : "");
        h += `<td class="${cls}" data-ti="${ti}" data-c="${c}"><div class="p${t.plan[c] ? " on" : ""}"></div><div class="r${t.real[c] ? " on" : ""}"></div></td>`;
      }
      const canDel = !data.locked || t.late;
      h += `<td class="del">${canDel ? `<button data-del="${ti}" title="Supprimer la tâche" aria-label="Supprimer">✕</button>` : ""}</td>`;
      tr.innerHTML = h;
      tbody.appendChild(tr);
    });
  }
  function canEdit() {
    return view === "real" || (view === "plan" && !data.locked);
  }
  function setCell(td, val) {
    const t = data.tasks[+td.dataset.ti],
      c = +td.dataset.c;
    const arr = view === "plan" ? t.plan : t.real;
    if (arr[c] === val) return;
    arr[c] = val;
    td.querySelector(view === "plan" ? ".p" : ".r").classList.toggle("on", val);
  }
  tbody.addEventListener("mousedown", (e) => {
    const td = e.target.closest("td.cell");
    if (!td) return;
    if (!canEdit()) {
      if (view === "plan" && data.locked) flash("Le prévisionnel est figé. Passez en vue « Effectif » pour saisir le réel.");
      if (view === "compare") flash("Choisissez la vue « Prévisionnel » ou « Effectif » pour modifier.");
      return;
    }
    e.preventDefault();
    const t = data.tasks[+td.dataset.ti];
    const arr = view === "plan" ? t.plan : t.real;
    paintVal = !arr[+td.dataset.c];
    painting = true;
    setCell(td, paintVal);
  });
  tbody.addEventListener("mouseover", (e) => {
    if (!painting) return;
    const td = e.target.closest("td.cell");
    if (td) setCell(td, paintVal);
  });
  document.addEventListener("mouseup", () => {
    if (painting) {
      painting = false;
      persist();
      renderStats();
    }
  });
  tbody.addEventListener("change", (e) => {
    const ti = e.target.dataset.ti;
    if (ti === undefined) return;
    if (e.target.tagName === "INPUT") data.tasks[ti].name = e.target.value;
    else if (e.target.tagName === "SELECT") data.tasks[ti].who = e.target.value;
    persist();
    renderStats();
  });
  tbody.addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]");
    if (!b) return;
    const ti = +b.dataset.del;
    if (confirm("Supprimer la tâche « " + (data.tasks[ti].name || "sans nom") + " » ?")) {
      data.tasks.splice(ti, 1);
      persist();
      renderAll();
    }
  });

  /* ---------- Statistiques : répartition + écarts ---------- */
  const count = (a) => a.filter(Boolean).length;
  function renderStats() {
    // Répartition
    const members = memberNames();
    const load = {};
    members.forEach((m) => (load[m.i] = { p: 0, r: 0 }));
    let unassigned = 0;
    data.tasks.forEach((t) => {
      const p = count(t.plan),
        r = count(t.real);
      if (t.who === "all") members.forEach((m) => { load[m.i].p += p; load[m.i].r += r; });
      else if (t.who !== "" && load[t.who]) { load[t.who].p += p; load[t.who].r += r; }
      else unassigned += p + r;
    });
    const maxV = Math.max(1, ...members.map((m) => Math.max(load[m.i].p, load[m.i].r)));
    let h = '<div class="table-wrap"><table class="t"><thead><tr><th>Élève</th><th>Prévisionnel (h)</th><th>Effectif (h)</th></tr></thead><tbody>';
    members.forEach((m) => {
      const l = load[m.i];
      h += `<tr><td><strong>${esc(m.n)}</strong></td><td style="min-width:200px">${l.p} h<div class="bar p"><div style="width:${(l.p / maxV) * 100}%"></div></div></td><td style="min-width:200px">${l.r} h<div class="bar r"><div style="width:${(l.r / maxV) * 100}%"></div></div></td></tr>`;
    });
    h += "</tbody></table></div>";
    const ps = members.map((m) => load[m.i].p),
      rs = members.map((m) => load[m.i].r);
    const sp = Math.max(...ps) - Math.min(...ps),
      sr = Math.max(...rs) - Math.min(...rs);
    let msg = "";
    if (unassigned) msg += `<p>⚠ Certaines tâches n’ont pas de responsable : attribuez-les pour que la répartition soit complète.</p>`;
    if (Math.max(...ps) > 0 && sp > 2) msg += `<div class="callout warn"><strong>Prévisionnel déséquilibré</strong>Il y a ${sp} h d’écart entre l’élève le plus chargé et le moins chargé. Le partage des tâches doit être équitable.</div>`;
    if (Math.max(...rs) > 0 && sr > 2) msg += `<div class="callout warn"><strong>Effectif déséquilibré</strong>Écart de ${sr} h dans le travail réellement fourni : à expliquer dans le dossier.</div>`;
    $("#repartition").innerHTML = h + msg;

    // Écarts
    const rows = [];
    data.tasks.forEach((t, i) => {
      const p = count(t.plan),
        r = count(t.real);
      const diffCells = t.plan.some((v, c) => v !== t.real[c]);
      if (t.late || diffCells) rows.push({ t, i, p, r });
    });
    if (!data.locked && !data.tasks.some((t) => count(t.real))) {
      $("#ecarts").innerHTML = '<p class="muted">Les écarts s’afficheront ici dès que vous aurez saisi le Gantt effectif.</p>';
    } else if (!rows.length) {
      $("#ecarts").innerHTML = '<div class="callout ok"><strong>Aucun écart</strong>Le réel correspond exactement au prévisionnel. Vérifiez que le Gantt effectif a bien été renseigné.</div>';
    } else {
      let e = '<div class="table-wrap"><table class="t"><thead><tr><th>Tâche</th><th>Prévu</th><th>Réel</th><th>Écart</th><th style="min-width:320px">Pourquoi cet ajustement ? Qu’avez-vous changé ?</th></tr></thead><tbody>';
      rows.forEach(({ t, i, p, r }) => {
        const d = r - p;
        e += `<tr><td>${esc(t.name) || "<em>sans nom</em>"}${t.late ? '<span class="tag">non prévue</span>' : ""}</td><td>${p} h</td><td>${r} h</td><td><strong style="color:${d > 0 ? "#b45309" : d < 0 ? "#2563eb" : "inherit"}">${d > 0 ? "+" : ""}${d} h</strong></td><td><textarea data-just="${i}" placeholder="Ex. : la recherche d’images a pris plus de temps que prévu car…">${esc(t.just)}</textarea></td></tr>`;
      });
      e += "</tbody></table></div>";
      $("#ecarts").innerHTML = e;
    }
  }
  $("#ecarts").addEventListener("change", (e) => {
    if (e.target.dataset.just !== undefined) {
      data.tasks[+e.target.dataset.just].just = e.target.value;
      persist();
    }
  });

  /* ---------- Barre d'outils ---------- */
  function setView(v) {
    view = v;
    document.querySelectorAll(".seg button").forEach((b) => b.classList.toggle("on", b.dataset.view === v));
    renderTable();
    renderPrintHead();
    $("#hint").textContent = {
      plan: data.locked ? "Prévisionnel figé : lecture seule." : "Cliquez ou glissez sur les cases pour planifier chaque tâche (1 case = 1 heure).",
      real: "Cliquez ou glissez pour indiquer ce qui a réellement été fait (1 case = 1 heure).",
      compare: "Bleu = prévu (haut), orange = réel (bas). Lecture seule.",
    }[v];
  }
  document.querySelectorAll(".seg button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

  function renderLock() {
    $("#lockstate").innerHTML = data.locked
      ? '<span class="lockbadge">🔒 Prévisionnel figé</span>'
      : '<span class="muted">🔓 Prévisionnel modifiable</span>';
    $("#btn-lock").textContent = data.locked ? "Déverrouiller" : "Figer le prévisionnel";
    $("#btn-lock").className = "btn small " + (data.locked ? "secondary" : "");
  }
  $("#btn-lock").addEventListener("click", () => {
    if (!data.locked) {
      if (!confirm("Figer le prévisionnel ? Vous ne pourrez plus le modifier : seul le Gantt effectif pourra être saisi. À faire en fin de séance 1.")) return;
      data.locked = true;
    } else {
      if (!confirm("Déverrouiller le prévisionnel ? (réservé à un cas particulier validé par le professeur)")) return;
      data.locked = false;
    }
    persist();
    renderAll();
  });
  $("#btn-add").addEventListener("click", () => {
    data.tasks.push(EvoStore.newTask("", data.locked));
    persist();
    renderAll();
    const inputs = tbody.querySelectorAll("td.task input");
    inputs[inputs.length - 1].focus();
  });
  $("#btn-print").addEventListener("click", () => window.print());
  $("#btn-export").addEventListener("click", () => {
    const g = data.group;
    const name = "gantt-" + ((g.groupe || g.noms[0] || "groupe").replace(/[^\w-]+/g, "_")) + ".json";
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $("#btn-import").addEventListener("click", () => $("#file-import").click());
  $("#file-import").addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        data = EvoStore.normalise(JSON.parse(rd.result));
        persist();
        bindGroup();
        renderAll();
      } catch (err) {
        alert("Fichier illisible : " + err.message);
      }
    };
    rd.readAsText(f);
    e.target.value = "";
  });
  $("#btn-reset").addEventListener("click", () => {
    if (confirm("Tout effacer et repartir de zéro sur cet ordinateur ? Pensez à exporter votre fichier avant.")) {
      data = EvoStore.blank();
      persist();
      bindGroup();
      renderAll();
    }
  });

  function flash(msg) {
    const el = $("#flash");
    el.textContent = msg;
    el.classList.remove("hide");
    clearTimeout(flash.t);
    flash.t = setTimeout(() => el.classList.add("hide"), 3500);
  }

  function renderAll() {
    renderLock();
    setView(view);
    renderStats();
  }
  bindGroup();
  renderAll();
  persist();
})();
