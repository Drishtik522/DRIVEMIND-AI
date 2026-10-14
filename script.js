
"use strict";

document.addEventListener("DOMContentLoaded", function () {
  const $ = (id) => document.getElementById(id);

  // Check that the HTML contains the controls this script expects.
  const requiredIds = [
    "pageTitle", "speedValue", "riskValue", "brakeValue",
    "distanceValue", "speedInput", "accelInput", "brakeInput",
    "startBtn", "stopBtn", "resetBtn", "analyzeBtn",
    "riskyBtn", "safeBtn", "exportBtn", "historyRows",
    "factorList", "breakdown", "gauge", "gaugeValue"
  ];

  const missing = requiredIds.filter((id) => !$(id));

  if (missing.length) {
    console.error("DriveMind AI: Missing HTML elements:", missing);
    alert(
      "DriveMind AI could not connect to all controls.\n\n" +
      "Missing HTML IDs: " + missing.join(", ") +
      "\n\nMake sure you are using the matching index.html."
    );
    return;
  }

  const STORAGE_KEY = "drivemind_demo_trips_v1";

  const colors = {
    LOW: "#4fe0a0",
    MODERATE: "#f4d35e",
    HIGH: "#ffab66",
    CRITICAL: "#ff657a"
  };

  const state = {
    speed: 42,
    acceleration: 0.8,
    harshBrakes: 0,
    distance: 0,
    running: false,
    timer: null,
    ticks: 0,
    trips: []
  };

  function readTrips() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      state.trips = Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.warn("Could not read saved demo trips.", error);
      state.trips = [];
    }
  }

  function persistTrips() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.trips));
    } catch (error) {
      console.warn("Could not save trip history.", error);
    }
  }

  // Transparent demonstration rules, not a trained AI model.
  function analyze(speed, acceleration, brakes) {
    const speedPoints = Math.min(35, Math.max(0, (speed - 50) * 0.55));
    const accelerationPoints = Math.min(
      25, Math.max(0, (Math.abs(acceleration) - 2) * 5)
    );
    const brakePoints = Math.min(35, brakes * 5);

    const score = Math.round(
      Math.min(100, speedPoints + accelerationPoints + brakePoints + 5)
    );

    let level, headline, explanation, advice;

    if (score < 25) {
      level = "LOW";
      headline = "Drive smoothly";
      explanation = "The current demo inputs produce a relatively low score. This does not guarantee safety.";
      advice = "Maintain a safe following distance and adapt your speed to actual road conditions.";
    } else if (score < 50) {
      level = "MODERATE";
      headline = "Review driving inputs";
      explanation = "One or more simulated inputs have increased the illustrative risk score.";
      advice = "Review your speed and acceleration, anticipate traffic changes and leave enough stopping distance.";
    } else if (score < 75) {
      level = "HIGH";
      headline = "Elevated risk indicators";
      explanation = "The demo rules detected a combination of concerning driving inputs.";
      advice = "Where safe, reduce speed, avoid abrupt manoeuvres and increase following distance.";
    } else {
      level = "CRITICAL";
      headline = "High demo risk score";
      explanation = "The simulated inputs produced a very high score. This is not a real-world safety warning.";
      advice = "Prioritize safe driving and respond to actual conditions. Never interact with this dashboard while driving.";
    }

    return {
      score, level, headline, explanation, advice,
      factors: [
        { name: "Speed contribution", value: Math.round(speedPoints), max: 35 },
        { name: "Acceleration contribution", value: Math.round(accelerationPoints), max: 25 },
        { name: "Harsh braking contribution", value: Math.round(brakePoints), max: 35 },
        { name: "Baseline demo value", value: 5, max: 5 }
      ]
    };
  }

  function riskClass(level) {
    return {
      LOW: "status-low",
      MODERATE: "status-medium",
      HIGH: "status-high",
      CRITICAL: "status-critical"
    }[level] || "status-low";
  }

  function setStatus(id, label, level) {
    const element = $(id);
    if (!element) return;
    element.textContent = label;
    element.className = "status " + riskClass(level);
  }

  function safeText(id, value) {
    if ($(id)) $(id).textContent = value;
  }

  function updateDashboard() {
    const result = analyze(
      state.speed,
      state.acceleration,
      state.harshBrakes
    );

    safeText("speedValue", Math.round(state.speed));
    safeText("riskValue", result.score);
    safeText("brakeValue", state.harshBrakes);
    safeText("distanceValue", state.distance.toFixed(1));
    safeText("gaugeValue", result.score);

    $("speedBar").style.width = (state.speed / 140 * 100) + "%";
    $("riskBar").style.width = result.score + "%";
    $("riskBar").style.background = colors[result.level];
    $("brakeBar").style.width = (state.harshBrakes / 10 * 100) + "%";
    $("distanceBar").style.width = Math.min(100, state.distance * 10) + "%";

    $("gauge").style.background =
      `conic-gradient(${colors[result.level]} ${result.score * 3.6}deg, #263746 ${result.score * 3.6}deg 360deg)`;

    safeText("riskHeadline", result.headline);
    safeText("riskExplanation", result.explanation);
    safeText("riskFoot", result.level + " illustrative risk");
    safeText("recommendationText", result.advice);

    setStatus("riskStatus", result.level + " RISK", result.level);

    if (state.speed > 100) {
      safeText("speedHint", "High speed in this demo scenario");
      setStatus("speedStatus", "HIGH", "HIGH");
    } else if (state.speed > 80) {
      safeText("speedHint", "Elevated speed in this demo");
      setStatus("speedStatus", "ELEVATED", "MODERATE");
    } else {
      safeText("speedHint", "No speed threshold exceeded in demo");
      setStatus("speedStatus", "NORMAL", "LOW");
    }

    if (Math.abs(state.acceleration) > 3) {
      safeText("accelHint", "Strong acceleration input");
      setStatus("accelStatus", "ABRUPT", "HIGH");
    } else {
      safeText("accelHint", "No strong acceleration input");
      setStatus("accelStatus", "SMOOTH", "LOW");
    }

    if (state.harshBrakes >= 5) {
      safeText("brakeHint", "Several braking events entered");
      setStatus("brakeStatus", "ELEVATED", "HIGH");
    } else if (state.harshBrakes > 0) {
      safeText("brakeHint", "Braking events entered in demo");
      setStatus("brakeStatus", "REVIEW", "MODERATE");
    } else {
      safeText("brakeHint", "No harsh braking events entered");
      setStatus("brakeStatus", "NORMAL", "LOW");
    }

    safeText("analysisRisk", result.score);
    safeText("analysisSpeed", Math.round(state.speed));
    safeText("analysisAccel", state.acceleration.toFixed(1));

    $("factorList").innerHTML = result.factors.map(f => `
      <div class="factor-line">
        <span>${f.name}</span><strong>${f.value}/${f.max}</strong>
      </div>
    `).join("");

    $("breakdown").innerHTML = result.factors.map(f => `
      <div class="breakdown-item">
        <div class="breakdown-title">
          <strong>${f.name}</strong><span>${f.value} points</span>
        </div>
        <div class="breakdown-track">
          <span style="width:${f.value / f.max * 100}%"></span>
        </div>
      </div>
    `).join("");

    $("speedInput").value = state.speed;
    $("accelInput").value = state.acceleration;
    $("brakeInput").value = state.harshBrakes;

    safeText("speedInputLabel", Math.round(state.speed));
    safeText("accelInputLabel", state.acceleration.toFixed(1));
    safeText("brakeInputLabel", state.harshBrakes);

    renderHistory();
  }

  function setRunning(running) {
    state.running = running;
    safeText("driveState", running ? "SIMULATION RUNNING" : "STANDBY");

    const pill = $("driveState").parentElement;
    if (pill) pill.classList.toggle("running", running);
  }

  function saveTrip() {
    const result = analyze(state.speed, state.acceleration, state.harshBrakes);

    state.trips.unshift({
      time: new Date().toLocaleString(),
      speed: Math.round(state.speed),
      acceleration: state.acceleration.toFixed(1),
      brakes: state.harshBrakes,
      risk: result.score,
      level: result.level,
      distance: state.distance.toFixed(2)
    });

    state.trips = state.trips.slice(0, 100);
    persistTrips();
  }

  function stopDrive() {
    const wasRunning = state.running;

    if (state.timer !== null) {
      clearInterval(state.timer);
      state.timer = null;
    }

    setRunning(false);

    if (wasRunning) saveTrip();
    renderHistory();
  }

  function startDrive() {
    if (state.running) return;

    setRunning(true);

    state.timer = setInterval(() => {
      const oldSpeed = state.speed;

      state.speed = Math.max(
        0, Math.min(140, state.speed + Math.random() * 20 - 10)
      );

      state.acceleration = Number((Math.random() * 3.6 - 1.8).toFixed(1));

      if (Math.random() < 0.12 && state.harshBrakes < 10) {
        state.harshBrakes++;
        state.acceleration = -3.5;
      }

      state.distance += ((oldSpeed + state.speed) / 2) / 3600 * 1.6;
      state.ticks++;

      updateDashboard();

      if (state.ticks % 5 === 0) saveTrip();
    }, 1600);
  }

  function renderHistory() {
    const rows = $("historyRows");
    const empty = $("emptyHistory");

    safeText("tripCount", state.trips.length);

    const average = state.trips.length
      ? Math.round(state.trips.reduce((sum, t) => sum + Number(t.risk), 0) / state.trips.length)
      : 0;

    safeText("avgRisk", average);

    if (empty) empty.style.display = state.trips.length ? "none" : "block";

    rows.innerHTML = state.trips.map(t => `
      <tr>
        <td>${escapeHTML(t.time)}</td>
        <td>${Number(t.speed)} km/h</td>
        <td>${Number(t.acceleration).toFixed(1)} m/s²</td>
        <td>${Number(t.brakes)}</td>
        <td><strong>${Number(t.risk)}</strong></td>
        <td><span class="status ${riskClass(t.level)}">${escapeHTML(t.level)}</span></td>
      </tr>
    `).join("");
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[ch]);
  }

  function exportCSV() {
    if (!state.trips.length) {
      alert("No trip records yet. Start a simulated drive first.");
      return;
    }

    const headers = [
      "Time", "Speed_kmh", "Acceleration_m_s2",
      "Harsh_Braking_Events", "Risk_Score", "Risk_Level", "Distance_km"
    ];

    const lines = state.trips.map(t => [
      t.time, t.speed, t.acceleration, t.brakes,
      t.risk, t.level, t.distance
    ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(","));

    const blob = new Blob(
      ["\uFEFF" + [headers.join(","), ...lines].join("\r\n")],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "drivemind-demo-trips.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function resetDemo() {
    stopDrive();
    state.speed = 42;
    state.acceleration = 0.8;
    state.harshBrakes = 0;
    state.distance = 0;
    state.ticks = 0;
    updateDashboard();
  }

  function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
      page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll(".nav-item").forEach(button => {
      button.classList.toggle("active", button.dataset.page === pageId);
    });

    const titles = {
      overview: "Driving Overview",
      driving: "Driving Analysis",
      vehicle: "Vehicle Status",
      history: "Trip History"
    };

    safeText("pageTitle", titles[pageId] || "DriveMind AI");
  }

  // Connect the sidebar buttons.
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  // Connect driving controls.
  $("startBtn").addEventListener("click", startDrive);
  $("stopBtn").addEventListener("click", stopDrive);
  $("resetBtn").addEventListener("click", resetDemo);
  $("analyzeBtn").addEventListener("click", updateDashboard);
  $("exportBtn").addEventListener("click", exportCSV);

  // Connect sliders.
  $("speedInput").addEventListener("input", event => {
    state.speed = Number(event.target.value);
    updateDashboard();
  });

  $("accelInput").addEventListener("input", event => {
    state.acceleration = Number(event.target.value);
    updateDashboard();
  });

  $("brakeInput").addEventListener("input", event => {
    state.harshBrakes = Number(event.target.value);
    updateDashboard();
  });

  // Load predefined demonstration scenarios.
  $("riskyBtn").addEventListener("click", () => {
    stopDrive();
    state.speed = 115;
    state.acceleration = 4.2;
    state.harshBrakes = 6;
    updateDashboard();
  });

  $("safeBtn").addEventListener("click", () => {
    stopDrive();
    state.speed = 45;
    state.acceleration = 0.5;
    state.harshBrakes = 0;
    updateDashboard();
  });

  readTrips();
  setRunning(false);
  updateDashboard();

  console.log("DriveMind AI loaded successfully. Controls are connected.");
});
