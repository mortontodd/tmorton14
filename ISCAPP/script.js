let config = null;

let score = 0;
let drives = 0;
let touchdowns = 0;
let turnovers = 0;
let totalYards = 0;
let playsRun = 0;
let longestPlay = 0;
let bestDrive = 0;

let yardLine = 20;
let down = 1;
let yardsToGo = 10;
let driveStart = 20;
let driveYards = 0;
let gameActive = true;
let momentum = 50;

const scoreEl = document.getElementById("score");
const drivesEl = document.getElementById("drives");
const touchdownsEl = document.getElementById("touchdowns");
const downDisplayEl = document.getElementById("downDisplay");
const yardLineEl = document.getElementById("yardLine");
const yardsToGoEl = document.getElementById("yardsToGo");
const yardMarkerEl = document.getElementById("yardMarker");
const playResultEl = document.getElementById("playResult");
const logEl = document.getElementById("log");
const newDriveBtn = document.getElementById("newDriveBtn");
const playButtons = document.querySelectorAll(".play-btn");
const fieldContainer = document.querySelector(".field-container");

fetch("questions.json")
  .then(response => response.json())
  .then(data => {
    config = data;
    startNewDrive();
  })
  .catch(error => {
    console.error(error);
    playResultEl.textContent = "Could not load questions.json. Make sure it is inside the ISCAPP folder.";
  });

playButtons.forEach(button => {
  button.addEventListener("click", () => runPlay(button.dataset.play));
});

newDriveBtn.addEventListener("click", startNewDrive);

function startNewDrive() {
  drives++;
  yardLine = 20;
  down = 1;
  yardsToGo = 10;
  driveStart = 20;
  driveYards = 0;
  momentum = 50;
  gameActive = true;

  logEl.innerHTML = "";
  addLog("New drive started at your own 20-yard line.", "good");
  playResultEl.textContent = "Choose your first play.";
  enablePlayButtons();

  updateUI();
}

function runPlay(playType) {
  if (!gameActive || !config) return;

  const play = config.plays[playType];
  const result = calculatePlayResult(playType, play);

  playsRun++;

  if (result.turnover) {
    endDrive(result.message, "bad", true);
    return;
  }

  yardLine += result.yards;
  yardLine = Math.max(1, Math.min(100, yardLine));

  driveYards = yardLine - driveStart;
  totalYards += result.yards;
  longestPlay = Math.max(longestPlay, result.yards);

  if (result.yards >= 15) {
    triggerBigPlay();
  }

  if (yardLine >= 100) {
    score += 7;
    touchdowns++;
    bestDrive = Math.max(bestDrive, driveYards);
    playResultEl.innerHTML = `TOUCHDOWN! ${result.message}`;
    addLog(`TOUCHDOWN! ${result.message}`, "td");
    triggerTouchdown();
    endDrive("Touchdown! Start another drive to keep playing.", "td", false);
    updateUI();
    return;
  }

  yardsToGo -= result.yards;

  if (result.yards > 0) {
    momentum = Math.min(100, momentum + result.yards);
  } else {
    momentum = Math.max(0, momentum + result.yards - 5);
  }

  if (yardsToGo <= 0) {
    down = 1;
    yardsToGo = Math.min(10, 100 - yardLine);
    playResultEl.textContent = `${result.message} First down!`;
    addLog(`${result.message} First down.`, "good");
  } else {
    down++;

    if (down > 4) {
      endDrive(`${result.message} Turnover on downs.`, "bad", true);
      updateUI();
      return;
    }

    playResultEl.textContent = result.message;
    addLog(result.message, result.yards >= 0 ? "good" : "bad");
  }

  updateUI();
}

function calculatePlayResult(playType, play) {
  const roll = Math.random();
  let yards = randomInt(play.min, play.max);
  let message = "";

  const momentumBonus = momentum >= 70 ? 2 : momentum <= 30 ? -2 : 0;
  yards += momentumBonus;

  if (playType === "run") {
    if (roll < play.turnoverChance) {
      return { turnover: true, yards: 0, message: "Fumble on the run. Turnover!" };
    }

    if (roll > 0.88) {
      yards += randomInt(8, 18);
      message = `Breakaway run for ${yards} yards!`;
    } else if (yards <= 0) {
      message = `Stuffed at the line for ${yards} yards.`;
    } else {
      message = `Run play gains ${yards} yards.`;
    }
  }

  if (playType === "shortPass") {
    if (roll < play.turnoverChance) {
      return { turnover: true, yards: 0, message: "Short pass intercepted. Turnover!" };
    }

    if (roll < 0.25) {
      yards = 0;
      message = "Short pass incomplete.";
    } else if (yards >= 12) {
      message = `Sharp completion for ${yards} yards!`;
    } else {
      message = `Short pass complete for ${yards} yards.`;
    }
  }

  if (playType === "deepBall") {
    if (roll < play.turnoverChance) {
      return { turnover: true, yards: 0, message: "Deep ball intercepted. Turnover!" };
    }

    if (roll < 0.42) {
      yards = 0;
      message = "Deep ball incomplete.";
    } else if (yards >= 30) {
      message = `Huge deep ball for ${yards} yards!`;
    } else {
      message = `Deep pass complete for ${yards} yards.`;
    }
  }

  if (playType === "qbSneak") {
    if (roll < play.turnoverChance) {
      return { turnover: true, yards: 0, message: "QB sneak fumbled. Turnover!" };
    }

    if (yardsToGo <= 2 && roll > 0.18) {
      yards = randomInt(1, 3);
      message = `QB sneak picks up ${yards} yards.`;
    } else if (yardsToGo > 3) {
      yards = randomInt(0, 2);
      message = `QB sneak only gets ${yards} yards.`;
    } else {
      message = `QB sneak gains ${yards} yards.`;
    }
  }

  yards = Math.max(-10, Math.min(50, yards));

  return {
    turnover: false,
    yards,
    message
  };
}

function endDrive(message, type, isTurnover) {
  gameActive = false;

  if (isTurnover) {
    turnovers++;
    triggerShake();
  }

  bestDrive = Math.max(bestDrive, driveYards);

  playResultEl.textContent = message;
  addLog(message, type);
  disablePlayButtons();
  updateUI();
}

function updateUI() {
  scoreEl.textContent = score;
  drivesEl.textContent = drives;
  touchdownsEl.textContent = touchdowns;

  downDisplayEl.textContent = `${ordinal(down)} & ${yardsToGo}`;
  yardLineEl.textContent = yardLine >= 100 ? "TD" : yardLine;
  yardsToGoEl.textContent = yardLine >= 100 ? "0" : yardsToGo;

  const fieldPercent = ((yardLine - 20) / 80) * 100;
  yardMarkerEl.style.left = `${Math.max(0, Math.min(100, fieldPercent))}%`;
}

function addLog(text, type = "") {
  const item = document.createElement("div");
  item.className = `log-item ${type}`;
  item.textContent = text;
  logEl.prepend(item);
}

function disablePlayButtons() {
  playButtons.forEach(button => button.disabled = true);
}

function enablePlayButtons() {
  playButtons.forEach(button => button.disabled = false);
}

function triggerBigPlay() {
  fieldContainer.classList.add("big-play");
  setTimeout(() => fieldContainer.classList.remove("big-play"), 600);
}

function triggerTouchdown() {
  fieldContainer.classList.add("touchdown-glow");
  createConfetti();
  setTimeout(() => fieldContainer.classList.remove("touchdown-glow"), 1200);
}

function triggerShake() {
  document.body.classList.add("screen-shake");
  setTimeout(() => document.body.classList.remove("screen-shake"), 400);
}

function createConfetti() {
  const colors = ["#facc15", "#22c55e", "#38bdf8", "#cc0033", "#ffffff"];

  for (let i = 0; i < 80; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.left = `${Math.random() * 100}%`;
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = `${Math.random() * 0.4}s`;
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

    document.body.appendChild(confetti);

    setTimeout(() => {
      confetti.remove();
    }, 2200);
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ordinal(number) {
  if (number === 1) return "1st";
  if (number === 2) return "2nd";
  if (number === 3) return "3rd";
  return "4th";
}