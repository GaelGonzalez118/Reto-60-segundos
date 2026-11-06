/**
 * Motor del juego: temporizador, inventario, drag-and-drop (mouse + táctil) y audio.
 */
const Game = {
  round: 1,
  timeLeft: ROUND_SECONDS,
  packedIds: [],
  openedFurniture: {},
  remainingByFurniture: {},
  kitPacked: false,
  timerId: null,
  round1: null,
  round2: null,
  rainRaf: 0,
  audio: null,
  ticking: false,

  init() {
    this.resetWorld();
    this.bindUi();
    this.bindDragDrop();
    RainFx.init();
    UI.showScreen("start");
  },

  resetWorld() {
    this.round = 1;
    this.timeLeft = ROUND_SECONDS;
    this.packedIds = [];
    this.kitPacked = false;
    this.openedFurniture = {};
    this.remainingByFurniture = {};
    FURNITURE.forEach((furn) => {
      this.remainingByFurniture[furn.id] = [...furn.itemIds];
    });
    this.round1 = null;
    this.round2 = null;
    this.stopTimer();
    AudioFx.stopStorm();
    document.getElementById("telemetry-status").textContent = "";
  },

  bindUi() {
    document.getElementById("btn-start").addEventListener("click", () => {
      AudioFx.unlock();
      this.startRound(1);
    });
    document.getElementById("btn-round-2").addEventListener("click", () => {
      UI.hideIntermission();
      this.startRound(2);
    });
    document.getElementById("btn-evacuate").addEventListener("click", () => {
      this.endRound(true);
    });
    document.getElementById("btn-close-drawer").addEventListener("click", () => {
      UI.closeDrawer();
    });
    document.getElementById("btn-retry").addEventListener("click", () => {
      this.resetWorld();
      UI.showScreen("start");
      UI.setRoundTheme(0);
    });
    document.getElementById("btn-telemetry").addEventListener("click", async () => {
      const status = document.getElementById("telemetry-status");
      const forgotten = getEssentials()
        .map((item) => item.id)
        .filter((id) => !(this.round1?.packedIds || []).includes(id));
      try {
        await sendGameMetrics({
          forgottenEssentialIds: forgotten,
          packedRound1: this.round1?.packedIds || [],
          packedRound2: this.round2?.packedIds || []
        });
        status.textContent = "Resultado anónimo enviado. Gracias por apoyar los datos de prevención.";
      } catch (_err) {
        status.textContent =
          "No hay servidor de telemetría activo. Tus datos no salieron del navegador.";
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") UI.closeDrawer();
    });
  },

  startRound(round) {
    this.round = round;
    this.timeLeft = ROUND_SECONDS;
    this.packedIds = [];
    this.kitPacked = false;
    UI.closeDrawer();
    UI.setRoundTheme(round);
    UI.showScreen("game");
    UI.renderBackpack(this.packedIds);
    this.syncHud();
    this.renderStage();
    this.startTimer();
    if (round === 1) {
      AudioFx.startStorm();
      RainFx.start();
    } else {
      AudioFx.stopStorm();
      RainFx.stop();
    }
  },

  snapshot() {
    const packedIds = [...this.packedIds];
    const essentialsPacked = getEssentials().every((item) => packedIds.includes(item.id));
    return {
      packedIds,
      weight: this.currentWeight(),
      timeLeft: this.timeLeft,
      evacuatedEarly: this.timeLeft > 0,
      completedEssentials: essentialsPacked
    };
  },

  endRound(evacuatedEarly) {
    this.stopTimer();
    UI.closeDrawer();
    const snap = this.snapshot();
    snap.evacuatedEarly = evacuatedEarly && this.timeLeft > 0;
    if (this.round === 1) {
      this.round1 = snap;
      AudioFx.stopStorm();
      RainFx.stop();
      UI.showIntermission(snap);
      return;
    }
    this.round2 = snap;
    UI.setRoundTheme(0);
    UI.renderResults(this.round1, this.round2);
    UI.showScreen("results");
  },

  startTimer() {
    this.stopTimer();
    this.ticking = false;
    this.timerId = window.setInterval(() => {
      this.timeLeft -= 1;
      this.syncHud();
      if (this.timeLeft <= 10 && this.timeLeft > 0) {
        AudioFx.tick(this.timeLeft);
        this.ticking = true;
      }
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.syncHud();
        this.endRound(false);
      }
    }, 1000);
  },

  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  },

  currentWeight() {
    return this.packedIds.reduce((sum, id) => sum + (getItemById(id)?.weight || 0), 0);
  },

  syncHud() {
    UI.updateHud({
      timeLeft: this.timeLeft,
      weight: this.currentWeight(),
      packedIds: this.packedIds
    });
  },

  renderStage() {
    const roomsRoot = document.getElementById("rooms-root");
    const tabs = document.getElementById("room-tabs");
    const exit = document.getElementById("exit-station");

    if (this.round === 1) {
      tabs.hidden = false;
      roomsRoot.hidden = false;
      exit.hidden = true;
      tabs.innerHTML = ROOMS.map(
        (room, index) =>
          `<button class="room-tab${index === 0 ? " is-active" : ""}" type="button" data-room="${room.id}" role="tab">${room.name}</button>`
      ).join("");
      roomsRoot.innerHTML = ROOMS.map(
        (room, index) => `
          <div class="room${index === 0 ? " is-active" : ""}" id="room-${room.id}" data-room="${room.id}">
            ${FURNITURE.filter((furn) => furn.room === room.id)
              .map(
                (furn) => `
                  <button class="furniture" type="button" data-id="${furn.id}">
                    <h3>${furn.name}</h3>
                    <p>${furn.label}</p>
                  </button>
                `
              )
              .join("")}
          </div>
        `
      ).join("");

      tabs.querySelectorAll(".room-tab").forEach((tab) => {
        tab.addEventListener("click", () => this.switchRoom(tab.dataset.room));
      });
      roomsRoot.querySelectorAll(".furniture").forEach((btn) => {
        btn.addEventListener("click", () => this.openFurniture(btn.dataset.id));
      });
      this.refreshFurnitureStates();
      return;
    }

    tabs.hidden = true;
    roomsRoot.hidden = true;
    exit.hidden = false;
    const conditionals = getConditionals();
    exit.innerHTML = `
      <div class="kit-tray">
        <h2>Estación de salida</h2>
        <p>El kit 72 horas ya está agrupado y etiquetado junto a la puerta.</p>
        ${UI.kitCardHtml()}
      </div>
      <div class="cond-tray">
        <h2>Necesidades específicas</h2>
        <p>Súmelos según quién viva en casa.</p>
        <div class="item-grid">
          ${conditionals.map((item) => UI.itemCardHtml(item)).join("")}
        </div>
      </div>
    `;
  },

  switchRoom(roomId) {
    document.querySelectorAll(".room-tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.room === roomId);
    });
    document.querySelectorAll(".room").forEach((room) => {
      room.classList.toggle("is-active", room.dataset.room === roomId);
    });
  },

  openFurniture(furnitureId) {
    const furniture = FURNITURE.find((furn) => furn.id === furnitureId);
    const remaining = this.remainingByFurniture[furnitureId].filter(
      (id) => !this.packedIds.includes(id)
    );
    this.openedFurniture[furnitureId] = true;
    UI.openDrawer(furniture, remaining);
    this.refreshFurnitureStates();
  },

  refreshOpenDrawer() {
    const drawer = document.getElementById("drawer-modal");
    if (drawer.hidden) return;
    const title = document.getElementById("drawer-title").textContent;
    const furniture = FURNITURE.find((furn) => furn.name === title);
    if (!furniture) return;
    const left = this.remainingByFurniture[furniture.id].filter(
      (id) => !this.packedIds.includes(id)
    );
    if (left.length === 0) {
      UI.closeDrawer();
      return;
    }
    UI.openDrawer(furniture, left);
  },

  refreshFurnitureStates() {
    document.querySelectorAll(".furniture").forEach((btn) => {
      const left = (this.remainingByFurniture[btn.dataset.id] || []).filter(
        (id) => !this.packedIds.includes(id)
      );
      btn.classList.toggle("is-empty", left.length === 0);
    });
    document.querySelectorAll("[data-item-id]").forEach((card) => {
      const id = card.dataset.itemId;
      const packed =
        id === KIT_72H.id
          ? this.kitPacked
          : this.packedIds.includes(id);
      card.classList.toggle("is-packed", packed);
    });
  },

  tryPack(itemId) {
    if (itemId === KIT_72H.id) {
      return this.packKit();
    }
    const item = getItemById(itemId);
    if (!item || this.packedIds.includes(item.id)) return false;

    if (item.category === "distractor") {
      UI.toast("¡Objeto demasiado pesado / No esencial!");
    }

    const nextWeight = this.currentWeight() + item.weight;
    if (nextWeight > MAX_BACKPACK_KG) {
      AudioFx.alert();
      UI.toast("La mochila no puede superar 12 kg. Saca peso inútil o deja este objeto.");
      return false;
    }

    this.packedIds.push(item.id);
    Object.keys(this.remainingByFurniture).forEach((furnId) => {
      this.remainingByFurniture[furnId] = this.remainingByFurniture[furnId].filter(
        (id) => id !== item.id
      );
    });

    if (item.category !== "distractor") {
      AudioFx.drop();
    }
    UI.renderBackpack(this.packedIds);
    this.syncHud();
    this.refreshFurnitureStates();
    this.refreshOpenDrawer();
    return true;
  },

  packKit() {
    if (this.kitPacked) return false;
    const missing = KIT_72H.itemIds.filter((id) => !this.packedIds.includes(id));
    const extra = missing.reduce((sum, id) => sum + getItemById(id).weight, 0);
    if (this.currentWeight() + extra > MAX_BACKPACK_KG) {
      AudioFx.alert();
      UI.toast("No cabe el kit completo: la mochila supera 12 kg.");
      return false;
    }
    missing.forEach((id) => this.packedIds.push(id));
    this.kitPacked = true;
    AudioFx.drop();
    UI.toast("Kit 72 horas listo en la mochila.");
    UI.renderBackpack(this.packedIds);
    this.syncHud();
    this.refreshFurnitureStates();
    return true;
  },

  bindDragDrop() {
    const drop = document.getElementById("backpack-drop");

    const onDragStart = (event) => {
      const card = event.target.closest("[data-item-id]");
      if (!card || card.classList.contains("is-packed")) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.setData("text/plain", card.dataset.itemId);
      event.dataTransfer.effectAllowed = "copy";
    };

    document.addEventListener("dragstart", onDragStart);

    document.addEventListener("click", (event) => {
      const card = event.target.closest("[data-item-id]");
      if (!card || card.classList.contains("is-packed")) return;
      this.tryPack(card.dataset.itemId);
    });

    drop.addEventListener("dragover", (event) => {
      event.preventDefault();
      drop.classList.add("is-over");
    });
    drop.addEventListener("dragleave", () => drop.classList.remove("is-over"));
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      drop.classList.remove("is-over");
      const id = event.dataTransfer.getData("text/plain");
      if (id) this.tryPack(id);
    });

    this.bindTouchFallback(drop);
  },

  bindTouchFallback(drop) {
    let dragId = null;
    let ghost = null;

    const clearGhost = () => {
      if (ghost) ghost.remove();
      ghost = null;
      dragId = null;
      drop.classList.remove("is-over");
    };

    const pointInDrop = (x, y) => {
      const rect = drop.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    document.addEventListener(
      "touchstart",
      (event) => {
        const card = event.target.closest("[data-item-id]");
        if (!card || card.classList.contains("is-packed")) return;
        dragId = card.dataset.itemId;
        ghost = document.createElement("div");
        ghost.className = "drag-ghost";
        ghost.textContent = getItemById(dragId)?.name || "Kit 72 horas";
        document.body.appendChild(ghost);
        const touch = event.changedTouches[0];
        ghost.style.left = `${touch.clientX}px`;
        ghost.style.top = `${touch.clientY}px`;
      },
      { passive: true }
    );

    document.addEventListener(
      "touchmove",
      (event) => {
        if (!ghost) return;
        event.preventDefault();
        const touch = event.changedTouches[0];
        ghost.style.left = `${touch.clientX}px`;
        ghost.style.top = `${touch.clientY}px`;
        drop.classList.toggle("is-over", pointInDrop(touch.clientX, touch.clientY));
      },
      { passive: false }
    );

    document.addEventListener("touchend", (event) => {
      if (!dragId) return;
      const touch = event.changedTouches[0];
      const id = dragId;
      const shouldDrop = pointInDrop(touch.clientX, touch.clientY);
      clearGhost();
      if (shouldDrop) this.tryPack(id);
    });
  }
};

const AudioFx = {
  ctx: null,
  stormNodes: [],

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  },

  startStorm() {
    this.unlock();
    this.stopStorm();
    const ctx = this.ctx;
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const rain = ctx.createBufferSource();
    rain.buffer = noiseBuffer;
    rain.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = "bandpass";
    rainFilter.frequency.value = 1800;
    rainFilter.Q.value = 0.6;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.045;
    rain.connect(rainFilter).connect(rainGain).connect(ctx.destination);
    rain.start();

    const wind = ctx.createBufferSource();
    wind.buffer = noiseBuffer;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 280;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.03;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain).connect(windGain.gain);
    wind.connect(windFilter).connect(windGain).connect(ctx.destination);
    wind.start();
    lfo.start();

    this.stormNodes = [rain, wind, lfo, rainGain, windGain];
  },

  stopStorm() {
    this.stormNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (_err) {
        /* already stopped */
      }
    });
    this.stormNodes = [];
  },

  beep(freq, duration, type, gainValue) {
    this.unlock();
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  },

  tick(secondsLeft) {
    const freq = secondsLeft <= 4 ? 980 : 760;
    this.beep(freq, 0.07, "square", 0.04);
  },

  drop() {
    this.beep(520, 0.09, "sine", 0.05);
    setTimeout(() => this.beep(780, 0.08, "sine", 0.04), 70);
  },

  alert() {
    this.beep(180, 0.18, "sawtooth", 0.05);
    setTimeout(() => this.beep(140, 0.22, "sawtooth", 0.05), 90);
  }
};

const RainFx = {
  canvas: null,
  ctx: null,
  drops: [],
  running: false,

  init() {
    this.canvas = document.getElementById("rain-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
  },

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.drops = Array.from({ length: 90 }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      len: 12 + Math.random() * 16,
      speed: 8 + Math.random() * 10
    }));
  },

  start() {
    if (this.running) return;
    this.running = true;
    const draw = () => {
      if (!this.running) return;
      const { ctx, canvas, drops } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(186, 214, 230, 0.35)";
      ctx.lineWidth = 1;
      drops.forEach((drop) => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + 3, drop.y + drop.len);
        ctx.stroke();
        drop.y += drop.speed;
        drop.x += 1.4;
        if (drop.y > canvas.height) {
          drop.y = -20;
          drop.x = Math.random() * canvas.width;
        }
      });
      Game.rainRaf = requestAnimationFrame(draw);
    };
    draw();
  },

  stop() {
    this.running = false;
    cancelAnimationFrame(Game.rainRaf);
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
};

document.addEventListener("DOMContentLoaded", () => Game.init());
