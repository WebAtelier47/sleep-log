import {
  clearAllData,
  deleteEntry,
  getAllEntries,
  getAllSettings,
  getEntriesByRange,
  getEntry,
  getSetting,
  putEntry,
  replaceAllData,
  setSetting,
} from "./db.js";
import {
  computeAverages,
  computeBedtimePattern,
  computeTibMinutes,
  computeTstMinutes,
  formatMinutesAsDuration,
  formatMinutesAsTimeOfDay,
  getRecentDateKeys,
} from "./stats.js";

const DEFAULT_TARGET_WAKE = "06:40";

const state = {
  currentView: "morning",
  targetWake: DEFAULT_TARGET_WAKE,
};

const refs = {};
let deferredInstallPrompt = null;

document.addEventListener("DOMContentLoaded", async () => {
  cacheRefs();
  setupNavigation();
  setupMorningForm();
  setupDashboardActions();
  setupSettings();
  setupInstallPrompt();
  setupConnectivityIndicator();
  initTodayDate();
  await ensureDefaultSettings();
  await refreshMorningFromSelectedDate();
  await renderDashboard();
  registerServiceWorker();
});

function cacheRefs() {
  refs.views = {
    morning: document.getElementById("view-morning"),
    dashboard: document.getElementById("view-dashboard"),
    settings: document.getElementById("view-settings"),
  };
  refs.navButtons = Array.from(document.querySelectorAll(".nav-btn"));
  refs.networkStatus = document.getElementById("networkStatus");

  refs.morningForm = document.getElementById("morningForm");
  refs.entryDate = document.getElementById("entryDate");
  refs.entryDateDisplay = document.getElementById("entryDateDisplay");
  refs.bedtime = document.getElementById("bedtime");
  refs.wakeFinal = document.getElementById("wakeFinal");
  refs.wakeCountGroup = document.getElementById("wakeCountGroup");
  refs.awakeMinutesGroup = document.getElementById("awakeMinutesGroup");
  refs.wakeCount = document.getElementById("wakeCount");
  refs.awakeMinutes = document.getElementById("awakeMinutes");
  refs.energy = document.getElementById("energy");
  refs.energyValue = document.getElementById("energyValue");
  refs.ruminations = document.getElementById("ruminations");
  refs.note = document.getElementById("note");
  refs.morningMessage = document.getElementById("morningMessage");

  refs.avgEnergy = document.getElementById("avgEnergy");
  refs.avgWakeFinal = document.getElementById("avgWakeFinal");
  refs.targetWakeDisplay = document.getElementById("targetWakeDisplay");
  refs.patternResult = document.getElementById("patternResult");
  refs.dashboardRows = document.getElementById("dashboardRows");

  refs.settingsForm = document.getElementById("settingsForm");
  refs.targetWake = document.getElementById("targetWake");
  refs.exportBtn = document.getElementById("exportBtn");
  refs.importFile = document.getElementById("importFile");
  refs.importBtn = document.getElementById("importBtn");
  refs.clearBtn = document.getElementById("clearBtn");
  refs.settingsMessage = document.getElementById("settingsMessage");
  refs.installAppBtn = document.getElementById("installAppBtn");
  refs.installHelp = document.getElementById("installHelp");
}

function setupNavigation() {
  for (const button of refs.navButtons) {
    button.addEventListener("click", async () => {
      const view = button.dataset.view;
      if (!view || view === state.currentView) {
        return;
      }
      setActiveView(view);
      if (view === "dashboard") {
        await renderDashboard();
      } else if (view === "morning") {
        await refreshMorningFromSelectedDate();
      } else if (view === "settings") {
        refs.targetWake.value = state.targetWake;
      }
    });
  }
}

function setActiveView(viewName) {
  state.currentView = viewName;
  for (const [name, element] of Object.entries(refs.views)) {
    const active = name === viewName;
    element.hidden = !active;
    element.classList.toggle("active", active);
  }
  for (const button of refs.navButtons) {
    const active = button.dataset.view === viewName;
    button.classList.toggle("active", active);
    if (active) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  }
}

function setupSegmentedButtons(group, hiddenInput) {
  group.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const value = target.dataset.value;
    if (typeof value !== "string") {
      return;
    }
    hiddenInput.value = value;
    for (const button of group.querySelectorAll("button")) {
      button.classList.toggle("active", button === target);
    }
  });
}

function setupMorningForm() {
  setupSegmentedButtons(refs.wakeCountGroup, refs.wakeCount);
  setupSegmentedButtons(refs.awakeMinutesGroup, refs.awakeMinutes);

  refs.energy.addEventListener("input", () => {
    refs.energyValue.textContent = refs.energy.value;
  });

  refs.entryDate.addEventListener("change", async () => {
    renderSelectedDateDisplay();
    await refreshMorningFromSelectedDate();
  });

  refs.morningForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    refs.morningMessage.textContent = "";

    if (!refs.bedtime.value || !refs.wakeFinal.value) {
      refs.morningMessage.textContent = "Heure de coucher et réveil final sont requis.";
      refs.morningMessage.className = "message error";
      return;
    }

    const entry = {
      date: refs.entryDate.value,
      bedtime: refs.bedtime.value,
      wakeFinal: refs.wakeFinal.value,
      wakeCount: Number(refs.wakeCount.value),
      awakeMinutes: Number(refs.awakeMinutes.value),
      energy: Number(refs.energy.value),
      ruminations: Boolean(refs.ruminations.checked),
      note: refs.note.value.trim(),
      updatedAt: new Date().toISOString(),
    };

    await putEntry(entry);
    refs.morningMessage.textContent = `Enregistré pour le ${formatDateForDisplay(entry.date)}.`;
    refs.morningMessage.className = "message success";
    await renderDashboard();
  });

  refs.morningForm.addEventListener("reset", () => {
    window.setTimeout(() => {
      refs.entryDate.value = getLocalDateKey(new Date());
      renderSelectedDateDisplay();
      refs.bedtime.value = "";
      refs.wakeFinal.value = "";
      refs.energy.value = "5";
      refs.energyValue.textContent = "5";
      refs.ruminations.checked = false;
      refs.note.value = "";
      setSegmentValue(refs.wakeCountGroup, refs.wakeCount, "0");
      setSegmentValue(refs.awakeMinutesGroup, refs.awakeMinutes, "0");
      refs.morningMessage.textContent = "";
      refs.morningMessage.className = "message";
    }, 0);
  });
}

function setupDashboardActions() {
  refs.dashboardRows.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const action = target.dataset.action;
    const date = target.dataset.date;
    if (!action || !date) {
      return;
    }

    if (action === "edit") {
      refs.entryDate.value = date;
      renderSelectedDateDisplay();
      setActiveView("morning");
      await refreshMorningFromSelectedDate();
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(
        `Supprimer l'entrée du ${formatDateForDisplay(date)} ? Cette action est irréversible.`
      );
      if (!confirmed) {
        return;
      }
      await deleteEntry(date);
      if (refs.entryDate.value === date) {
        await refreshMorningFromSelectedDate();
      }
      await renderDashboard();
    }
  });
}

function setSegmentValue(group, hiddenInput, value) {
  hiddenInput.value = value;
  for (const button of group.querySelectorAll("button")) {
    button.classList.toggle("active", button.dataset.value === value);
  }
}

async function refreshMorningFromSelectedDate() {
  const date = refs.entryDate.value;
  if (!date) {
    return;
  }

  const entry = await getEntry(date);
  if (!entry) {
    refs.bedtime.value = "";
    refs.wakeFinal.value = "";
    refs.energy.value = "5";
    refs.energyValue.textContent = "5";
    refs.ruminations.checked = false;
    refs.note.value = "";
    setSegmentValue(refs.wakeCountGroup, refs.wakeCount, "0");
    setSegmentValue(refs.awakeMinutesGroup, refs.awakeMinutes, "0");
    refs.morningMessage.textContent = "";
    refs.morningMessage.className = "message";
    return;
  }

  refs.bedtime.value = entry.bedtime || "";
  refs.wakeFinal.value = entry.wakeFinal || "";
  const energyValue = Number.isFinite(Number(entry.energy)) ? String(entry.energy) : "5";
  refs.energy.value = energyValue;
  refs.energyValue.textContent = energyValue;
  refs.ruminations.checked = Boolean(entry.ruminations);
  refs.note.value = entry.note || "";
  setSegmentValue(refs.wakeCountGroup, refs.wakeCount, String(entry.wakeCount ?? 0));
  setSegmentValue(refs.awakeMinutesGroup, refs.awakeMinutes, String(entry.awakeMinutes ?? 0));
}

function initTodayDate() {
  const today = getLocalDateKey(new Date());
  refs.entryDate.defaultValue = today;
  refs.entryDate.value = today;
  renderSelectedDateDisplay();
}

async function ensureDefaultSettings() {
  const targetWake = await getSetting("target_wake");
  if (!targetWake) {
    await setSetting("target_wake", DEFAULT_TARGET_WAKE);
    state.targetWake = DEFAULT_TARGET_WAKE;
  } else {
    state.targetWake = String(targetWake);
  }
  refs.targetWake.value = state.targetWake;
  refs.targetWakeDisplay.textContent = state.targetWake;
}

async function renderDashboard() {
  const dateKeys = getRecentDateKeys(7);
  const newest = dateKeys[0];
  const oldest = dateKeys[dateKeys.length - 1];
  const recentEntries = await getEntriesByRange(oldest, newest);
  const byDate = new Map(recentEntries.map((entry) => [entry.date, entry]));
  const allEntries = await getAllEntries();

  refs.dashboardRows.innerHTML = "";

  const usedEntries = [];

  for (const dateKey of dateKeys) {
    const entry = byDate.get(dateKey);
    if (entry) {
      usedEntries.push(entry);
    }
  }

  if (allEntries.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="8">Aucune entrée enregistrée.</td>`;
    refs.dashboardRows.appendChild(tr);
  } else {
    for (const entry of allEntries) {
      const tr = document.createElement("tr");
      const tib = computeTibMinutes(entry.bedtime, entry.wakeFinal);
      const tst = computeTstMinutes(tib, Number(entry.awakeMinutes) || 0);

      tr.innerHTML = `
        <td>${formatDateForDisplay(entry.date)}</td>
        <td>${entry.bedtime || "-"}</td>
        <td>${entry.wakeFinal || "-"}</td>
        <td>${Number(entry.awakeMinutes) || 0}</td>
        <td>${Number(entry.energy) || 0}</td>
        <td>${formatMinutesAsDuration(tib)}</td>
        <td>${formatMinutesAsDuration(tst)}</td>
        <td class="row-actions">
          <button type="button" class="table-action" data-action="edit" data-date="${entry.date}">Modifier</button>
          <button type="button" class="table-action delete" data-action="delete" data-date="${entry.date}">Supprimer</button>
        </td>
      `;
      refs.dashboardRows.appendChild(tr);
    }
  }

  const averages = computeAverages(usedEntries);
  refs.avgEnergy.textContent =
    averages.avgEnergy === null ? "-" : averages.avgEnergy.toFixed(1);
  refs.avgWakeFinal.textContent =
    averages.avgWakeFinal === null ? "-" : formatMinutesAsTimeOfDay(averages.avgWakeFinal);
  refs.targetWakeDisplay.textContent = state.targetWake;

  const pattern = computeBedtimePattern(usedEntries);
  if (!pattern) {
    refs.patternResult.textContent = "Pas assez de données";
  } else {
    const wakeSign = pattern.wakeDiffMinutes > 0 ? "+" : "";
    const energySign = pattern.energyDiff > 0 ? "+" : "";
    refs.patternResult.textContent =
      `Tardif (>=22:45) vs tôt (<=22:30) : réveil ${wakeSign}${pattern.wakeDiffMinutes} min, ` +
      `énergie ${energySign}${pattern.energyDiff.toFixed(2)}.`;
  }
}

function setupSettings() {
  refs.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!refs.targetWake.value) {
      return;
    }
    state.targetWake = refs.targetWake.value;
    await setSetting("target_wake", state.targetWake);
    refs.targetWakeDisplay.textContent = state.targetWake;
    refs.settingsMessage.textContent = "Réglage enregistré.";
    refs.settingsMessage.className = "message success";
    await renderDashboard();
  });

  refs.exportBtn.addEventListener("click", async () => {
    const exportDate = getLocalDateKey(new Date());
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedAtDate: formatDateForDisplay(exportDate),
      entries: await getAllEntries(),
      settings: await getAllSettings(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sleep-log-export-${formatDateForDisplay(exportDate)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    refs.settingsMessage.textContent = `Export terminé (${formatDateForDisplay(exportDate)}).`;
    refs.settingsMessage.className = "message success";
  });

  refs.importBtn.addEventListener("click", async () => {
    const file = refs.importFile.files?.[0];
    if (!file) {
      refs.settingsMessage.textContent = "Sélectionnez un fichier JSON.";
      refs.settingsMessage.className = "message error";
      return;
    }

    const confirmed = window.confirm("Importer va remplacer les données existantes. Continuer ?");
    if (!confirmed) {
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const entries = Array.isArray(data.entries) ? data.entries : [];
      const settings = Array.isArray(data.settings) ? data.settings : [];
      await replaceAllData(entries, settings);

      const importedTargetWake = settings.find((item) => item.key === "target_wake")?.value;
      state.targetWake = importedTargetWake || DEFAULT_TARGET_WAKE;
      if (!importedTargetWake) {
        await setSetting("target_wake", DEFAULT_TARGET_WAKE);
      }
      refs.targetWake.value = state.targetWake;
      refs.targetWakeDisplay.textContent = state.targetWake;

      refs.settingsMessage.textContent = "Import terminé.";
      refs.settingsMessage.className = "message success";
      await refreshMorningFromSelectedDate();
      await renderDashboard();
    } catch (error) {
      refs.settingsMessage.textContent = "Import invalide.";
      refs.settingsMessage.className = "message error";
    }
  });

  refs.clearBtn.addEventListener("click", async () => {
    const confirmed = window.confirm("Tout effacer ? Cette action est irréversible.");
    if (!confirmed) {
      return;
    }
    await clearAllData();
    await setSetting("target_wake", DEFAULT_TARGET_WAKE);
    state.targetWake = DEFAULT_TARGET_WAKE;
    refs.targetWake.value = DEFAULT_TARGET_WAKE;
    refs.targetWakeDisplay.textContent = DEFAULT_TARGET_WAKE;
    refs.settingsMessage.textContent = "Toutes les données ont été effacées.";
    refs.settingsMessage.className = "message success";
    await refreshMorningFromSelectedDate();
    await renderDashboard();
  });
}

function setupConnectivityIndicator() {
  const renderStatus = () => {
    const online = navigator.onLine;
    refs.networkStatus.textContent = online ? "En ligne" : "Hors ligne";
    refs.networkStatus.classList.toggle("offline", !online);
  };
  window.addEventListener("online", renderStatus);
  window.addEventListener("offline", renderStatus);
  renderStatus();
}

function setupInstallPrompt() {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    refs.installHelp.textContent = "Application déjà installée.";
    refs.installHelp.className = "message success";
    refs.installAppBtn.hidden = true;
    return;
  }

  if (isIosSafari()) {
    refs.installHelp.textContent =
      "iPhone/iPad: ouvrez le menu Partager puis « Sur l’écran d’accueil ».";
    refs.installHelp.className = "message";
  } else {
    refs.installHelp.textContent =
      "Android: si le bouton n'apparaît pas, ouvrez le menu du navigateur puis « Installer l'application ».";
    refs.installHelp.className = "message";
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    refs.installAppBtn.hidden = false;
    refs.installHelp.textContent = "Installation disponible.";
    refs.installHelp.className = "message success";
  });

  refs.installAppBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      refs.installHelp.textContent =
        "Installation non disponible automatiquement. Utilisez le menu du navigateur.";
      refs.installHelp.className = "message";
      return;
    }

    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === "accepted") {
      refs.installHelp.textContent = "Installation lancée.";
      refs.installHelp.className = "message success";
      refs.installAppBtn.hidden = true;
    } else {
      refs.installHelp.textContent = "Installation annulée.";
      refs.installHelp.className = "message";
    }
    deferredInstallPrompt = null;
  });

  window.addEventListener("appinstalled", () => {
    refs.installHelp.textContent = "Application installée.";
    refs.installHelp.className = "message success";
    refs.installAppBtn.hidden = true;
    deferredInstallPrompt = null;
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");

      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) {
          return;
        }
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });

      let didRefresh = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (didRefresh) {
          return;
        }
        didRefresh = true;
        window.location.reload();
      });

      registration.update();
    } catch (error) {
      // No-op: app still works without SW registration.
    }
  });
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/i.test(ua);
  const isCriOS = /CriOS/i.test(ua);
  const isFxiOS = /FxiOS/i.test(ua);
  return isIos && isWebkit && !isCriOS && !isFxiOS;
}

function renderSelectedDateDisplay() {
  const selectedDate = refs.entryDate.value;
  if (!selectedDate) {
    refs.entryDateDisplay.textContent = "";
    return;
  }
  refs.entryDateDisplay.textContent = `Date sélectionnée : ${formatDateForDisplay(selectedDate)}`;
}

function formatDateForDisplay(dateKey) {
  if (typeof dateKey !== "string") {
    return "-";
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return dateKey;
  }
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
