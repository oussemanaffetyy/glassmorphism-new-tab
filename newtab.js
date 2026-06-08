// ---------- Storage helpers ----------
const KEYS = { name: "aura.name", todos: "aura.todos", weather: "aura.weather" };
const load = (k, fb) => {
  try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); }
  catch { return fb; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ---------- Clock & greeting ----------
const clockEl = document.getElementById("clock");
const greetEl = document.getElementById("greet");
const dateEl  = document.getElementById("date");

function greetFor(h) {
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function tick() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  dateEl.textContent  = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const name = load(KEYS.name, "friend");
  greetEl.textContent = `${greetFor(now.getHours())}, ${name}`;
}
tick();
setInterval(tick, 1000);

// ---------- Name ----------
document.getElementById("name-btn").addEventListener("click", () => {
  const cur = load(KEYS.name, "");
  const next = prompt("What should we call you?", cur || "");
  if (next && next.trim()) { save(KEYS.name, next.trim()); tick(); }
});

// ---------- Search ----------
document.getElementById("search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.getElementById("search-input").value.trim();
  if (!q) return;
  window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
});

// ---------- To-Do ----------
const listEl = document.getElementById("todo-list");
const summaryEl = document.getElementById("focus-summary");
let todos = load(KEYS.todos, [
  { id: 1, text: "Welcome! Click to check off ✓", done: false },
  { id: 2, text: "Add your own focus below", done: false },
]);

function renderTodos() {
  listEl.innerHTML = "";
  todos.slice(0, 5).forEach((t) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <button data-id="${t.id}" class="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm transition hover:bg-white/10">
        <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${t.done ? "border-white/60 bg-white/80 text-black" : "border-white/40 bg-white/10"}">${t.done ? "✓" : ""}</span>
        <span class="truncate ${t.done ? "text-white/50 line-through" : "text-white/90"}">${escapeHtml(t.text)}</span>
      </button>`;
    listEl.appendChild(li);
  });
  const remaining = todos.filter((t) => !t.done).length;
  summaryEl.textContent = `${remaining} task${remaining === 1 ? "" : "s"} remaining`;
  save(KEYS.todos, todos);
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  renderTodos();
});

document.getElementById("todo-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("todo-input");
  const text = input.value.trim();
  if (!text) return;
  todos.push({ id: Date.now(), text, done: false });
  input.value = "";
  renderTodos();
});
renderTodos();

// ---------- Weather (Geolocation + Open-Meteo) ----------
const wxTemp = document.getElementById("wx-temp");
const wxLoc  = document.getElementById("wx-loc");
const wxHi   = document.getElementById("wx-hi");
const wxLo   = document.getElementById("wx-lo");
const wxIcon = document.getElementById("wx-icon");
const DEFAULT_WEATHER_LOCATION = {
  latitude: 36.8065,
  longitude: 10.1815,
  place: "Tunis",
};
const GEOLOCATION_ERROR_LABELS = {
  1: "Permission denied",
  2: "Position unavailable",
  3: "Timeout",
};

function codeToIcon(c) {
  if (c === 0) return "☀️";
  if ([1, 2].includes(c)) return "🌤️";
  if (c === 3) return "☁️";
  if ([45, 48].includes(c)) return "🌫️";
  if (c >= 51 && c <= 67) return "🌦️";
  if (c >= 71 && c <= 77) return "❄️";
  if (c >= 80 && c <= 82) return "🌧️";
  if (c >= 95) return "⛈️";
  return "🌥️";
}
function codeToLabel(c) {
  if (c === 0) return "Clear";
  if ([1, 2].includes(c)) return "Partly cloudy";
  if (c === 3) return "Cloudy";
  if ([45, 48].includes(c)) return "Foggy";
  if (c >= 51 && c <= 67) return "Drizzle";
  if (c >= 71 && c <= 77) return "Snow";
  if (c >= 80 && c <= 82) return "Rain";
  if (c >= 95) return "Storm";
  return "Mixed";
}

function paintWeather(w) {
  wxTemp.textContent = `${Math.round(w.temp)}°`;
  wxLoc.textContent  = `${codeToLabel(w.code)}${w.place ? " · " + w.place : ""}`;
  wxHi.textContent   = Math.round(w.hi);
  wxLo.textContent   = Math.round(w.lo);
  wxIcon.textContent = codeToIcon(w.code);
}

async function fetchWeather(lat, lon, fallbackPlace = "") {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
  const r = await fetch(url); const d = await r.json();
  let place = fallbackPlace;
  try {
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`);
    const gj = await g.json();
    place = gj?.results?.[0]?.name || fallbackPlace;
  } catch {}
  return {
    temp: d.current.temperature_2m,
    code: d.current.weather_code,
    hi: d.daily.temperature_2m_max[0],
    lo: d.daily.temperature_2m_min[0],
    place,
    ts: Date.now(),
  };
}

function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

function logGeolocationError(error) {
  console.warn("Geolocation failed; using default weather location.", {
    code: error?.code,
    reason: GEOLOCATION_ERROR_LABELS[error?.code] || "Unknown",
    message: error?.message || "No message provided",
  });
}

async function loadDefaultWeather(cached) {
  try {
    const w = await fetchWeather(
      DEFAULT_WEATHER_LOCATION.latitude,
      DEFAULT_WEATHER_LOCATION.longitude,
      DEFAULT_WEATHER_LOCATION.place
    );
    save(KEYS.weather, w);
    paintWeather(w);
  } catch (error) {
    console.warn("Default weather fallback failed.", error);
    if (!cached) wxLoc.textContent = "Weather unavailable";
  }
}

(async function initWeather() {
  const cached = load(KEYS.weather, null);
  if (cached) paintWeather(cached);
  if (!("geolocation" in navigator)) {
    console.warn("Geolocation API unavailable; using default weather location.");
    await loadDefaultWeather(cached);
    return;
  }

  let pos;
  try {
    pos = await getCurrentPosition({ maximumAge: 10 * 60 * 1000, timeout: 8000 });
  } catch (error) {
    logGeolocationError(error);
    await loadDefaultWeather(cached);
    return;
  }

  try {
    const w = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
    save(KEYS.weather, w); paintWeather(w);
  } catch (error) {
    console.warn("Weather lookup failed.", error);
    if (!cached) wxLoc.textContent = "Weather unavailable";
  }
})();
