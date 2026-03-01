const MINUTES_PER_DAY = 24 * 60;
const EARLY_BEDTIME_THRESHOLD = 22 * 60 + 30; // 22:30
const LATE_BEDTIME_THRESHOLD = 22 * 60 + 45; // 22:45

export function parseTimeToMinutes(value) {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

export function formatMinutesAsDuration(totalMinutes) {
  const safe = Math.max(0, Number.isFinite(totalMinutes) ? Math.round(totalMinutes) : 0);
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatMinutesAsTimeOfDay(minutes) {
  if (!Number.isFinite(minutes)) {
    return "-";
  }
  const safe = ((Math.round(minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function computeTibMinutes(bedtime, wakeFinal) {
  const bedtimeMin = parseTimeToMinutes(bedtime);
  const wakeMin = parseTimeToMinutes(wakeFinal);
  if (bedtimeMin === null || wakeMin === null) {
    return 0;
  }
  const adjustedWake = wakeMin < bedtimeMin ? wakeMin + MINUTES_PER_DAY : wakeMin;
  return adjustedWake - bedtimeMin;
}

export function computeTstMinutes(tibMinutes, awakeMinutes) {
  const tib = Number.isFinite(tibMinutes) ? tibMinutes : 0;
  const awake = Number.isFinite(awakeMinutes) ? awakeMinutes : 0;
  return Math.max(0, tib - awake);
}

export function average(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }
  const numeric = values.filter((value) => Number.isFinite(value));
  if (numeric.length === 0) {
    return null;
  }
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
}

export function getRecentDateKeys(days = 7, from = new Date()) {
  const result = [];
  const pivot = new Date(from);
  pivot.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i += 1) {
    const value = new Date(pivot);
    value.setDate(pivot.getDate() - i);
    result.push(formatDateKey(value));
  }
  return result;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseWakeMinutes(entry) {
  return parseTimeToMinutes(entry?.wakeFinal || "");
}

function parseBedtimeMinutes(entry) {
  return parseTimeToMinutes(entry?.bedtime || "");
}

export function computeAverages(entries) {
  const wakeValues = [];
  const energyValues = [];

  for (const entry of entries) {
    if (Number.isFinite(Number(entry.energy))) {
      energyValues.push(Number(entry.energy));
    }
    const wake = parseWakeMinutes(entry);
    if (wake !== null) {
      wakeValues.push(wake);
    }
  }

  return {
    avgEnergy: average(energyValues),
    avgWakeFinal: average(wakeValues),
  };
}

export function computeBedtimePattern(entries) {
  const earlyGroup = [];
  const lateGroup = [];

  for (const entry of entries) {
    const bedtime = parseBedtimeMinutes(entry);
    const wake = parseWakeMinutes(entry);
    const energy = Number(entry.energy);
    if (bedtime === null || wake === null || !Number.isFinite(energy)) {
      continue;
    }
    if (bedtime <= EARLY_BEDTIME_THRESHOLD) {
      earlyGroup.push({ wake, energy });
    } else if (bedtime >= LATE_BEDTIME_THRESHOLD) {
      lateGroup.push({ wake, energy });
    }
  }

  if (earlyGroup.length < 2 || lateGroup.length < 2) {
    return null;
  }

  const avgEarlyWake = average(earlyGroup.map((item) => item.wake));
  const avgLateWake = average(lateGroup.map((item) => item.wake));
  const avgEarlyEnergy = average(earlyGroup.map((item) => item.energy));
  const avgLateEnergy = average(lateGroup.map((item) => item.energy));

  return {
    earlyCount: earlyGroup.length,
    lateCount: lateGroup.length,
    wakeDiffMinutes: Math.round((avgLateWake ?? 0) - (avgEarlyWake ?? 0)),
    energyDiff: Number(((avgLateEnergy ?? 0) - (avgEarlyEnergy ?? 0)).toFixed(2)),
  };
}
