/**
 * Control de pantallas, modales, puntajes, toasts y telemetría anónima.
 */
const UI = {
  toastTimer: null,

  els() {
    return {
      hud: document.getElementById("hud"),
      start: document.getElementById("screen-start"),
      game: document.getElementById("screen-game"),
      results: document.getElementById("screen-results"),
      intermission: document.getElementById("modal-intermission"),
      drawer: document.getElementById("drawer-modal"),
      toast: document.getElementById("toast"),
      timer: document.getElementById("timer-display"),
      timerWrap: document.querySelector(".hud__timer"),
      weightLabel: document.getElementById("weight-label"),
      weightFill: document.getElementById("weight-fill"),
      weightBar: document.getElementById("weight-bar"),
      itemCount: document.getElementById("item-count"),
      roundLabel: document.getElementById("hud-round-label"),
      backpackList: document.getElementById("backpack-list"),
      backpackHint: document.getElementById("backpack-hint"),
      houseStage: document.getElementById("house-stage"),
      telemetryStatus: document.getElementById("telemetry-status")
    };
  },

  showScreen(name) {
    const { start, game, results, hud } = this.els();
    start.hidden = name !== "start";
    game.hidden = name !== "game";
    results.hidden = name !== "results";
    hud.hidden = name !== "game";
  },

  setRoundTheme(round) {
    document.body.classList.toggle("round-1", round === 1);
    document.body.classList.toggle("round-2", round === 2);
    const { roundLabel, houseStage } = this.els();
    roundLabel.textContent =
      round === 1 ? "Ronda 1 · Caos" : "Ronda 2 · Listo para salir";
    houseStage.dataset.round = String(round);
  },

  updateHud(state) {
    const { timer, timerWrap, weightLabel, weightFill, weightBar, itemCount } =
      this.els();
    timer.textContent = String(state.timeLeft);
    timerWrap.classList.toggle("is-warn", state.timeLeft <= 30 && state.timeLeft > 10);
    timerWrap.classList.toggle("is-danger", state.timeLeft <= 10);
    const weight = state.weight.toFixed(1);
    weightLabel.textContent = `${weight} / ${MAX_BACKPACK_KG} kg`;
    const pct = Math.min(100, (state.weight / MAX_BACKPACK_KG) * 100);
    weightFill.style.width = `${pct}%`;
    weightBar.setAttribute("aria-valuenow", String(state.weight.toFixed(1)));
    weightBar.classList.toggle("is-high", state.weight >= MAX_BACKPACK_KG * 0.85);
    itemCount.textContent = String(state.packedIds.length);
  },

  renderBackpack(packedIds) {
    const { backpackList, backpackHint } = this.els();
    backpackList.innerHTML = packedIds
      .map((id) => {
        const item = getItemById(id);
        return `<li><span>${item.name}</span><span>${item.weight.toFixed(1)} kg</span></li>`;
      })
      .join("");
    backpackHint.textContent = packedIds.length
      ? "Suelta más insumos o sal ahora"
      : "Arrastra insumos aquí";
  },

  toast(message) {
    const { toast } = this.els();
    toast.hidden = false;
    toast.textContent = message;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2200);
  },

  openDrawer(furniture, remainingItemIds) {
    const modal = this.els().drawer;
    document.getElementById("drawer-title").textContent = furniture.name;
    const grid = document.getElementById("drawer-items");
    grid.innerHTML = remainingItemIds
      .map((id) => this.itemCardHtml(getItemById(id)))
      .join("");
    modal.hidden = false;
  },

  closeDrawer() {
    this.els().drawer.hidden = true;
  },

  itemCardHtml(item) {
    const tag =
      item.category === "essential"
        ? "Esencial"
        : item.category === "distractor"
          ? "¿Servirá?"
          : "Según el hogar";
    return `
      <button class="item-card" type="button" draggable="true" data-item-id="${item.id}">
        <img src="${assetPath(item.icon)}" alt="" width="52" height="52" />
        <strong>${item.name}</strong>
        <small>${item.weight.toFixed(1)} kg · ${tag}</small>
      </button>
    `;
  },

  kitCardHtml() {
    return `
      <button class="kit-card" type="button" draggable="true" data-item-id="${KIT_72H.id}">
        <img src="assets/kit-box.svg" alt="" width="64" height="64" />
        <strong>${KIT_72H.name}</strong>
        <small>${KIT_72H.weight.toFixed(1)} kg · etiquetado junto a la puerta</small>
        <span class="tag tag--essential">Toca o arrastra el kit completo</span>
      </button>
    `;
  },

  showIntermission(round1) {
    const essentials = getEssentials();
    const got = essentials.filter((item) => round1.packedIds.includes(item.id)).length;
    const pct = Math.round((got / essentials.length) * 100);
    const title = document.getElementById("intermission-title");
    const body = document.getElementById("intermission-body");
    title.textContent = round1.evacuatedEarly ? "Saliste con lo que juntaste" : "Tiempo agotado";
    body.textContent = `Lograste juntar el ${pct}% de los insumos esenciales y perdiste tiempo buscando en cajones.`;
    this.els().intermission.hidden = false;
  },

  hideIntermission() {
    this.els().intermission.hidden = true;
  },

  renderResults(round1, round2) {
    const essentials = getEssentials();
    const tbody = document.getElementById("results-tbody");
    const row = (metric, a, b) =>
      `<tr><th scope="row">${metric}</th><td>${a}</td><td>${b}</td></tr>`;

    const timeCell = (round) => {
      const used = ROUND_SECONDS - round.timeLeft;
      if (!round.completedEssentials) {
        return `${used}s (Incompleto)`;
      }
      return `${used}s (Completado)`;
    };

    const essentialCell = (round) => {
      const got = essentials.filter((item) => round.packedIds.includes(item.id)).length;
      return `${got} / ${essentials.length}`;
    };

    const distractorCell = (round) => {
      const n = getDistractors().filter((item) => round.packedIds.includes(item.id)).length;
      return n === 1 ? "1 objeto" : `${n} objetos`;
    };

    tbody.innerHTML = [
      row("Tiempo empleado", timeCell(round1), timeCell(round2)),
      row("Insumos esenciales", essentialCell(round1), essentialCell(round2)),
      row("Objetos innecesarios", distractorCell(round1), distractorCell(round2)),
      row(
        "Peso final",
        `${round1.weight.toFixed(1)} kg`,
        `${round2.weight.toFixed(1)} kg`
      )
    ].join("");

    const r1got = essentials.filter((item) => round1.packedIds.includes(item.id)).length;
    document.getElementById("results-summary").textContent =
      r1got < essentials.length
        ? "Sin una estación de salida, el reloj y el desorden dejan insumos críticos atrás. Con el kit listo junto a la puerta, la evacuación cabe en segundos."
        : "Juntaste lo esencial incluso en el caos. Aun así, organizar el kit en la salida reduce estrés, peso inútil y olvidos de necesidades específicas.";

    const cards = document.getElementById("conditional-cards");
    cards.innerHTML = getConditionals()
      .map((item) => {
        const packed =
          round1.packedIds.includes(item.id) || round2.packedIds.includes(item.id);
        const status = packed
          ? "Lo incluiste: decisión correcta si aplica a tu hogar."
          : "No estaba en la mochila. En un hogar que lo necesita, olvidarlo puede ser grave.";
        return `
          <details>
            <summary>${item.name} · ${item.weight.toFixed(1)} kg</summary>
            <p><strong>${status}</strong></p>
            <p>${item.explanation}</p>
          </details>
        `;
      })
      .join("");
  }
};

/**
 * Envía IDs olvidados en Ronda 1 para estadísticas de prevención.
 * Falla en silencio si no hay backend disponible.
 */
async function sendGameMetrics(data) {
  const payload = {
    game: "reto-mochila-60s",
    city: "Tijuana",
    timestamp: new Date().toISOString(),
    forgottenEssentialIds: data.forgottenEssentialIds || [],
    packedRound1: data.packedRound1 || [],
    packedRound2: data.packedRound2 || []
  };

  const response = await fetch("/api/prevention-metrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("No se pudo enviar la telemetría");
  }
  return response;
}
