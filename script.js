/* ============================================================
   SkyCast — Real-Time Weather Dashboard
   Data: Open-Meteo (weather, geocoding, air quality)
   ============================================================ */

const WEATHER_API = "https://api.open-meteo.com/v1/forecast";
const AIR_API = "https://air-quality-api.open-meteo.com/v1/air-quality";
const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";
const REVERSE_API = "https://api.bigdatacloud.net/data/reverse-geocode-client";

const DEFAULT_PLACE = {
  name: "New Delhi",
  admin1: "Delhi",
  country: "India",
  latitude: 28.6139,
  longitude: 77.209
};

const state = {
  unit: localStorage.getItem("skycastUnit") || "C",
  theme: localStorage.getItem("skycastTheme") || "auto",
  location: null,
  weather: null,
  air: null,
  hourlyExpanded: true,
  dailyExpanded: false,
  isLoading: false,
  refreshTimer: null,
  alerts: []
};

const $ = (id) => document.getElementById(id);

/* ---------- WMO weather codes: icon, label, hero scene, tip ---------- */
const weatherCodes = {
  0:  ["☀️", "Clear Sky", "clear", "Perfect weather — a great time to be outdoors."],
  1:  ["🌤️", "Mainly Clear", "clear", "Mostly sunny skies ahead. Enjoy the day!"],
  2:  ["⛅", "Partly Cloudy", "clouds", "A mix of sun and clouds — pleasant conditions."],
  3:  ["☁️", "Overcast", "clouds", "Grey skies all around. A cozy indoor day."],
  45: ["🌫️", "Fog", "fog", "Low visibility — drive slow and keep headlights on."],
  48: ["🌫️", "Rime Fog", "fog", "Freezing fog possible — watch for icy surfaces."],
  51: ["🌦️", "Light Drizzle", "rain", "A light drizzle — a compact umbrella will do."],
  53: ["🌦️", "Moderate Drizzle", "rain", "Steady drizzle — keep your hood up."],
  55: ["🌧️", "Dense Drizzle", "rain", "Heavy drizzle — waterproofs are your friend."],
  56: ["🌧️", "Freezing Drizzle", "rain", "Icy drizzle — surfaces may be slippery."],
  57: ["🌧️", "Dense Freezing Drizzle", "rain", "Freezing drizzle — take care on the roads."],
  61: ["🌦️", "Slight Rain", "rain", "Light rain expected — grab an umbrella."],
  63: ["🌧️", "Moderate Rain", "rain", "Steady rain — carry an umbrella and wear boots."],
  65: ["🌧️", "Heavy Rain", "rain", "Heavy rain — stay safe, carry an umbrella and avoid waterlogged areas."],
  66: ["🌧️", "Freezing Rain", "snow", "Freezing rain — icy conditions likely."],
  67: ["🌨️", "Heavy Freezing Rain", "snow", "Heavy freezing rain — travel only if necessary."],
  71: ["🌨️", "Slight Snow", "snow", "Light snowfall — dress in warm layers."],
  73: ["🌨️", "Moderate Snow", "snow", "Snow is piling up — bundle up and drive carefully."],
  75: ["❄️", "Heavy Snow", "snow", "Heavy snow — expect disruptions and stay warm."],
  77: ["🌨️", "Snow Grains", "snow", "Tiny ice grains falling — slippery patches possible."],
  80: ["🌦️", "Light Showers", "rain", "Passing showers — keep an umbrella handy."],
  81: ["🌧️", "Moderate Showers", "rain", "Frequent showers — plan indoor breaks."],
  82: ["⛈️", "Violent Showers", "rain", "Intense showers — avoid low-lying areas."],
  85: ["🌨️", "Slight Snow Showers", "snow", "Brief snow showers — keep warm."],
  86: ["🌨️", "Heavy Snow Showers", "snow", "Heavy snow bursts — visibility may drop."],
  95: ["⛈️", "Thunderstorm", "thunder", "Thunderstorms nearby — stay indoors and unplug devices."],
  96: ["⛈️", "Thunderstorm with Hail", "thunder", "Hail and lightning — seek shelter immediately."],
  99: ["⛈️", "Severe Thunderstorm with Hail", "thunder", "Severe storm with hail — stay inside until it passes."]
};

function weatherInfo(code, isDay = true) {
  const base = weatherCodes[code] || ["🌡️", "Unknown", "clouds", "Conditions are being monitored."];
  let [icon, label, scene, tip] = base;
  if (scene === "clear") scene += isDay ? "-day" : "-night";
  if (!isDay) {
    if (code === 0 || code === 1) icon = "🌙";
    else if (code === 2) icon = "☁️";
  }
  return { icon, label, scene, tip };
}

/* ---------- unit helpers ---------- */
const cToF = (c) => (Number(c) * 9) / 5 + 32;
const kmhToMph = (k) => Number(k) * 0.621371;
const mToMiles = (m) => Number(m) / 1609.344;
const isNum = (v) => v !== null && v !== undefined && !Number.isNaN(Number(v));

function formatTemp(value, decimals = 0) {
  if (!isNum(value)) return "—";
  return (state.unit === "C" ? Number(value) : cToF(value)).toFixed(decimals);
}

function formatWind(value) {
  if (!isNum(value)) return "—";
  const n = state.unit === "C" ? Number(value) : kmhToMph(value);
  return `${Math.round(n)} ${state.unit === "C" ? "km/h" : "mph"}`;
}

function formatVisibility(value) {
  if (!isNum(value)) return "—";
  return state.unit === "C"
    ? `${(Number(value) / 1000).toFixed(1)} km`
    : `${mToMiles(value).toFixed(1)} mi`;
}

function dirLabel(deg) {
  if (!isNum(deg)) return "—";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(Number(deg) / 45) % 8];
}

function uvLabel(uv) {
  const n = Number(uv);
  if (!isNum(uv)) return "—";
  if (n < 3) return "Low";
  if (n < 6) return "Moderate";
  if (n < 8) return "High";
  if (n < 11) return "Very High";
  return "Extreme";
}

function aqiLabel(aqi) {
  const n = Number(aqi);
  if (!isNum(aqi)) return { label: "—", cls: "" };
  if (n <= 50) return { label: "Good", cls: "" };
  if (n <= 100) return { label: "Moderate", cls: "warn" };
  if (n <= 150) return { label: "Unhealthy (SG)", cls: "warn" };
  if (n <= 200) return { label: "Unhealthy", cls: "bad" };
  if (n <= 300) return { label: "Very Unhealthy", cls: "bad" };
  return { label: "Hazardous", cls: "bad" };
}

const AQI_DESC = {
  "": "Air quality is satisfactory — little or no health risk.",
  warn: "Acceptable air quality, though sensitive groups should take it easy outdoors.",
  bad: "Unhealthy air — limit prolonged outdoor exertion if possible."
};

/* ---------- time helpers (Open-Meteo returns local ISO strings) ---------- */
function timeParts(iso) {
  const m = String(iso || "").match(/T(\d{2}):(\d{2})/);
  return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
}

function fmtTime(iso) {
  const p = timeParts(iso);
  if (!p) return "—";
  const suffix = p.h >= 12 ? "PM" : "AM";
  return `${p.h % 12 || 12}:${String(p.m).padStart(2, "0")} ${suffix}`;
}

function fmtHour(iso) {
  const p = timeParts(iso);
  if (!p) return "—";
  const suffix = p.h >= 12 ? "PM" : "AM";
  return `${p.h % 12 || 12} ${suffix}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" }).format(d);
}

function fmtDay(iso) {
  if (!iso) return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(d);
}

function fmtUTCOffset(seconds) {
  const mins = Math.round(Number(seconds || 0) / 60);
  const sign = mins >= 0 ? "+" : "-";
  const abs = Math.abs(mins);
  return `UTC${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;
}

/* ---------- moon phase (computed astronomically) ---------- */
function moonInfo(date) {
  const synodic = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  let phase = ((date.getTime() - knownNewMoon) / 86400000 % synodic) / synodic;
  if (phase < 0) phase += 1;
  const illum = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100);
  const icons = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
  const names = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
                 "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  const bucket = Math.round(phase * 8) % 8;
  return { icon: icons[bucket], name: names[bucket], illum };
}

/* ---------- fetch ---------- */
async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.reason || "API error");
  return data;
}

function buildWeatherURL(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      "temperature_2m", "relative_humidity_2m", "dew_point_2m",
      "apparent_temperature", "is_day", "precipitation", "weather_code",
      "cloud_cover", "pressure_msl", "wind_speed_10m",
      "wind_direction_10m", "wind_gusts_10m", "visibility", "uv_index"
    ].join(","),
    hourly: [
      "temperature_2m", "weather_code", "precipitation_probability",
      "precipitation", "relative_humidity_2m", "visibility",
      "wind_speed_10m", "is_day", "uv_index"
    ].join(","),
    daily: [
      "weather_code", "temperature_2m_max", "temperature_2m_min",
      "sunrise", "sunset", "uv_index_max", "precipitation_probability_max",
      "precipitation_sum", "wind_speed_10m_max", "wind_gusts_10m_max"
    ].join(","),
    forecast_days: 7,
    timezone: "auto"
  });
  return `${WEATHER_API}?${params}`;
}

function buildAirURL(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: [
      "us_aqi", "european_aqi", "pm2_5", "pm10",
      "ozone", "nitrogen_dioxide", "sulphur_dioxide", "carbon_monoxide"
    ].join(","),
    timezone: "auto"
  });
  return `${AIR_API}?${params}`;
}

/* ---------- toast ---------- */
let toastTimer;
function showToast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

/* ---------- main load ---------- */
async function loadWeather(location, options = {}) {
  const { silent = false } = options;
  localStorage.setItem("skycastPlace", JSON.stringify(location));
  state.isLoading = true;
  if (!silent) $("locationName").textContent = "Loading…";

  try {
    const [weather, air] = await Promise.all([
      fetchJSON(buildWeatherURL(location.latitude, location.longitude)),
      fetchJSON(buildAirURL(location.latitude, location.longitude)).catch(() => null)
    ]);

    state.location = location;
    state.weather = weather;
    state.air = air;

    deriveAlerts();
    renderAll();

    if (!silent) showToast(`Weather updated for ${location.name}`);
  } catch (err) {
    console.error(err);
    showToast("Could not load weather. Check your connection and retry.");
    if (!state.weather && !silent) $("locationName").textContent = "Weather unavailable";
  } finally {
    state.isLoading = false;
  }
}

/* ---------- derived alerts ---------- */
function deriveAlerts() {
  const w = state.weather;
  const a = state.air;
  const alerts = [];
  const c = w.current;
  const d = w.daily;

  if ([65, 82, 95, 96, 99].includes(c.weather_code)) {
    alerts.push({ icon: "⛈️", level: "bad", title: "Severe weather warning",
      text: `${weatherInfo(c.weather_code).label} detected. Stay indoors, avoid open fields and unplug sensitive electronics.` });
  } else if ([63, 65, 81].includes(c.weather_code)) {
    alerts.push({ icon: "🌧️", level: "warn", title: "Heavy rain advisory",
      text: "Steady rainfall expected — carry an umbrella and watch for waterlogged roads." });
  }

  if (isNum(d.wind_gusts_10m_max?.[0]) && Number(d.wind_gusts_10m_max[0]) >= 40) {
    alerts.push({ icon: "💨", level: "warn", title: "Strong wind gusts",
      text: `Gusts up to ${formatWind(d.wind_gusts_10m_max[0])} expected today. Secure loose objects outdoors.` });
  }

  if (isNum(d.uv_index_max?.[0]) && Number(d.uv_index_max[0]) >= 8) {
    alerts.push({ icon: "🔆", level: "warn", title: "High UV exposure",
      text: `UV index peaks at ${Number(d.uv_index_max[0]).toFixed(1)}. Use sunscreen and avoid direct sun at midday.` });
  }

  if (isNum(d.temperature_2m_max?.[0]) && Number(d.temperature_2m_max[0]) >= 40) {
    alerts.push({ icon: "🔥", level: "bad", title: "Heat warning",
      text: `Daytime high near ${formatTemp(d.temperature_2m_max[0])}°. Stay hydrated and avoid peak heat.` });
  }
  if (isNum(d.temperature_2m_min?.[0]) && Number(d.temperature_2m_min[0]) <= 2) {
    alerts.push({ icon: "❄️", level: "warn", title: "Cold / frost advisory",
      text: `Temperatures may drop to ${formatTemp(d.temperature_2m_min[0])}°. Dress in warm layers.` });
  }

  if (isNum(d.precipitation_sum?.[0]) && Number(d.precipitation_sum[0]) >= 20) {
    alerts.push({ icon: "🌊", level: "warn", title: "Significant rainfall total",
      text: `Up to ${Number(d.precipitation_sum[0]).toFixed(0)} mm of rain forecast today — possible flooding in low areas.` });
  }

  const aqi = a?.current?.us_aqi;
  if (isNum(aqi) && Number(aqi) > 150) {
    alerts.push({ icon: "😷", level: "bad", title: "Poor air quality",
      text: `US AQI is ${Math.round(Number(aqi))}. Consider a mask outdoors and keep windows closed.` });
  } else if (isNum(aqi) && Number(aqi) > 100) {
    alerts.push({ icon: "😷", level: "warn", title: "Moderate air quality risk",
      text: `US AQI is ${Math.round(Number(aqi))} — sensitive groups should limit long outdoor exertion.` });
  }

  state.alerts = alerts;
  const badge = $("alertBadge");
  badge.textContent = alerts.length;
  badge.classList.toggle("hidden", alerts.length === 0);
}

function renderAlertsPage() {
  const summary = $("alertsSummary");
  const list = $("alertsList");
  summary.textContent = state.location
    ? `${state.alerts.length} active ${state.alerts.length === 1 ? "advisory" : "advisories"} for ${state.location.name}`
    : "";
  if (!state.alerts.length) {
    list.innerHTML = `<div class="alerts-empty"><span class="big">✅</span><strong>No active weather alerts.</strong><br>Everything looks calm for ${escapeHTML(state.location?.name || "your area")} right now. Alerts appear here automatically for storms, heavy rain, heat, frost, high UV and poor air quality.</div>`;
    return;
  }
  list.innerHTML = state.alerts.map(a => `
    <div class="alert-item level-${a.level}">
      <span class="a-ico">${a.icon}</span>
      <div><strong>${a.title}</strong><p>${a.text}</p></div>
    </div>`).join("");
}

/* ---------- theme ---------- */
function effectiveTheme() {
  if (state.theme === "auto") {
    // first visit: follow sunrise/sunset at the selected location
    return state.weather && Number(state.weather.current?.is_day) === 1 ? "light" : "dark";
  }
  return state.theme;
}

function applyTheme() {
  document.body.classList.toggle("light", effectiveTheme() === "light");
  document.querySelectorAll(".theme-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.theme === effectiveTheme()));
}

function setTheme(theme) {
  state.theme = theme;
  localStorage.setItem("skycastTheme", theme);
  applyTheme();
}

/* ---------- pages ---------- */
function showPage(name) {
  document.querySelectorAll(".page").forEach(p =>
    p.classList.toggle("active", p.id === `page-${name}`));
  document.querySelectorAll(".nav-item").forEach(b =>
    b.classList.toggle("active", b.dataset.nav === name));
  window.scrollTo({ top: 0 });

  if (name === "maps") loadMap();
  if (name === "alerts") renderAlertsPage();
}

/* ---------- render ---------- */
function renderAll() {
  applyTheme();
  renderHero();
  renderStats();
  renderLive();
  renderHourly();
  renderDaily();
  renderSunMoon();
  renderMoon();
  renderAQI();
  if ($("page-maps").classList.contains("active")) loadMap();
  if ($("page-alerts").classList.contains("active")) renderAlertsPage();
}

function renderHero() {
  const w = state.weather;
  const c = w.current;
  const info = weatherInfo(c.weather_code, Number(c.is_day) === 1);

  $("hero").className = `hero scene-${info.scene}`;
  $("locationName").textContent =
    [state.location.name, state.location.country].filter(Boolean).join(", ") || "Current location";
  $("heroDate").textContent = fmtDate(c.time);
  $("heroTime").textContent = fmtTime(c.time);
  $("currentTemp").textContent = formatTemp(c.temperature_2m);
  $("unitLabel").textContent = state.unit;
  $("currentIcon").textContent = info.icon;
  $("currentDescription").textContent = info.label;
  $("heroTip").textContent = info.tip;
  $("feelsLike").textContent = `${formatTemp(c.apparent_temperature)}°${state.unit}`;
  $("chipHumidity").textContent = `${Math.round(c.relative_humidity_2m)}%`;
  $("chipWind").textContent = formatWind(c.wind_speed_10m);
  $("chipUV").textContent = `${isNum(c.uv_index) ? Number(c.uv_index).toFixed(1) : "—"} (${uvLabel(c.uv_index)})`;
}

function hourIndex() {
  const times = state.weather.hourly.time;
  const current = state.weather.current.time;
  const exact = times.indexOf(current);
  if (exact >= 0) return exact;
  let idx = 0;
  for (let i = 0; i < times.length; i++) if (times[i] <= current) idx = i;
  return idx;
}

function renderStats() {
  const c = state.weather.current;
  const h = state.weather.hourly;
  const start = hourIndex();

  $("windSpeed").textContent = formatWind(c.wind_speed_10m);
  $("windDir").textContent = `${dirLabel(c.wind_direction_10m)} · gusts ${formatWind(c.wind_gusts_10m)}`;
  $("compassNeedle").setAttribute("transform", `rotate(${Math.round(Number(c.wind_direction_10m) || 0)} 30 30)`);

  $("humidityVal").textContent = `${Math.round(c.relative_humidity_2m)}%`;
  drawSpark($("humiditySpark"), h.relative_humidity_2m, start, 0, 100);

  $("visibilityVal").textContent = formatVisibility(c.visibility);
  drawSpark($("visibilitySpark"), h.visibility, start);

  const uv = c.uv_index;
  $("uvVal").textContent = isNum(uv) ? Number(uv).toFixed(1) : "—";
  $("uvLabel").textContent = uvLabel(uv);
  $("uvFill").style.width = `${Math.min(100, (Number(uv) || 0) / 11 * 100)}%`;
}

function drawSpark(svg, series, start, floor, ceil) {
  if (!svg) return;
  const vals = [];
  for (let i = start; i < Math.min(start + 24, (series || []).length); i++) {
    vals.push(isNum(series[i]) ? Number(series[i]) : null);
  }
  if (!vals.length || vals.every(v => v === null)) { svg.innerHTML = ""; return; }

  let min = floor !== undefined ? floor : Math.min(...vals.filter(v => v !== null));
  let max = ceil !== undefined ? ceil : Math.max(...vals.filter(v => v !== null));
  if (min === max) { min -= 1; max += 1; }

  const pts = vals.map((v, i) => {
    const x = (i / Math.max(1, vals.length - 1)) * 100;
    const y = 38 - ((v ?? min) - min) / (max - min) * 36;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  svg.innerHTML = `
    <polygon points="0,40 ${pts.join(" ")} 100,40"></polygon>
    <polyline points="${pts.join(" ")}"></polyline>`;
}

function renderLive() {
  const c = state.weather.current;
  $("precipVal").textContent = isNum(c.precipitation) ? `${Number(c.precipitation).toFixed(1)} mm` : "—";
  $("cloudVal").textContent = `${Math.round(c.cloud_cover)}%`;
  $("pressureVal").textContent = `${Math.round(c.pressure_msl)} hPa`;
  $("dewVal").textContent = `${formatTemp(c.dew_point_2m)}°${state.unit}`;
}

function renderHourly() {
  const h = state.weather.hourly;
  const start = hourIndex();
  const count = state.hourlyExpanded ? Math.min(24, h.time.length - start) : 8;

  const cards = [];
  for (let i = 0; i < count; i++) {
    const idx = start + i;
    const info = weatherInfo(h.weather_code[idx], Number(h.is_day[idx]) === 1);
    const pop = h.precipitation_probability?.[idx];
    cards.push(`
      <div class="hour-card ${i === 0 ? "now" : ""}">
        <small>${i === 0 ? "Now" : fmtHour(h.time[idx])}</small>
        <div class="h-ico">${info.icon}</div>
        <strong>${formatTemp(h.temperature_2m[idx])}°</strong>
        <span class="h-rain">${pop == null ? "" : `💧${Math.round(pop)}%`}</span>
      </div>`);
  }
  $("hourlyStrip").innerHTML = cards.join("");
  $("hourlyToggle").textContent = state.hourlyExpanded ? "Show Less ←" : "View All →";
}

function renderDaily() {
  const d = state.weather.daily;
  const cards = d.time.map((date, i) => {
    const info = weatherInfo(d.weather_code[i], true);
    const pop = d.precipitation_probability_max?.[i];
    return `
      <div class="day-card ${i === 0 ? "today" : ""}">
        <small>${i === 0 ? "Today" : fmtDay(date)}</small>
        <div class="d-ico">${info.icon}</div>
        <div class="temps"><span class="hi">${formatTemp(d.temperature_2m_max[i])}°</span><span class="lo">${formatTemp(d.temperature_2m_min[i])}°</span></div>
        <div class="d-extra">
          💧 ${pop == null ? "—" : Math.round(pop) + "%"}<br>
          🌧️ ${isNum(d.precipitation_sum[i]) ? Number(d.precipitation_sum[i]).toFixed(1) + " mm" : "—"}<br>
          🌬️ ${formatWind(d.wind_speed_10m_max[i])}
        </div>
      </div>`;
  }).join("");
  $("dailyGrid").innerHTML = cards;
  $("dailyGrid").classList.toggle("expanded", state.dailyExpanded);
  $("dailyToggle").textContent = state.dailyExpanded ? "Show Less ←" : "View All →";
}

function renderSunMoon() {
  const d = state.weather.daily;
  const sunrise = d.sunrise?.[0];
  const sunset = d.sunset?.[0];
  $("sunriseVal").textContent = fmtTime(sunrise);
  $("sunsetVal").textContent = fmtTime(sunset);

  const nowP = timeParts(state.weather.current.time);
  const riseP = timeParts(sunrise);
  const setP = timeParts(sunset);
  const dot = $("sunDot");
  const progressPath = $("sunArcProgress");
  if (!nowP || !riseP || !setP) return;

  const nowMin = nowP.h * 60 + nowP.m;
  const riseMin = riseP.h * 60 + riseP.m;
  const setMin = setP.h * 60 + setP.m;
  const frac = Math.max(0, Math.min(1, (nowMin - riseMin) / Math.max(1, setMin - riseMin)));

  const angle = Math.PI * (1 - frac);
  dot.setAttribute("transform", `translate(${(110 + 95 * Math.cos(angle)).toFixed(1)} ${(95 - 95 * Math.sin(angle)).toFixed(1)})`);
  dot.style.opacity = nowMin >= riseMin && nowMin <= setMin ? "1" : "0.25";

  const ex = 110 + 95 * Math.cos(angle);
  const ey = 95 - 95 * Math.sin(angle);
  progressPath.setAttribute("d", frac > 0
    ? `M 15 95 A 95 95 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`
    : "");
}

function renderMoon() {
  const m = moonInfo(new Date());
  $("moonIcon").textContent = m.icon;
  $("moonPhaseName").textContent = m.name;
  $("moonIllum").textContent = `${m.illum}% illuminated`;
}

function renderAQI() {
  const a = state.air?.current;
  if (!a || !isNum(a.us_aqi)) {
    $("aqiVal").textContent = "—";
    $("euAqiVal").textContent = "—";
    $("aqiBadge").textContent = "N/A";
    $("aqiBadge").className = "aqi-badge";
    $("aqiDesc").textContent = "Air quality data is unavailable for this location.";
    ["pm25", "pm10", "o3", "no2", "so2", "co"].forEach(id => $(id).textContent = "—");
    return;
  }
  const aqi = Number(a.us_aqi);
  const info = aqiLabel(aqi);
  $("aqiVal").textContent = Math.round(aqi);
  $("euAqiVal").textContent = isNum(a.european_aqi) ? Math.round(Number(a.european_aqi)) : "—";
  $("aqiBadge").textContent = info.label;
  $("aqiBadge").className = `aqi-badge ${info.cls}`.trim();
  $("aqiDesc").textContent = AQI_DESC[info.cls] || AQI_DESC[""];
  $("aqiMarker").style.left = `${Math.min(100, aqi / 300 * 100).toFixed(1)}%`;

  const v1 = (x) => isNum(x) ? Number(x).toFixed(1) : "—";
  $("pm25").textContent = v1(a.pm2_5);
  $("pm10").textContent = v1(a.pm10);
  $("o3").textContent = v1(a.ozone);
  $("no2").textContent = v1(a.nitrogen_dioxide);
  $("so2").textContent = v1(a.sulphur_dioxide);
  $("co").textContent = isNum(a.carbon_monoxide) ? Math.round(Number(a.carbon_monoxide)).toString() : "—";
}

/* ---------- maps page ---------- */
function loadMap() {
  if (!state.location) return;
  const { latitude, longitude } = state.location;
  const d = 0.06;
  $("mapTitle").textContent = [state.location.name, state.location.country].filter(Boolean).join(", ");
  $("mapFrame").src =
    `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - d}%2C${latitude - d}%2C${longitude + d}%2C${latitude + d}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  $("mapOpenLink").href = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=13/${latitude}/${longitude}`;
  $("coords").textContent = `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`;
  $("timezoneFull").textContent = state.weather?.timezone || "—";
  $("utcOffset").textContent = fmtUTCOffset(state.weather?.utc_offset_seconds);
  $("elevationVal").textContent = isNum(state.weather?.elevation) ? `${Math.round(Number(state.weather.elevation))} m` : "—";
}

/* ---------- search ---------- */
async function searchLocations(query) {
  const params = new URLSearchParams({ name: query, count: 8, language: "en", format: "json" });
  const data = await fetchJSON(`${GEO_API}?${params}`);
  return data.results || [];
}

function renderSearchResults(results) {
  const box = $("searchResults");
  if (!results.length) {
    box.innerHTML = `<div class="search-result"><span>No locations found.</span></div>`;
    box.classList.add("show");
    return;
  }
  box.innerHTML = results.map((r, i) => `
    <div class="search-result" data-i="${i}" role="option">
      <div><strong>${escapeHTML(r.name)}</strong><span>${escapeHTML([r.admin1, r.country].filter(Boolean).join(", "))}</span></div>
      <span>${Number(r.latitude).toFixed(2)}, ${Number(r.longitude).toFixed(2)}</span>
    </div>`).join("");
  box.classList.add("show");

  box.querySelectorAll("[data-i]").forEach(el => {
    el.addEventListener("click", () => selectLocation(results[Number(el.dataset.i)]));
  });
}

function selectLocation(result) {
  $("searchResults").classList.remove("show");
  $("searchInput").value = "";
  loadWeather({
    name: result.name,
    admin1: result.admin1 || "",
    country: result.country || "",
    latitude: Number(result.latitude),
    longitude: Number(result.longitude)
  });
  showPage("home");
}

function escapeHTML(v) {
  return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

/* ---------- geolocation ---------- */
async function reverseGeocode(lat, lon) {
  try {
    const data = await fetchJSON(`${REVERSE_API}?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    return {
      name: data.city || data.locality || data.principalSubdivision || "My Location",
      admin1: data.principalSubdivision || "",
      country: data.countryName || ""
    };
  } catch {
    return { name: "My Location", admin1: "", country: "" };
  }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    showToast("Geolocation is not supported — search for a city instead.");
    return;
  }
  showToast("Detecting your location…");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      const place = await reverseGeocode(latitude, longitude);
      loadWeather({ ...place, latitude, longitude });
    },
    () => {
      showToast("Location access denied — showing default city.");
      loadWeather(DEFAULT_PLACE);
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
  );
}

/* ---------- units ---------- */
function setUnit(unit) {
  state.unit = unit;
  localStorage.setItem("skycastUnit", unit);
  document.querySelectorAll(".unit-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.unit === unit));
  if (state.weather) renderAll();
}

/* ---------- init ---------- */
function init() {
  // sidebar navigation (each item opens its own page)
  document.querySelectorAll(".nav-item").forEach(btn =>
    btn.addEventListener("click", () => showPage(btn.dataset.nav)));
  $("brandLink").addEventListener("click", (e) => { e.preventDefault(); showPage("home"); });

  // topbar
  $("locateBtn").addEventListener("click", useMyLocation);
  $("bellBtn").addEventListener("click", () => showPage("alerts"));
  $("themeBtn").addEventListener("click", () => {
    const eff = document.body.classList.contains("light") ? "light" : "dark";
    setTheme(eff === "light" ? "dark" : "light");
  });
  $("settingsBtn").addEventListener("click", () => showPage("settings"));
  $("heroLocation").addEventListener("click", () => {
    $("searchInput").focus();
    $("searchInput").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // search
  let debounce;
  $("searchInput").addEventListener("input", (e) => {
    const q = e.target.value.trim();
    clearTimeout(debounce);
    if (q.length < 2) { $("searchResults").classList.remove("show"); return; }
    debounce = setTimeout(async () => {
      try { renderSearchResults(await searchLocations(q)); }
      catch { showToast("Search is temporarily unavailable."); }
    }, 300);
  });

  $("searchInput").addEventListener("keydown", async (e) => {
    if (e.key === "Escape") $("searchResults").classList.remove("show");
    if (e.key !== "Enter") return;
    const q = $("searchInput").value.trim();
    if (q.length < 2) return;
    try {
      const results = await searchLocations(q);
      if (results[0]) selectLocation(results[0]);
      else showToast(`No results for “${q}”.`);
    } catch { showToast("Search failed. Try again."); }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) $("searchResults").classList.remove("show");
  });

  // view-all toggles
  $("hourlyToggle").addEventListener("click", () => {
    state.hourlyExpanded = !state.hourlyExpanded;
    renderHourly();
  });
  $("dailyToggle").addEventListener("click", () => {
    state.dailyExpanded = !state.dailyExpanded;
    renderDaily();
  });

  // units & theme
  document.querySelectorAll(".unit-btn").forEach(btn =>
    btn.addEventListener("click", () => setUnit(btn.dataset.unit)));
  document.querySelectorAll(".theme-btn").forEach(btn =>
    btn.addEventListener("click", () => setTheme(btn.dataset.theme)));
  setUnit(state.unit);
  applyTheme();

  // auto refresh every 10 minutes
  state.refreshTimer = setInterval(() => {
    if (state.location && !state.isLoading) loadWeather(state.location, { silent: true });
  }, 10 * 60 * 1000);

  // initial load: saved place first, otherwise quiet geolocation, else default city
  const saved = localStorage.getItem("skycastPlace");
  if (saved) {
    try { loadWeather(JSON.parse(saved)); return; } catch { /* fall through */ }
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const place = await reverseGeocode(latitude, longitude);
        loadWeather({ ...place, latitude, longitude });
      },
      () => loadWeather(DEFAULT_PLACE),
      { timeout: 6000, maximumAge: 600000 }
    );
  } else {
    loadWeather(DEFAULT_PLACE);
  }
}

document.addEventListener("DOMContentLoaded", init);
