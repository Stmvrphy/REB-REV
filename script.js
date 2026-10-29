(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const NAMES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
  const SCALES = { pmaj: [0, 2, 4, 7, 9], pmin: [0, 3, 5, 7, 10], maj: [0, 2, 4, 5, 7, 9, 11], chr: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

  const S = { src: "demo", view: "mix", cols: 5, rows: 3, scale: "pmaj", root: 48, thr: 28, sens: 0.03, cool: 320,
    wave: "triangle", atk: 0.008, rel: 0.7, cut: 3200, rev: 0.3, vol: 0.6, mapVel: true, mapPan: true, mirror: true,
    tint: 0.22, veil: 0, lines: true, notes: false, parts: false,
    mode: "zonas", top: "G1", lx: 0.5, nl: 3, segs: 7, sdur: 6, steps: 16, bright: 90, mapDir: false, invert: false };

  // voces del modo "Varias líneas": cada línea trae su forma de onda, envolvente, octava y filtro
  const VOICES = [
    { name: "golpe", wave: "square", atk: 0.003, rel: 0.18, oct: 12, cut: 5000, color: "#E2FF3B", ej: "ave.wav" },
    { name: "estela", wave: "sine", atk: 0.09, rel: 2.4, oct: 0, cut: 0, color: "#EEF0FF", ej: "auto.wav" },
    { name: "lejano", wave: "sawtooth", atk: 0.02, rel: 1.0, oct: -12, cut: 650, color: "#9A7BFF", ej: "lluvia.wav" },
    { name: "brillo", wave: "triangle", atk: 0.002, rel: 0.6, oct: 24, cut: 0, color: "#5CE1E6", ej: "campana.wav" },
  ];
  const rgba = (hex, a) => "rgba(" + parseInt(hex.slice(1, 3), 16) + "," + parseInt(hex.slice(3, 5), 16) + "," + parseInt(hex.slice(5, 7), 16) + "," + a.toFixed(3) + ")";

  let toastT = 0;
  function toast(msg) { const t = $("toast"); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }

  // ================= dock =================
  document.querySelectorAll(".trigger").forEach((tr) => tr.addEventListener("click", () => {
    const id = tr.dataset.panel, open = tr.getAttribute("aria-expanded") === "true";
    document.querySelectorAll(".trigger").forEach((t) => { t.setAttribute("aria-expanded", "false"); const p = $(t.dataset.panel); if (p) p.hidden = true; });
    if (!open) { tr.setAttribute("aria-expanded", "true"); const p = $(id); if (p) p.hidden = false; }
  }));
  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => {
    const p = b.closest(".panel"); if (p) { p.hidden = true; const tr = document.querySelector('[data-panel="' + p.id + '"]'); if (tr) tr.setAttribute("aria-expanded", "false"); }
  }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll("[data-close]").forEach((b) => { const p = b.closest(".panel"); if (p && !p.hidden) b.click(); }); });

  // ================= fuentes =================
  const video = document.createElement("video");
  video.muted = true; video.loop = true; video.playsInline = true;
  let stream = null;
  const demo = document.createElement("canvas"); demo.width = 640; demo.height = 360;
  const dctx = demo.getContext("2d");
  const lanes = [0.22, 0.5, 0.78], cars = [];
  for (let i = 0; i < 7; i++) {
    const lane = i % 3;
    cars.push({ lane, x: Math.random() * 640, v: (lane === 1 ? -1 : 1) * (90 + Math.random() * 160), w: 60 + Math.random() * 70, c: ["#E2FF3B", "#EEF0FF", "#6A6AFF", "#9A7BFF"][i % 4] });
  }
  let birdT = 0;
  function drawDemo(dt) {
    dctx.fillStyle = "#FFFFFF"; dctx.fillRect(0, 0, 640, 360);
    dctx.fillStyle = "#F5F5F5"; lanes.forEach((y) => dctx.fillRect(0, y * 360 - 34, 640, 68));
    dctx.strokeStyle = "rgba(0,0,0,.25)"; dctx.setLineDash([18, 16]); dctx.lineWidth = 2;
    [0.36, 0.64].forEach((y) => { dctx.beginPath(); dctx.moveTo(0, y * 360); dctx.lineTo(640, y * 360); dctx.stroke(); });
    dctx.setLineDash([]);
    for (const c of cars) {
      c.x += c.v * dt;
      if (c.v > 0 && c.x > 700) { c.x = -c.w - Math.random() * 200; c.v = 90 + Math.random() * 160; }
      if (c.v < 0 && c.x < -c.w - 60) { c.x = 640 + Math.random() * 200; c.v = -(90 + Math.random() * 160); }
      dctx.fillStyle = "#111111"; dctx.fillRect(c.x, lanes[c.lane] * 360 - 24, c.w, 48);
    }
    birdT += dt;
    dctx.fillStyle = "#111111"; dctx.beginPath(); dctx.arc((birdT * 70) % 760 - 60, 40 + Math.sin(birdT * 2.2) * 18, 7, 0, Math.PI * 2); dctx.fill();
  }

  const photoImg = new Image();
  let photoLoaded = false;

  function setSrc(src, status) {
    S.src = src; prev = null;
    $("srcDemo").setAttribute("aria-pressed", String(src === "demo"));
    $("srcCam").setAttribute("aria-pressed", String(src === "cam" || src === "camoff"));
    $("srcFile").setAttribute("aria-pressed", String(src === "file"));
    if ($("srcPhoto")) $("srcPhoto").setAttribute("aria-pressed", String(src === "photo"));
    $("camCtx").hidden = !(src === "cam" || src === "camoff");
    $("vidCtx").hidden = src !== "file";
    if ($("photoCtx")) $("photoCtx").hidden = src !== "photo";
    $("camOff").textContent = src === "camoff" ? "Encender cámara" : "Apagar cámara";
    $("status").textContent = status;
  }
  function stopStream() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }
  async function startCam() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("sin API");
      stopStream(); video.pause(); video.removeAttribute("src");
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false });
      video.srcObject = stream; await video.play();
      setSrc("cam", "Fuente: cámara");
    } catch (e) {
      toast("Esta vista no permite usar la cámara: abre la versión local o la de GitHub Pages");
      $("status").textContent = "Cámara bloqueada en esta vista · versión local (localhost) o GitHub Pages";
    }
  }
  $("srcDemo").addEventListener("click", () => { stopStream(); video.pause(); setSrc("demo", "Fuente: ejemplo · calle sintética"); });
  $("srcCam").addEventListener("click", startCam);
  $("camOff").addEventListener("click", () => {
    if (S.src === "cam") { stopStream(); video.srcObject = null; setSrc("camoff", "Cámara apagada"); }
    else startCam();
  });
  $("srcFile").addEventListener("click", () => $("fileInput").click());
  $("vChange").addEventListener("click", () => $("fileInput").click());
  $("fileInput").addEventListener("change", async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    stopStream(); video.srcObject = null; video.src = URL.createObjectURL(f); video.loop = $("vLoop").getAttribute("aria-pressed") === "true";
    try { await video.play(); } catch (_) {}
    setSrc("file", "Fuente: " + f.name);
    e.target.value = "";
  });
  $("vPlay").addEventListener("click", () => { video.play().catch(() => {}); });
  $("vPause").addEventListener("click", () => video.pause());
  $("vLoop").addEventListener("click", (e) => {
    video.loop = !video.loop; e.currentTarget.setAttribute("aria-pressed", String(video.loop));
    toast(video.loop ? "Loop activado" : "Loop desactivado");
  });

  if ($("srcPhoto")) {
    $("srcPhoto").addEventListener("click", () => {
      if (photoLoaded) {
        stopStream(); video.pause();
        setSrc("photo", "Fuente: " + (photoImg.dataset.name || "foto"));
      } else if ($("photoInput")) {
        $("photoInput").click();
      }
    });
  }
  if ($("photoChange")) $("photoChange").addEventListener("click", () => $("photoInput") && $("photoInput").click());
  if ($("photoInput")) {
    $("photoInput").addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      stopStream(); video.pause();
      photoImg.onload = () => {
        photoLoaded = true;
        photoImg.dataset.name = f.name;
        setSrc("photo", "Fuente: " + f.name);
      };
      photoImg.src = URL.createObjectURL(f);
      e.target.value = "";
    });
  }

  // ================= capas =================
  function bindToggle(id, key, after) {
    const el = $(id);
    if (!el) return;
    el.addEventListener("click", (e) => { S[key] = !S[key]; e.currentTarget.setAttribute("aria-pressed", String(S[key])); if (after) after(); updVisState(); });
  }
  function updVisState() {
    if (!$("stVis")) return;
    const on = [S.lines && "líneas", S.notes && "notas", S.parts && "partíc."].filter(Boolean);
    $("stVis").textContent = S.view === "mask" ? "máquina" : on.length ? on.length + " capas" : "solo video";
  }
  bindToggle("tLines", "lines");
  if ($("tNotes")) bindToggle("tNotes", "notes");
  if ($("tParts")) bindToggle("tParts", "parts", () => { parts.length = 0; });
  if ($("tSignal")) $("tSignal").addEventListener("click", (e) => { const sig = $("signal"); if (!sig) return; const on = sig.hidden; sig.hidden = !on; e.currentTarget.setAttribute("aria-pressed", String(on)); });
  if ($("sigHide")) $("sigHide").addEventListener("click", () => { const sig = $("signal"); if (sig) sig.hidden = true; if ($("tSignal")) $("tSignal").setAttribute("aria-pressed", "false"); });

  // ================= audio =================
  let ac = null, main = null, master, analyser, recDest, shape;
  const impulses = new WeakMap();
  function impulse(ctx) {
    if (impulses.has(ctx)) return impulses.get(ctx);
    const len = Math.floor(ctx.sampleRate * 2.6), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    impulses.set(ctx, buf); return buf;
  }
  function buildChain(ctx) {
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = S.cut; filter.Q.value = 0.8;
    const dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver(), out = ctx.createGain();
    conv.buffer = impulse(ctx);
    filter.connect(dry); filter.connect(conv); conv.connect(wet); dry.connect(out); wet.connect(out);
    const ch = { input: filter, filter, dry, wet, out }; setRev(ch); return ch;
  }
  function setRev(ch) { ch.dry.gain.value = 1 - S.rev * 0.6; ch.wet.gain.value = S.rev * 0.9; }
  function initAudio() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    main = buildChain(ac);
    master = ac.createGain(); master.gain.value = S.vol;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    analyser = ac.createAnalyser(); analyser.fftSize = 1024;
    shape = ac.createAnalyser(); shape.fftSize = 2048; main.filter.connect(shape);
    recDest = ac.createMediaStreamDestination();
    main.out.connect(master); master.connect(comp); comp.connect(analyser); analyser.connect(ac.destination); comp.connect(recDest);
    decodeAllScannerSounds();
  }

  // ---- 1. Mapeo de 13 secciones en modo escáner a audios de /sonidos (excluyendo LEEME.md) ----
  const SCANNER_SEGS = 13;
  const SCANNER_SOUNDS = [
    { id: 1,  name: "Lead Guitar",     file: "100-bpm-lead-guitar-5.wav" },
    { id: 2,  name: "Number Nine",     file: "20090322numbernine.wav" },
    { id: 3,  name: "Harmonic",        file: "3rd-fret-harmonic.wav" },
    { id: 4,  name: "Distorted Chord", file: "distorted-guitar-note-sustained-to-chord.wav" },
    { id: 5,  name: "F Note",          file: "f.mp3" },
    { id: 6,  name: "Feed Me 1",       file: "feedme.wav" },
    { id: 7,  name: "Feed Me 3",       file: "feedme3.wav" },
    { id: 8,  name: "Fuzz Factory",    file: "fuzzfactory1.wav" },
    { id: 9,  name: "Guitar Noise",    file: "guitar-noise-2.wav" },
    { id: 10, name: "Guitar Riff",     file: "guitar-riff.wav" },
    { id: 11, name: "String Slide",    file: "guitar-string-slide-noise.wav" },
    { id: 12, name: "Amp Noise",       file: "guitar_amp_noise.wav" },
    { id: 13, name: "Phased Sweep",    file: "phased-axe-sweep-in-d.wav" }
  ];
  const scannerRawBuffers = new Array(SCANNER_SEGS).fill(null);
  const scannerAudioBuffers = new Array(SCANNER_SEGS).fill(null);
  const activeScannerSources = new Array(SCANNER_SEGS).fill(null);
  const audioBuffersByFile = new Map();
  const activeZoneSampleSources = new Array(5).fill(null);

  // 3. Mapeo de los 3 grupos de audios para las 5 zonas superiores
  const TOP_GROUPS = {
    G1: [
      { name: "3rd-fret-harmonic", file: "3rd-fret-harmonic.wav" },
      { name: "100-bpm-lead-guitar-5", file: "100-bpm-lead-guitar-5.wav" },
      { name: "20090322numbernine", file: "20090322numbernine.wav" },
      { name: "distorted-guitar-note-sustained-to-chord", file: "distorted-guitar-note-sustained-to-chord.wav" },
      { name: "f", file: "f.mp3" }
    ],
    G2: [
      { name: "feedme", file: "feedme.wav" },
      { name: "feedme3", file: "feedme3.wav" },
      { name: "fuzzfactory1", file: "fuzzfactory1.wav" },
      { name: "guitar_amp_noise", file: "guitar_amp_noise.wav" },
      { name: "guitar-noise-2", file: "guitar-noise-2.wav" }
    ],
    G3: [
      { name: "guitar-riff", file: "guitar-riff.wav" },
      { name: "guitar-string-slide-noise", file: "guitar-string-slide-noise.wav" },
      { name: "phased-axe-sweep-in-d", file: "phased-axe-sweep-in-d.wav" },
      { name: "3rd-fret-harmonic", file: "3rd-fret-harmonic.wav" },
      { name: "feedme3", file: "feedme3.wav" }
    ]
  };

  // ---- Modo Partícula: 13 audios de /sonidos ordenados de menor a mayor intensidad horizontal ----
  const PARTICLE_SOUNDS = [
    "3rd-fret-harmonic.wav",                       // 0 · mínimo
    "20090322numbernine.wav",                       // 1
    "feedme.wav",                                   // 2
    "f.mp3",                                        // 3
    "feedme3.wav",                                  // 4
    "100-bpm-lead-guitar-5.wav",                    // 5
    "guitar-string-slide-noise.wav",                // 6
    "fuzzfactory1.wav",                             // 7
    "distorted-guitar-note-sustained-to-chord.wav", // 8
    "guitar_amp_noise.wav",                         // 9
    "guitar-riff.wav",                              // 10
    "guitar-noise-2.wav",                           // 11
    "phased-axe-sweep-in-d.wav"                     // 12 · máximo
  ];
  let prevPartMask = null;                        // máscara del fotograma anterior en modo Partícula
  const sprayParticles = [];                      // partículas de spray activas
  let lastPartSound = -1e9;                       // timestamp del último disparo de audio en Partícula

  function preloadScannerFiles() {
    SCANNER_SOUNDS.forEach((snd, idx) => {
      fetch("sonidos/" + snd.file)
        .then(res => res.arrayBuffer())
        .then(buf => {
          scannerRawBuffers[idx] = buf;
          if (ac) decodeScannerBuffer(idx);
        })
        .catch(e => console.warn("Error cargando sonido escáner " + snd.file, e));
    });
  }
  preloadScannerFiles();

  function decodeScannerBuffer(idx) {
    if (!ac || !scannerRawBuffers[idx] || scannerAudioBuffers[idx]) return;
    try {
      ac.decodeAudioData(scannerRawBuffers[idx].slice(0))
        .then(decoded => {
          scannerAudioBuffers[idx] = decoded;
          const f = SCANNER_SOUNDS[idx].file;
          audioBuffersByFile.set(f, decoded);
          audioBuffersByFile.set(f.replace(/\.[^.]+$/, ""), decoded);
          if (f.startsWith("phased-axe")) {
            audioBuffersByFile.set("phased-axes-sweep-in-d", decoded);
            audioBuffersByFile.set("phased-axes-sweep-in-d.wav", decoded);
          }
        })
        .catch(e => console.warn("Error decodificando sonido escáner " + SCANNER_SOUNDS[idx].file, e));
    } catch (e) {
      console.warn("Excepción decodificando sonido escáner", e);
    }
  }

  function decodeAllScannerSounds() {
    if (!ac) return;
    for (let i = 0; i < SCANNER_SEGS; i++) {
      decodeScannerBuffer(i);
    }
  }

  function playSampleByFile(file, vel, pan, trackIdx) {
    if (!soundOn()) return;
    let buf = audioBuffersByFile.get(file);
    if (!buf) {
      const idx = SCANNER_SOUNDS.findIndex(s => s.file === file || s.file.startsWith(file.split(".")[0]));
      if (idx !== -1) decodeScannerBuffer(idx);
      return;
    }
    if (trackIdx != null && activeZoneSampleSources[trackIdx]) {
      try {
        const prev = activeZoneSampleSources[trackIdx];
        prev.gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.04);
        setTimeout(() => { try { prev.src.stop(); } catch (_) {} }, 80);
      } catch (_) {}
    }
    try {
      const srcNode = ac.createBufferSource();
      srcNode.buffer = buf;
      const g = ac.createGain();
      const peak = Math.min(0.9, Math.max(0.18, (vel || 0.8) * 0.75));
      g.gain.setValueAtTime(peak, ac.currentTime);
      srcNode.connect(g);

      let outNode = g;
      if (ac.createStereoPanner) {
        const p = ac.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan || 0));
        g.connect(p);
        outNode = p;
      }
      outNode.connect(main.input);
      srcNode.start();
      if (trackIdx != null) activeZoneSampleSources[trackIdx] = { src: srcNode, gain: g };
    } catch (e) {
      console.warn("Error reproduciendo sample por archivo", file, e);
    }
  }

  function playScannerSample(s, vel, pan) {
    if (!soundOn()) return;
    if (!scannerAudioBuffers[s]) {
      decodeScannerBuffer(s);
      return;
    }
    if (activeScannerSources[s]) {
      try {
        const prev = activeScannerSources[s];
        prev.gain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.04);
        setTimeout(() => { try { prev.src.stop(); } catch (_) {} }, 80);
      } catch (_) {}
    }
    try {
      const srcNode = ac.createBufferSource();
      srcNode.buffer = scannerAudioBuffers[s];
      const g = ac.createGain();
      const peak = Math.min(0.85, Math.max(0.18, (vel || 0.8) * 0.7));
      g.gain.setValueAtTime(peak, ac.currentTime);
      srcNode.connect(g);

      let outNode = g;
      if (ac.createStereoPanner) {
        const p = ac.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan || 0));
        g.connect(p);
        outNode = p;
      }
      outNode.connect(main.input);
      srcNode.start();
      activeScannerSources[s] = { src: srcNode, gain: g };
    } catch (e) {
      console.warn("Error reproduciendo muestra escáner", e);
    }
  }
  function voice(ctx, inputs, midi, vel, pan, opt) {
    const t = ctx.currentTime + 0.01;
    const wave = opt ? opt.wave : S.wave, atk = opt ? opt.atk : S.atk, rel = opt ? opt.rel : S.rel;
    const o = ctx.createOscillator(); o.type = wave; o.frequency.value = mtof(midi);
    const g = ctx.createGain(), peak = 0.22 * vel, hold = 0.06;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + atk);
    g.gain.setTargetAtTime(peak * 0.6, t + atk, 0.08);
    g.gain.setTargetAtTime(0.0001, t + atk + hold, rel / 4);
    o.connect(g);
    let node = g;
    if (opt && opt.cut) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = opt.cut; f.Q.value = 1.2; g.connect(f); node = f; }
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; node.connect(p); node = p; }
    inputs.forEach((i) => node.connect(i));
    o.start(t); o.stop(t + atk + hold + rel * 1.6 + 0.1);
    return atk + hold + rel * 1.6 + 0.1;
  }
  const soundOn = () => ac && ac.state === "running";
  function updSoundBtn() {
    const on = soundOn();
    $("soundBtn").setAttribute("aria-pressed", String(on));
    $("soundBtn").textContent = on ? "■ Apagar sonido" : "▶ Activar sonido";
    if ($("noteDl")) $("noteDl").disabled = !on || lastMidi == null;
    if ($("recBtn")) $("recBtn").disabled = !on && !recording;
  }
  $("soundBtn").addEventListener("click", async () => {
    if (!ac) initAudio();
    try { if (ac.state === "running") await ac.suspend(); else await ac.resume(); } catch (_) {}
    updSoundBtn();
  });

  // ================= descargas =================
  let dlCap;
  async function downloadsCap() {
    if (dlCap !== undefined) return dlCap;
    try { dlCap = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (_) { dlCap = null; }
    return dlCap;
  }
  function wavFromBuffer(buf) {
    const ch = Math.min(2, buf.numberOfChannels), sr = buf.sampleRate, n = buf.length;
    const out = new ArrayBuffer(44 + n * ch * 2), v = new DataView(out);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * ch * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, n * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return new Blob([out], { type: "audio/wav" });
  }
  async function deliver(blob, base) {
    const cap = await downloadsCap();
    if (cap) {
      try { await cap.save({ filename: base + ".webm", data: blob }); toast("Descarga lista"); }
      catch (e) { toast(e && e.code === "declined" ? "Descarga cancelada" : "No se pudo descargar en esta vista"); }
      return;
    }
    let file = blob, ext = ".webm";
    try { const buf = await ac.decodeAudioData(await blob.arrayBuffer()); file = wavFromBuffer(buf); ext = ".wav"; } catch (_) {}
    const a = document.createElement("a"); a.href = URL.createObjectURL(file); a.download = base + ext;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Descargando " + base + ext);
  }
  function pickMime() {
    if (!window.MediaRecorder) return null;
    for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"]) if (MediaRecorder.isTypeSupported(m)) return m;
    return "";
  }
  let recorder = null, recording = false, recChunks = [], recBlob = null, recStart = 0;
  if ($("recBtn")) {
    $("recBtn").addEventListener("click", () => {
      if (!ac) return;
      const mime = pickMime();
      if (mime === null) { if ($("recHint")) $("recHint").textContent = "Este navegador no permite grabar audio."; return; }
      if (!recording) {
        recChunks = []; recorder = new MediaRecorder(recDest.stream, mime ? { mimeType: mime } : undefined);
        recorder.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
        recorder.onstop = () => { recBlob = new Blob(recChunks, { type: recorder.mimeType || "audio/webm" }); if ($("recDl")) $("recDl").disabled = false; if ($("recHint")) $("recHint").textContent = "Grabación lista para descargar."; if ($("stRec")) $("stRec").textContent = "lista"; };
        recorder.start(); recording = true; recStart = performance.now();
        $("recBtn").setAttribute("aria-pressed", "true"); $("recBtn").textContent = "■ Detener"; if ($("recBadge")) $("recBadge").hidden = false; if ($("stRec")) $("stRec").textContent = "grabando";
      } else {
        recorder.stop(); recording = false;
        $("recBtn").setAttribute("aria-pressed", "false"); $("recBtn").textContent = "● Grabar"; if ($("recBadge")) $("recBadge").hidden = true;
      }
    });
  }
  if ($("recDl")) $("recDl").addEventListener("click", () => { if (recBlob) deliver(recBlob, "oir-la-luz-grabacion"); });
  let lastMidi = null;
  if ($("noteDl")) {
    $("noteDl").addEventListener("click", () => {
      if (!soundOn() || lastMidi == null) return;
      const mime = pickMime(); if (mime === null) { toast("Este navegador no permite grabar audio"); return; }
      const ch = buildChain(ac), dest = ac.createMediaStreamDestination(); ch.out.connect(dest);
      const rec = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined), chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const m = lastMidi;
      rec.onstop = () => deliver(new Blob(chunks, { type: rec.mimeType || "audio/webm" }), "nota-" + noteName(m).replace("#", "s") + "-" + Math.round(mtof(m)) + "Hz");
      rec.start(); $("noteDl").disabled = true; toast("Grabando " + noteName(m));
      const dur = voice(ac, [ch.input, main.input], m, 0.9, 0);
      setTimeout(() => { rec.stop(); updSoundBtn(); }, (dur + 1.4) * 1000);
    });
  }

  // ================= detección =================
  const PW = 128, PH = 72;
  const proc = document.createElement("canvas"); proc.width = PW; proc.height = PH;
  const pctx = proc.getContext("2d", { willReadFrequently: true });
  let prev = null; const mask = new Uint8Array(PW * PH);
  let energy = [], flash = [], last = [], counts = [];
  const parts = [], roll = [];
  function ensureGrid() { const n = S.cols * S.rows; if (energy.length !== n) { energy = new Array(n).fill(0); flash = new Array(n).fill(0); last = new Array(n).fill(0); counts = new Array(n).fill(0); } }
  function cellMidi(c, r) { const sc = SCALES[S.scale]; return S.root + sc[c % sc.length] + 12 * Math.floor(c / sc.length) + 12 * (S.rows - 1 - r); }
  function activeSource() { return S.src === "demo" ? demo : (S.src === "cam" || S.src === "file") && video.readyState >= 2 ? video : S.src === "photo" && photoLoaded ? photoImg : null; }
  function srcAspect(src) { if (!src) return 16 / 9; if (src === demo) return 16 / 9; if (src === photoImg) return (photoImg.naturalWidth || 16) / (photoImg.naturalHeight || 9); return (video.videoWidth || 16) / (video.videoHeight || 9); }

  function analyse(now) {
    const src = activeSource(); if (!src) { prev = null; curGray = null; return; }
    pctx.save();
    if (S.src === "cam" && S.mirror) { pctx.translate(PW, 0); pctx.scale(-1, 1); }
    pctx.drawImage(src, 0, 0, PW, PH); pctx.restore();
    const d = pctx.getImageData(0, 0, PW, PH).data, gray = new Uint8Array(PW * PH);
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (d[j] * 0.3 + d[j + 1] * 0.59 + d[j + 2] * 0.11) | 0;
    ensureGrid();
    // 1. Detección por umbral: reacciona EXCLUSIVAMENTE a la presencia de píxeles/elementos NEGROS (forma activa)
    const threshold = S.bright || 128, inv = S.invert;
    let blackPixelsTotal = 0;
    for (let i = 0; i < gray.length; i++) {
      const isBlack = inv ? gray[i] >= threshold : gray[i] < threshold;
      mask[i] = isBlack ? 255 : 0;
      if (isBlack) blackPixelsTotal++;
    }
    const p = S.parts ? Math.min(0.35, 50 / Math.max(1, blackPixelsTotal)) : 0;
    for (let ci = 0; ci < counts.length; ci++) counts[ci] = 0;
    for (let y = 0; y < PH; y++) {
      const r = Math.min(S.rows - 1, Math.floor(y / PH * S.rows));
      for (let x = 0; x < PW; x++) {
        const i = y * PW + x; if (!mask[i]) continue;
        counts[r * S.cols + Math.min(S.cols - 1, Math.floor(x / PW * S.cols))]++;
        if (p && Math.random() < p && parts.length < 300) {
          parts.push({ x: (x + Math.random()) / PW, y: (y + Math.random()) / PH, vy: -0.01 - Math.random() * 0.02, k: 0.8, life: 1, decay: 1.6 + Math.random() * 1.2 });
        }
      }
    }
    prev = gray; curGray = gray;
    if (S.mode === "particula") { particleDetect(now); return; }
    if (S.mode === "lineas") { lineDetect(now); return; }
    if (S.mode === "escaner") return;
    const cellPx = (PW / S.cols) * (PH / S.rows);
    for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
      const k = r * S.cols + c;
      energy[k] = energy[k] * 0.5 + (counts[k] / cellPx) * 0.5;
      if (energy[k] > S.sens && now - last[k] > S.cool) {
        last[k] = now; flash[k] = 1;
        const vel = S.mapVel ? Math.min(1, 0.35 + energy[k] * 2.2) : 0.8, pan = S.mapPan ? ((c + 0.5) / S.cols) * 2 - 1 : 0;
        // 3. Mapeo para las 5 zonas superiores en modo Zonas según el grupo Top (G1, G2, G3)
        if (S.mode === "zonas" && r === 0 && c < 5) {
          const group = TOP_GROUPS[S.top] || TOP_GROUPS.G1;
          const snd = group[c % group.length];
          playSampleByFile(snd.file, vel, pan * 0.85, c);
          lastNoteT = performance.now();
          $("lastNote").textContent = S.top + "·" + (c + 1);
          $("lastHz").textContent = snd.name;
          $("lastZone").textContent = (c + 1) + ",1 (top)";
          $("lastPct").textContent = Math.round(energy[k] * 100) + " %";
        } else {
          const m = cellMidi(c, r);
          fire(now, m, vel, pan * 0.85, null, (c + 1) + "," + (r + 1), energy[k]);
        }
      }
    }
  }

  // una nota disparada por cualquier modo: suena, entra a la partitura y actualiza la lectura
  function fire(now, m, vel, pan, opt, where, pct) {
    if (soundOn()) voice(ac, [main.input], m, vel, pan, opt);
    roll.push({ t: now, m, c: opt ? opt.color : null }); lastMidi = m; lastFreq = mtof(m); lastNoteT = performance.now(); updScopeCap();
    $("lastNote").textContent = noteName(m);
    $("lastHz").textContent = Math.round(mtof(m)) + " Hz";
    $("lastZone").textContent = where;
    $("lastPct").textContent = Math.round(pct * 100) + " %";
    if ($("noteDl")) $("noteDl").disabled = !soundOn();
  }

  // ---- modos de línea: la línea queda quieta y suena lo que la cruza ----
  const MAXL = 4, MAXS = 12;
  const lEnergy = new Array(MAXL * MAXS).fill(0), lFlash = new Array(MAXL * MAXS).fill(0), lLast = new Array(MAXL * MAXS).fill(0), lCx = new Array(MAXL * MAXS).fill(NaN);
  let curGray = null;
  function segMidi(i) { const sc = SCALES[S.scale]; return S.root + sc[i % sc.length] + 12 * Math.floor(i / sc.length); }
  function lineXs() { const a = []; for (let i = 0; i < S.nl; i++) a.push((i + 1) / (S.nl + 1)); return a; }
  function lineDetect(now) {
    const xs = lineXs(), segH = PH / S.segs;
    xs.forEach((lx, li) => {
      const px = Math.min(PW - 2, Math.max(1, Math.round(lx * PW))), v = S.mode === "lineas" ? VOICES[li] : null;
      for (let s = 0; s < S.segs; s++) {
        const y0 = Math.floor(s * segH), y1 = Math.max(y0 + 1, Math.floor((s + 1) * segH)), k = li * MAXS + s;
        let n = 0, sx = 0, sn = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = px - 1; x <= px + 1; x++) if (mask[y * PW + x]) n++;
          for (let x = Math.max(0, px - 10); x <= Math.min(PW - 1, px + 10); x++) if (mask[y * PW + x]) { sx += x; sn++; }
        }
        const cx = sn ? sx / sn : NaN, dx = cx - lCx[k]; lCx[k] = cx;
        lEnergy[k] = lEnergy[k] * 0.4 + (n / (3 * (y1 - y0))) * 0.6;
        if (lEnergy[k] > S.sens && now - lLast[k] > S.cool) {
          lLast[k] = now; lFlash[k] = 1;
          const left = S.mapDir && dx < -0.4;
          const m = segMidi(S.segs - 1 - s) + (v ? v.oct : 0) - (left ? 12 : 0);
          const vel = S.mapVel ? Math.min(1, 0.35 + lEnergy[k] * 1.2) : 0.8, pan = S.mapPan ? lx * 2 - 1 : 0;
          fire(now, m, vel, pan * 0.85, v, (S.mode === "lineas" ? "L" + (li + 1) + " · " : "") + "tramo " + (s + 1) + (left ? " ←" : ""), lEnergy[k]);
        }
      }
    });
  }

  // ---- modo Partícula: detección de movimiento por diferencia de máscara + spray ----
  function particleDetect(now) {
    // Inicializar la máscara de referencia en el primer fotograma
    if (!prevPartMask) { prevPartMask = new Uint8Array(mask); return; }

    let newBlack = 0;      // píxeles recién negros (movimiento)
    let horizSum = 0;      // suma de posiciones x normalizadas (para pan)

    for (let y = 0; y < PH; y++) {
      for (let x = 0; x < PW; x++) {
        const i = y * PW + x;
        if (mask[i] && !prevPartMask[i]) {
          newBlack++;
          horizSum += x / PW;
          // Spawnear partícula de spray (máx. 350 activas para rendimiento fluido)
          if (sprayParticles.length < 350 && Math.random() < 0.18) {
            sprayParticles.push({
              x: x / PW,           // posición normalizada
              y: y / PH,
              life: 1.0,           // empieza en 100 % opacidad
              r: 0.0025 + Math.random() * 0.0035, // radio base normalizado
              s0: Math.random(),   // semilla ángulo spray
              s1: Math.random(),   // semilla radio spray
              s2: Math.random()    // semilla tamaño puntos spray
            });
          }
        }
      }
    }

    // Actualizar máscara de referencia
    prevPartMask.set(mask);

    // Disparar audio si hay movimiento suficiente y pasó el cooldown
    if (newBlack > 0 && now - lastPartSound > S.cool) {
      lastPartSound = now;
      // Intensidad: fracción de pantalla que se movió (saturado en 4 % = máxima intensidad)
      const intensity = Math.min(1, newBlack / (PW * PH * 0.04));
      const idx = Math.min(PARTICLE_SOUNDS.length - 1, Math.floor(intensity * PARTICLE_SOUNDS.length));
      const file = PARTICLE_SOUNDS[idx];
      const vel = S.mapVel ? Math.min(1, 0.28 + intensity * 0.72) : 0.8;
      // Pan basado en posición horizontal media del movimiento
      const meanX = newBlack > 0 ? horizSum / newBlack : 0.5;
      const pan = S.mapPan ? Math.max(-1, Math.min(1, (meanX * 2 - 1) * 0.85)) : 0;
      playSampleByFile(file, vel, pan, null);
      // Actualizar readout
      lastNoteT = performance.now();
      const label = file.replace(/\.[^.]+$/, "").replace(/-/g, " ");
      $("lastNote").textContent = "P" + (idx + 1);
      $("lastHz").textContent = label;
      $("lastZone").textContent = "x:" + Math.round(meanX * 100) + "%";
      $("lastPct").textContent = Math.round(intensity * 100) + " %";
    }
  }

  // ---- dibuja el modo Partícula: spray de puntos en fade 1s sin goteo (optimizado) ----
  function drawParticleMode(bx, by, bw, bh, dpr, dt) {
    const minDim = Math.min(bw, bh);
    vctx.fillStyle = "#23262c";

    for (let i = sprayParticles.length - 1; i >= 0; i--) {
      const p = sprayParticles[i];
      p.life -= dt;  // mengua 1.0 → 0.0 en exactamente 1 segundo
      if (p.life <= 0) { sprayParticles.splice(i, 1); continue; }

      const px = bx + p.x * bw;
      const py = by + p.y * bh;
      const alpha = p.life;          // lineal: 100 % → 0 %
      const rad = p.r * minDim * dpr;

      // — Punto central sólido (fillRect acelerado) —
      vctx.globalAlpha = alpha;
      const cd = Math.max(1.8 * dpr, rad * 1.8);
      vctx.fillRect(px - cd / 2, py - cd / 2, cd, cd);

      // — Nube de spray (7 micro-puntos satélite estilo aerosol fino sin goteo) —
      const nDots = 7;
      for (let j = 0; j < nDots; j++) {
        const dotAlpha = alpha * (0.48 - j * 0.06);
        if (dotAlpha <= 0.02) continue;
        const angle = p.s0 * 6.283 + j * 0.898;
        const dist = rad * (1.3 + p.s1 * 1.5 + j * 0.16);
        const sr = Math.max(0.6 * dpr, rad * 0.38);
        vctx.globalAlpha = dotAlpha;
        vctx.fillRect(
          px + Math.cos(angle) * dist - sr / 2,
          py + Math.sin(angle) * dist - sr / 2,
          sr, sr
        );
      }
    }
    vctx.globalAlpha = 1;
  }


  let scanT0 = performance.now(), scanPos = 0, lastStep = -1;
  const hits = [];
  function scanTick(now) {
    scanPos = (((now - scanT0) / 1000) / S.sdur) % 1;
    const st = Math.floor(scanPos * S.steps);
    if (st === lastStep) return; lastStep = st;
    if (!curGray) return;
    const x0 = Math.floor(st / S.steps * PW), x1 = Math.max(x0 + 1, Math.floor((st + 1) / S.steps * PW));
    const segH = PH / SCANNER_SEGS, cands = [];
    for (let s = 0; s < SCANNER_SEGS; s++) {
      const y0 = Math.floor(s * segH), y1 = Math.max(y0 + 1, Math.floor((s + 1) * segH));
      let sum = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += curGray[y * PW + x];
      const avg = sum / ((y1 - y0) * (x1 - x0)), val = S.invert ? 255 - avg : avg;
      if (val > S.bright) cands.push({ s, val });
    }
    cands.sort((a, b) => b.val - a.val).slice(0, 4).forEach(({ s, val }) => {
      const k = (val - S.bright) / Math.max(1, 255 - S.bright);
      const vel = S.mapVel ? Math.min(1, 0.3 + k * 0.7) : 0.8, cx = (x0 + x1) / 2 / PW, pan = S.mapPan ? cx * 2 - 1 : 0;
      playScannerSample(s, vel, pan * 0.85);
      const snd = SCANNER_SOUNDS[s];
      lastNoteT = performance.now();
      $("lastNote").textContent = "S" + (s + 1);
      $("lastHz").textContent = snd.name;
      $("lastZone").textContent = "sec " + (s + 1) + " / 13";
      $("lastPct").textContent = Math.round((val / 255) * 100) + " %";
      hits.push({ x: cx, w: (x1 - x0) / PW, s, life: 1, name: snd.name, sec: s + 1 });
    });
  }

  // ================= dibujo =================
  const view = $("view"), vctx = view.getContext("2d");
  const maskC = document.createElement("canvas"); maskC.width = PW; maskC.height = PH;
  const mctx = maskC.getContext("2d"), mimg = mctx.createImageData(PW, PH);
  const threshC = document.createElement("canvas"); threshC.width = 640; threshC.height = 360;
  const tctx = threshC.getContext("2d", { willReadFrequently: true });
  let threshAcc = 0, threshReady = false;

  let cachedDpr = 1, cachedW = 0, cachedH = 0, fitCounter = 0;
  function fit(c) {
    fitCounter++;
    if (fitCounter % 20 === 1 || !cachedW) {
      const r = c.getBoundingClientRect();
      cachedDpr = Math.min(2, window.devicePixelRatio || 1);
      cachedW = Math.max(1, Math.round(r.width * cachedDpr));
      cachedH = Math.max(1, Math.round(r.height * cachedDpr));
      if (c.width !== cachedW || c.height !== cachedH) { c.width = cachedW; c.height = cachedH; }
    }
    return cachedDpr;
  }
  window.addEventListener("resize", () => { fitCounter = 0; });

  function drawView(dt) {
    const dpr = fit(view), W = view.width, H = view.height;
    vctx.clearRect(0, 0, W, H);
    const src = activeSource(), ar = srcAspect(src);
    let bw = W, bh = W / ar; if (bh > H) { bh = H; bw = H * ar; }
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    if (S.view === "mask") {
      for (let i = 0; i < PW * PH; i++) {
        const j = i * 4, m = mask[i];
        if (m) { mimg.data[j] = 35; mimg.data[j + 1] = 38; mimg.data[j + 2] = 44; mimg.data[j + 3] = 255; }
        else { mimg.data[j + 3] = 0; }
      }
      mctx.putImageData(mimg, 0, 0);
      vctx.imageSmoothingEnabled = false; vctx.drawImage(maskC, bx, by, bw, bh); vctx.imageSmoothingEnabled = true;
    } else if (src) {
      // 4. Efecto de umbral (threshold / alto contraste) y transparencia dinámica:
      // Las partes blancas del umbral son transparentes para heredar el fondo animado en movimiento,
      // y las partes oscuras se dibujan en sólido #23262c como elemento gráfico.
      threshAcc += dt;
      // Actualizar cálculo de umbral a 30 FPS máx para no sobrecargar CPU/GPU con lecturas redundantes
      if (threshAcc >= 0.033 || !threshReady) {
        threshAcc = 0;
        threshReady = true;
        const tw = 640, th = 360;
        tctx.clearRect(0, 0, tw, th);
        tctx.save();
        if (S.src === "cam" && S.mirror) { tctx.translate(tw, 0); tctx.scale(-1, 1); }
        tctx.drawImage(src, 0, 0, tw, th);
        tctx.restore();
        const imgData = tctx.getImageData(0, 0, tw, th);
        const d32 = new Uint32Array(imgData.data.buffer);
        const threshold = S.bright || 128;
        const inv = S.invert;
        const DARK = 0xFF2C2623; // #23262c sólido
        const CLEAR = 0x00000000; // transparente
        for (let i = 0; i < d32.length; i++) {
          const p = d32[i];
          const r = p & 0xff, g = (p >> 8) & 0xff, b = (p >> 16) & 0xff;
          const lum = (r * 77 + g * 151 + b * 28) >> 8;
          const isWhite = inv ? lum < threshold : lum >= threshold;
          d32[i] = isWhite ? CLEAR : DARK;
        }
        tctx.putImageData(imgData, 0, 0);
      }
      vctx.drawImage(threshC, bx, by, bw, bh);
      if (S.veil > 0) { vctx.fillStyle = "rgba(35,38,44," + S.veil.toFixed(2) + ")"; vctx.fillRect(bx, by, bw, bh); }
    } else {
      vctx.fillStyle = "#23262c"; vctx.font = Math.round(11 * dpr) + "px 'FTOverpass', sans-serif"; vctx.textAlign = "center";
      vctx.fillText(S.src === "camoff" ? "CÁMARA APAGADA" : "ESPERANDO IMAGEN", W / 2, H / 2); vctx.textAlign = "start";
    }
    if (S.parts && S.view !== "mask") drawParts(bx, by, bw, bh, dpr, dt);
    if (S.mode === "particula") { drawParticleMode(bx, by, bw, bh, dpr, dt); return; }
    if (S.mode === "lineas") { drawLines(bx, by, bw, bh, dpr, dt); return; }
    if (S.mode === "escaner") { drawScanner(bx, by, bw, bh, dpr, dt); return; }
    // 2. Modo Zonas: sin líneas de grilla, solo texturas de retroalimentación tipo timbre/fotocopia
    const cw = bw / S.cols, rh = bh / S.rows; ensureGrid();
    for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
      const k = r * S.cols + c, f = flash[k];
      if (f > 0.02) {
        // Base de reacción en #23262c con baja opacidad
        const alpha = S.tint * f;
        vctx.save();
        vctx.globalAlpha = Math.min(1, alpha);
        const cx = bx + c * cw, cy = by + r * rh;
        // Relleno sólido principal muy tenue
        vctx.fillStyle = "#23262c";
        vctx.fillRect(cx, cy, cw, rh);
        // Textura de fotocopia: líneas irregulares horizontales tipo tóner cargado
        vctx.strokeStyle = "#23262c";
        vctx.lineWidth = 1;
        vctx.beginPath();
        for (let ly = 0; ly < rh; ly += (2 + ((c * 3 + r * 7 + Math.round(ly)) % 4))) {
          const nx1 = cx + ((c * 5 + ly * 3) % Math.max(1, cw * 0.08));
          const nx2 = cx + cw - ((r * 7 + ly * 2) % Math.max(1, cw * 0.1));
          vctx.moveTo(nx1, cy + ly + 0.5);
          vctx.lineTo(nx2, cy + ly + 0.5);
        }
        vctx.stroke();
        // Manchas de borde irregulares tipo sello desgastado
        vctx.lineWidth = 1.5;
        vctx.strokeStyle = "#23262c";
        vctx.beginPath();
        // Borde superior roto
        for (let bx2 = cx; bx2 < cx + cw; bx2 += 3 + ((bx2 * 7) % 5)) {
          if ((bx2 * 3 + r * 11) % 7 < 4) { vctx.moveTo(bx2, cy + 1); vctx.lineTo(bx2 + 2, cy + 1); }
        }
        // Borde inferior roto
        for (let bx2 = cx; bx2 < cx + cw; bx2 += 2 + ((bx2 * 5 + r) % 6)) {
          if ((bx2 * 5 + c * 13) % 9 < 5) { vctx.moveTo(bx2, cy + rh - 1); vctx.lineTo(bx2 + 3, cy + rh - 1); }
        }
        vctx.stroke();
        vctx.restore();
        flash[k] *= Math.pow(0.12, dt);
      }
    }
    // Notas opcionales (sin grilla visible)
    if (S.notes) {
      vctx.font = Math.round(10 * dpr) + "px 'FTOverpass', sans-serif";
      for (let r = 0; r < S.rows; r++) for (let c = 0; c < S.cols; c++) {
        const k = r * S.cols + c, f = flash[k];
        if (f < 0.08) continue;
        vctx.fillStyle = "rgba(35,38,44," + Math.min(1, f * 1.5).toFixed(2) + ")";
        vctx.fillText(noteName(cellMidi(c, r)).toUpperCase(), bx + c * cw + 6 * dpr, by + (r + 0.5) * rh + 4 * dpr);
      }
    }
  }

  // partículas: puntos breves, sin estela
  function drawParts(bx, by, bw, bh, dpr, dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.y += p.vy * dt; p.life -= p.decay * dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      const a = (p.life * 0.55).toFixed(3);
      vctx.fillStyle = "rgba(35,38,44," + a + ")";
      const s = (1 + p.k * 1.6) * dpr;
      vctx.fillRect(bx + p.x * bw - s / 2, by + p.y * bh - s / 2, s, s);
    }
  }
  function drawLines(bx, by, bw, bh, dpr, dt) {
    const xs = lineXs(), segH = bh / S.segs;
    vctx.font = Math.round(10 * dpr) + "px 'FTOverpass', sans-serif";
    xs.forEach((lx, li) => {
      const x = Math.round(bx + lx * bw) + 0.5, v = S.mode === "lineas" ? VOICES[li] : null, col = v ? v.color : "#23262c";
      for (let s = 0; s < S.segs; s++) {   // tono de reacción en #23262c (baja opacidad)
        const k = li * MAXS + s, f = lFlash[k];
        if (f > 0.02) { vctx.fillStyle = "rgba(35,38,44," + (S.tint * f * 1.4).toFixed(3) + ")"; vctx.fillRect(x - bw * 0.05, by + s * segH, bw * 0.1, segH); lFlash[k] *= Math.pow(0.12, dt); }
      }
      if (S.lines) {
        vctx.strokeStyle = rgba(col, 0.75); vctx.lineWidth = 1.5 * dpr;
        vctx.beginPath(); vctx.moveTo(x, by); vctx.lineTo(x, by + bh); vctx.stroke();
        vctx.strokeStyle = rgba(col, 0.45); vctx.lineWidth = 1; vctx.beginPath();
        for (let s = 1; s < S.segs; s++) { const y = Math.round(by + s * segH) + 0.5; vctx.moveTo(x - 5 * dpr, y); vctx.lineTo(x + 5 * dpr, y); }
        vctx.stroke();
        vctx.lineWidth = 4 * dpr;
        for (let s = 0; s < S.segs; s++) {
          const f = lFlash[li * MAXS + s]; if (f < 0.1) continue;
          vctx.strokeStyle = rgba(col, f); vctx.beginPath(); vctx.moveTo(x, by + s * segH + 2 * dpr); vctx.lineTo(x, by + (s + 1) * segH - 2 * dpr); vctx.stroke();
        }
      }
      if (S.notes) {
        if (v) { vctx.fillStyle = col; vctx.fillText("L" + (li + 1) + " · " + v.name.toUpperCase(), x + 7 * dpr, by + 16 * dpr); }
        for (let s = 0; s < S.segs; s++) {
          const f = lFlash[li * MAXS + s]; if (v && f < 0.3) continue;
          vctx.fillStyle = f > 0.3 ? "#23262c" : "rgba(35,38,44,.7)";
          vctx.fillText(noteName(segMidi(S.segs - 1 - s) + (v ? v.oct : 0)).toUpperCase(), x + 7 * dpr, by + (s + 0.5) * segH + 4 * dpr);
        }
      }
    });
  }
  function drawScanner(bx, by, bw, bh, dpr, dt) {
    const numSegs = SCANNER_SEGS, segH = bh / numSegs;
    const x = Math.round(bx + scanPos * bw) + 0.5;
    vctx.font = Math.round(10 * dpr) + "px 'FTOverpass', sans-serif";

    // 3. Cuadros indicadores de reacción en #23262c con baja opacidad
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i]; h.life -= dt * 0.9;
      if (h.life <= 0) { hits.splice(i, 1); continue; }
      const cx = bx + h.x * bw, cy = by + (h.s + 0.5) * segH;
      vctx.fillStyle = "rgba(35,38,44," + (S.tint * h.life * 1.4).toFixed(3) + ")";
      vctx.fillRect(bx + (h.x - h.w / 2) * bw, by + h.s * segH, h.w * bw, segH);
      vctx.fillStyle = rgba("#23262c", Math.min(1, h.life * 1.2));
      vctx.beginPath(); vctx.arc(cx, cy, (2.5 + 2.5 * h.life) * dpr, 0, Math.PI * 2); vctx.fill();
      if (S.notes && h.life > 0.5) {
        vctx.fillStyle = "rgba(35,38,44," + Math.min(1, h.life * 1.3).toFixed(2) + ")";
        vctx.fillText((h.sec ? "S" + h.sec + " " : "") + (h.name ? h.name.toUpperCase() : ""), cx + 8 * dpr, cy + 4 * dpr);
      }
    }

    // 2. Efecto visual de "sangrado de tinta / arrastre de fotocopia" para la línea del escáner en #23262c
    const dragW = Math.min(x - bx, 36 * dpr);
    if (dragW > 2) {
      // Arrastre difuso de tóner hacia atrás del avance
      const dragGrad = vctx.createLinearGradient(x - dragW, 0, x, 0);
      dragGrad.addColorStop(0, "rgba(35,38,44,0)");
      dragGrad.addColorStop(0.65, "rgba(35,38,44,0.03)");
      dragGrad.addColorStop(0.88, "rgba(35,38,44,0.1)");
      dragGrad.addColorStop(1, "rgba(35,38,44,0.22)");
      vctx.fillStyle = dragGrad;
      vctx.fillRect(x - dragW, by, dragW, bh);

      // Estrías de arrastre horizontal de fotocopiadora analógica
      vctx.strokeStyle = "rgba(35,38,44,0.14)";
      vctx.lineWidth = 1;
      vctx.beginPath();
      for (let s = 0; s < numSegs; s++) {
        const sy = by + (s + 0.5) * segH;
        const streakLen = dragW * (0.35 + ((s * 7) % 5) * 0.13);
        vctx.moveTo(x - streakLen, Math.round(sy) + 0.5);
        vctx.lineTo(x, Math.round(sy) + 0.5);
      }
      vctx.stroke();
    }

    if (S.lines) {
      // Marcas de pasos en borde superior e inferior
      vctx.strokeStyle = "rgba(35,38,44,.45)";
      vctx.lineWidth = 1;
      vctx.beginPath();
      for (let st = 0; st <= S.steps; st++) {
        const tx = Math.round(bx + st / S.steps * bw) + 0.5;
        vctx.moveTo(tx, by); vctx.lineTo(tx, by + 4 * dpr);
        vctx.moveTo(tx, by + bh - 4 * dpr); vctx.lineTo(tx, by + bh);
      }
      vctx.stroke();

      // Sangrado de tinta: halo poroso alrededor de la línea en #23262c
      vctx.strokeStyle = "rgba(35,38,44,0.32)";
      vctx.lineWidth = 4 * dpr;
      vctx.beginPath(); vctx.moveTo(x, by); vctx.lineTo(x, by + bh); vctx.stroke();

      // Línea principal de escáner en #23262c sólido
      vctx.strokeStyle = "#23262c";
      vctx.lineWidth = 2 * dpr;
      vctx.beginPath(); vctx.moveTo(x, by); vctx.lineTo(x, by + bh); vctx.stroke();

      // 13 divisiones iguales con marcas horizontales tipo fanzine
      vctx.strokeStyle = "rgba(35,38,44,0.7)";
      vctx.lineWidth = 1.2 * dpr;
      vctx.beginPath();
      for (let s = 1; s < numSegs; s++) {
        const y = Math.round(by + s * segH) + 0.5;
        vctx.moveTo(x - 6 * dpr, y); vctx.lineTo(x + 6 * dpr, y);
      }
      vctx.stroke();

      // Numeración sutil de las 13 secciones (01 a 13) con tipografía Denominary
      vctx.fillStyle = "rgba(35,38,44,0.65)";
      vctx.font = Math.round(8 * dpr) + "px 'Denominary', monospace";
      for (let s = 0; s < numSegs; s++) {
        const ny = by + (s + 0.5) * segH + 3 * dpr;
        vctx.fillText(String(s + 1).padStart(2, "0"), x + 8 * dpr, ny);
      }
    }
  }

  const scope = $("scope"), sctx = scope ? scope.getContext("2d") : null, tbuf = new Uint8Array(1024);
  const WAVE_NAME = { sine: "seno", triangle: "triangular", square: "cuadrada", sawtooth: "sierra" };
  function waveVal(type, ph) {
    ph = ph - Math.floor(ph);
    if (type === "sine") return Math.sin(2 * Math.PI * ph);
    if (type === "square") return ph < 0.5 ? 1 : -1;
    if (type === "sawtooth") return 2 * ph - 1;
    return ph < 0.25 ? 4 * ph : ph < 0.75 ? 2 - 4 * ph : 4 * ph - 4;
  }
  function harmonic(type, n) {
    if (type === "sine") return n === 1 ? 1 : 0;
    if (type === "square") return n % 2 ? 1 / n : 0;
    if (type === "triangle") return n % 2 ? 1 / (n * n) : 0;
    return 1 / n;
  }
  const fbuf = new Float32Array(2048);
  let lastFreq = 0, lastNoteT = -1e9;
  function updScopeCap() {
    const f = lastFreq || mtof(S.root + 12);
    if ($("scopeCap")) $("scopeCap").textContent = "forma de onda · " + WAVE_NAME[S.wave];
    if ($("specCap")) $("specCap").textContent = "armónicos · corte " + (S.cut >= 1000 ? (S.cut / 1000).toFixed(1) + "k" : S.cut);
  }
  function drawScope() {
    if (!sctx || !$("signal") || $("signal").hidden) return;
    const dpr = fit(scope), W = scope.width, H = scope.height;
    sctx.clearRect(0, 0, W, H);
    const split = Math.round(W * 0.6), pad = 6 * dpr, mid = H / 2, amp = H * 0.38;
    sctx.strokeStyle = "rgba(238,240,255,.14)"; sctx.lineWidth = 1;
    sctx.beginPath(); sctx.moveTo(0, Math.round(mid) + 0.5); sctx.lineTo(split - pad, Math.round(mid) + 0.5); sctx.moveTo(split + 0.5, 0); sctx.lineTo(split + 0.5, H); sctx.stroke();
    // señal real (si hay sonido), sincronizada al inicio del ciclo y escalada a la misma cantidad de ciclos
    const cycles = 2.5, wantLive = soundOn() && lastFreq && (performance.now() - lastNoteT) < (S.atk + S.rel * 1.4) * 1000 + 150;
    let livePts = null;
    if (wantLive) {
      shape.getFloatTimeDomainData(fbuf);
      let peak = 0; for (let i = 0; i < fbuf.length; i++) peak = Math.max(peak, Math.abs(fbuf[i]));
      if (peak > 0.004) {
        const period = ac.sampleRate / lastFreq, span = Math.min(fbuf.length - 1, Math.round(period * cycles));
        let i0 = 0; for (let i = 1; i < fbuf.length - span; i++) { if (fbuf[i - 1] <= 0 && fbuf[i] > 0) { i0 = i; break; } }
        livePts = []; for (let k = 0; k <= span; k++) livePts.push([k / span * (split - pad), mid - (fbuf[i0 + k] / peak) * amp]);
      }
    }
    // forma ideal de la onda elegida: en neón sin sonido, de fondo cuando hay señal real
    sctx.strokeStyle = livePts ? "rgba(238,240,255,.32)" : "#E2FF3B"; sctx.lineWidth = (livePts ? 1 : 1.6) * dpr;
    sctx.beginPath();
    for (let x = 0; x <= split - pad; x++) { const y = mid - waveVal(S.wave, x / (split - pad) * cycles) * amp; x ? sctx.lineTo(x, y) : sctx.moveTo(x, y); }
    sctx.stroke();
    if (livePts) {
      sctx.strokeStyle = "#E2FF3B"; sctx.lineWidth = 1.6 * dpr; sctx.beginPath();
      livePts.forEach(([x, y], k) => (k ? sctx.lineTo(x, y) : sctx.moveTo(x, y))); sctx.stroke();
    }
    // armónicos teóricos y curva del pasa-bajos (12 dB/oct); los armónicos sobre el corte se apagan
    const f0 = lastFreq || mtof(S.root + 12), N = 12, bw = (W - split - pad * 2) / N, hlCut = hlOn("cut");
    for (let n = 1; n <= N; n++) {
      const a = harmonic(S.wave, n); if (!a) continue;
      const h = Math.max(1, a * (H - pad * 2)), x = split + pad + (n - 1) * bw;
      sctx.fillStyle = f0 * n > S.cut ? "rgba(123,128,179,.45)" : "#E2FF3B";
      sctx.fillRect(Math.round(x + bw * 0.2), Math.round(H - pad - h), Math.max(1, Math.round(bw * 0.6)), Math.round(h));
    }
    sctx.strokeStyle = hlCut ? "#FFFFFF" : "rgba(238,240,255,.6)"; sctx.lineWidth = (hlCut ? 2 : 1) * dpr; sctx.setLineDash([3 * dpr, 3 * dpr]);
    sctx.beginPath();
    for (let x = 0; x <= W - split - pad * 2; x++) {
      const n = 0.5 + x / bw, r = (f0 * n) / S.cut, g = 1 / Math.sqrt(1 + r * r * r * r);
      const y = H - pad - g * (H - pad * 2); x ? sctx.lineTo(split + pad + x, y) : sctx.moveTo(split + pad + x, y);
    }
    sctx.stroke(); sctx.setLineDash([]);
  }

  // ---- envolvente: attack, release, reverb y volumen ----
  const envC = $("env"), ectx = envC ? envC.getContext("2d") : null, mbuf = new Float32Array(1024);
  let HL = { key: null, t: 0 };
  function hlOn(k) { return HL.key === k && performance.now() - HL.t < 1400; }
  function envAt(t) {
    const peak = S.vol, hold = 0.06;
    if (t < 0) return 0;
    if (t < S.atk) return peak * (t / S.atk);
    if (t < S.atk + hold) return peak * (0.6 + 0.4 * Math.exp(-(t - S.atk) / 0.08));
    const vh = peak * (0.6 + 0.4 * Math.exp(-hold / 0.08));
    return vh * Math.exp(-(t - S.atk - hold) / (S.rel / 4));
  }
  function updEnvCap() {
    if ($("envCapL")) $("envCapL").textContent = "envolvente · A " + Math.round(S.atk * 1000) + " ms · R " + Math.round(S.rel * 1000) + " ms";
    if ($("envCapR")) $("envCapR").textContent = "reverb " + Math.round(S.rev * 100) + " % · vol " + Math.round(S.vol * 100) + " %";
  }
  function drawEnv() {
    if (!ectx || !$("signal") || $("signal").hidden) return;
    const dpr = fit(envC), W = envC.width, H = envC.height, pad = 6 * dpr, meterW = 10 * dpr;
    ectx.clearRect(0, 0, W, H);
    const PW_ = W - meterW - pad * 3, base = H - pad, top = pad + 8 * dpr, hgt = base - top;
    const hold = 0.06, noteEnd = S.atk + hold + S.rel * 1.6, tail = S.rev > 0.01 ? 2.6 * S.rev + 0.4 : 0;
    const T = Math.max(0.5, noteEnd + tail);
    const X = (t) => pad + (t / T) * PW_, Y = (v) => base - v * hgt;
    ectx.strokeStyle = "rgba(238,240,255,.14)"; ectx.lineWidth = 1;
    ectx.beginPath(); ectx.moveTo(pad, Math.round(base) + 0.5); ectx.lineTo(pad + PW_, Math.round(base) + 0.5); ectx.moveTo(pad, Math.round(Y(1)) + 0.5); ectx.lineTo(pad + PW_, Math.round(Y(1)) + 0.5); ectx.stroke();
    // cola de reverb (zona sombreada)
    if (S.rev > 0.01) {
      const hlR = hlOn("rev");
      ectx.fillStyle = hlR ? "rgba(150,150,255,.45)" : "rgba(150,150,255,.2)";
      ectx.beginPath(); ectx.moveTo(X(S.atk), base);
      for (let i = 0; i <= 80; i++) { const t = S.atk + (T - S.atk) * i / 80; ectx.lineTo(X(t), Y(Math.max(envAt(t), S.rev * S.vol * 0.55 * Math.exp(-(t - S.atk) / (0.35 + S.rev * 0.9))))); }
      ectx.lineTo(X(T), base); ectx.closePath(); ectx.fill();
    }
    // tramos: attack y release resaltables
    const seg = (t0, t1, hl) => {
      ectx.strokeStyle = hl ? "#FFFFFF" : "#E2FF3B"; ectx.lineWidth = (hl ? 2.6 : 1.6) * dpr; ectx.beginPath();
      for (let i = 0; i <= 60; i++) { const t = t0 + (t1 - t0) * i / 60; i ? ectx.lineTo(X(t), Y(envAt(t))) : ectx.moveTo(X(t), Y(envAt(t))); }
      ectx.stroke();
    };
    const hlV = hlOn("vol");
    seg(0, S.atk, hlOn("atk") || hlV); seg(S.atk, S.atk + hold, hlV); seg(S.atk + hold, noteEnd, hlOn("rel") || hlV);
    // marcas A y R
    ectx.fillStyle = "rgba(35,38,44,.7)"; ectx.font = Math.round(9 * dpr) + "px 'FTOverpass', sans-serif";
    ectx.fillText("A", X(S.atk / 2) - 3 * dpr, pad + 6 * dpr);
    ectx.fillText("R", X(S.atk + hold + S.rel * 0.5), pad + 6 * dpr);
    ectx.strokeStyle = "rgba(35,38,44,.25)"; ectx.setLineDash([2 * dpr, 3 * dpr]); ectx.beginPath();
    [S.atk, S.atk + hold].forEach((t) => { const x = Math.round(X(t)) + 0.5; ectx.moveTo(x, top); ectx.lineTo(x, base); }); ectx.stroke(); ectx.setLineDash([]);
    // cabezal de la última nota
    const el = (performance.now() - lastNoteT) / 1000;
    if (soundOn() && el >= 0 && el < T) { const x = Math.round(X(el)) + 0.5; ectx.strokeStyle = "rgba(35,38,44,.8)"; ectx.lineWidth = 1; ectx.beginPath(); ectx.moveTo(x, top - 4 * dpr); ectx.lineTo(x, base); ectx.stroke(); }
    // medidor de nivel: volumen elegido (marco) y nivel real de salida (relleno)
    const mx = W - pad - meterW;
    ectx.strokeStyle = hlV ? "#FFFFFF" : "rgba(35,38,44,.45)"; ectx.lineWidth = 1;
    ectx.strokeRect(Math.round(mx) + 0.5, Math.round(Y(S.vol)) + 0.5, Math.round(meterW) - 1, Math.round(base - Y(S.vol)) - 1);
    let lvl = 0;
    if (analyser && soundOn()) { analyser.getFloatTimeDomainData(mbuf); let sum = 0; for (let i = 0; i < mbuf.length; i++) sum += mbuf[i] * mbuf[i]; lvl = Math.min(1, Math.sqrt(sum / mbuf.length) * 4); }
    if (lvl > 0.002) { ectx.fillStyle = "#E2FF3B"; ectx.fillRect(Math.round(mx) + 2, Math.round(Y(lvl)), Math.round(meterW) - 4, Math.round(base - Y(lvl))); }
  }
  const rollC = $("roll"), rctx = rollC ? rollC.getContext("2d") : null;
  function drawRoll(now) {
    while (roll.length && now - roll[0].t > 10000) roll.shift();
    if (!rctx || !$("signal") || $("signal").hidden) return;
    const dpr = fit(rollC), W = rollC.width, H = rollC.height, span = 10000;
    rctx.clearRect(0, 0, W, H);
    const lo = S.mode === "zonas" ? S.root - 2 : S.root - 14, hi = S.mode === "zonas" ? S.root + 12 * S.rows + 14 : S.root + 46;
    rctx.strokeStyle = "rgba(238,240,255,.12)"; rctx.lineWidth = 1;
    for (let m = Math.ceil(lo / 12) * 12; m < hi; m += 12) { const y = Math.round(H - (m - lo) / (hi - lo) * H) + 0.5; rctx.beginPath(); rctx.moveTo(0, y); rctx.lineTo(W, y); rctx.stroke(); }
    for (const n of roll) {
      const age = (now - n.t) / span, x = W - age * W, y = H - (n.m - lo) / (hi - lo) * H;
      rctx.fillStyle = age < 0.05 ? "#E2FF3B" : n.c ? rgba(n.c, 0.85) : "rgba(150,150,255,.85)";
      rctx.fillRect(x - 2 * dpr, y - 1.5 * dpr, 9 * dpr, 3 * dpr);
    }
  }

  // ================= controles =================
  const RANGES = {
    cols: { key: "cols", fmt: (v) => v }, rows: { key: "rows", fmt: (v) => v },
    thr: { key: "thr", fmt: (v) => v }, sens: { key: "sens", fmt: (v) => v + " %", conv: (v) => v / 100 }, cool: { key: "cool", fmt: (v) => v + " ms" },
    atk: { key: "atk", fmt: (v) => v + " ms", conv: (v) => v / 1000 }, rel: { key: "rel", fmt: (v) => v + " ms", conv: (v) => v / 1000 },
    cut: { key: "cut", fmt: (v) => v >= 1000 ? (v / 1000).toFixed(1) + "k" : String(v) },
    rev: { key: "rev", fmt: (v) => v + " %", conv: (v) => v / 100 }, vol: { key: "vol", fmt: (v) => v + " %", conv: (v) => v / 100 },
    tint: { key: "tint", fmt: (v) => v + " %", conv: (v) => v / 100 }, veil: { key: "veil", fmt: (v) => v + " %", conv: (v) => v / 100 },
    nl: { key: "nl", fmt: (v) => v }, segs: { key: "segs", fmt: (v) => v },
    sdur: { key: "sdur", fmt: (v) => v + " s" }, steps: { key: "steps", fmt: (v) => v }, bright: { key: "bright", fmt: (v) => v },
  };
  Object.entries(RANGES).forEach(([id, cfg]) => {
    const el = $(id), out = $(id + "Out");
    if (!el) return;
    const upd = () => { const v = Number(el.value); S[cfg.key] = cfg.conv ? cfg.conv(v) : v; if (out) out.textContent = cfg.fmt(v); onChange(cfg.key); };
    el.addEventListener("input", upd); upd();
    const badge = document.createElement("i"); badge.className = "cc"; badge.hidden = true; badge.dataset.for = id;
    const row = el.closest(".row");
    if (row) {
      const lbl = row.querySelector("label");
      if (lbl) lbl.appendChild(badge);
    }
  });
  function onChange(key) {
    if (["atk", "rel", "cut", "rev", "vol"].includes(key)) { HL = { key, t: performance.now() }; updEnvCap(); }
    if (key === "cols" || key === "rows") { ensureGrid(); $("stKeys").textContent = S.cols + " × " + S.rows; }
    if (key === "cut" && typeof updScopeCap === "function") updScopeCap();
    if (key === "nl") renderVoices();
    if (key === "sdur" || key === "steps") lastStep = -1;
    if (key === "sens") $("stDet").textContent = Math.round(S.sens * 100) + " %";
    if (!ac) return;
    if (key === "vol") master.gain.setTargetAtTime(S.vol, ac.currentTime, 0.05);
    if (key === "cut") main.filter.frequency.setTargetAtTime(S.cut, ac.currentTime, 0.05);
    if (key === "rev") setRev(main);
  }
  $("scale").addEventListener("change", (e) => { S.scale = e.target.value; });
  $("root").addEventListener("change", (e) => { S.root = Number(e.target.value); });
  document.querySelectorAll("[data-wave]").forEach((b) => b.addEventListener("click", () => {
    S.wave = b.dataset.wave; document.querySelectorAll("[data-wave]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $("stSnd").textContent = b.textContent.toLowerCase(); updScopeCap();
    if (soundOn()) { const m = S.root + 12; lastFreq = mtof(m); lastNoteT = performance.now(); voice(ac, [main.input], m, 0.85, 0); updScopeCap(); }
  }));
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    S.view = b.dataset.view; document.querySelectorAll("[data-view]").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); updVisState();
  }));
  function updMap() {
    const M = S.mode, p = [];
    if (M === "zonas") p.push("zona → nota · top=" + S.top);
    if (M === "particula") p.push("intensidad horizontal → audio");
    if (M === "lineas") p.push("línea → voz", "altura del cruce → nota");
    if (M === "escaner") p.push("13 secciones → audios de guitarra");
    if (S.mapVel) p.push(M === "escaner" ? "brillo → volumen" : "intensidad → volumen");
    if (S.mapPan) p.push("posición x → pan");
    if (S.mapDir && M === "lineas") p.push("dirección → octava");
    if (M === "escaner") p.push("tiempo → recorrido");
    if ($("mapMain")) $("mapMain").textContent = p[0];
    if ($("mapText")) $("mapText").textContent = p.join(" · ");
    if ($("stMap")) $("stMap").textContent = p.length + (p.length === 1 ? " regla" : " reglas");
  }
  const MODE_INFO = {
    zonas:    { name: "zonas",           lbl: " · zona ",      hint: "La imagen detecta píxeles negros. Las 5 zonas superiores disparan audios del grupo Top activo (G1/G2/G3). Las demás zonas disparan síntesis." },
    particula:{ name: "partícula",       lbl: " · intensidad ", hint: "Detecta movimiento de píxeles negros comparando cada fotograma con el anterior. Cada pixel activo genera una partícula de spray que se desvanece en 1 segundo. El audio se selecciona según la intensidad horizontal: mínima → 3rd-fret-harmonic, máxima → phased-axe-sweep." },
    lineas:   { name: "varias líneas",   lbl: " · ",           hint: "Varias líneas, cada una con su propia voz: forma de onda, envolvente, octava y filtro. Aquí no aplican la forma de onda, Attack, Release ni Pasa-bajos del panel Sonido, porque cada línea trae los suyos." },
    escaner:  { name: "escáner",         lbl: " · ",           hint: "Una línea analógica con arrastre y sangrado recorre la imagen en 13 secciones mapeadas a 13 audios de /sonidos. En cada paso suenan los tramos según el brillo." },
  };
  function renderVoices() {
    if (!$("voices")) return;
    $("voices").innerHTML = VOICES.slice(0, S.nl).map((v, i) => '<li><i style="background:' + v.color + '"></i><span><b>Línea ' + (i + 1) + " · " + v.name + "</b><br>" +
      WAVE_NAME[v.wave] + " · A " + Math.round(v.atk * 1000) + " ms · R " + Math.round(v.rel * 1000) + " ms" + (v.oct ? " · " + (v.oct > 0 ? "+" : "") + v.oct / 12 + " oct" : "") +
      (v.cut ? " · pasa-bajos " + v.cut + " Hz" : "") + "<br>en tu proyecto podría ser: " + v.ej + "</span></li>").join("");
  }
  function setMode(m) {
    S.mode = m; prev = null;
    // Resetear estado del modo Partícula al cambiar
    prevPartMask = null; sprayParticles.length = 0; lastPartSound = -1e9;
    lEnergy.fill(0); lFlash.fill(0); lCx.fill(NaN); hits.length = 0; flash.fill(0);
    scanT0 = performance.now(); lastStep = -1;
    document.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.mode === m)));
    document.querySelectorAll("#pMode [data-show]").forEach((el) => { el.hidden = !el.dataset.show.split(" ").includes(m); });
    $("modeHint").textContent = MODE_INFO[m].hint; $("stMode").textContent = MODE_INFO[m].name; $("lblZone").textContent = MODE_INFO[m].lbl;
    const chainVerb = m === "escaner" ? "brillo" : m === "particula" ? "movimiento" : "negro";
    $("chain").innerHTML = "luz → cámara → píxel → <b>" + chainVerb + "</b> → regla → nota → sonido";
    $("lblPct").textContent = m === "escaner" ? " · brillo " : m === "particula" ? " · píxeles " : " · densidad ";
    $("lastZone").textContent = "—"; updMap();
  }
  document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  // 4. Control top: conmuta entre G1, G2, G3 para zonas superiores
  document.querySelectorAll("[data-top]").forEach((b) => b.addEventListener("click", () => {
    S.top = b.dataset.top;
    document.querySelectorAll("[data-top]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    updMap();
    toast("Top: " + S.top + " — " + (TOP_GROUPS[S.top] || []).map(s => s.name).join(", "));
  }));
  if ($("mapDir")) $("mapDir").addEventListener("change", (e) => { S.mapDir = e.target.checked; updMap(); });
  if ($("invert")) $("invert").addEventListener("change", (e) => { S.invert = e.target.checked; });
  if ($("mapVel")) $("mapVel").addEventListener("change", (e) => { S.mapVel = e.target.checked; updMap(); });
  if ($("mapPan")) $("mapPan").addEventListener("change", (e) => { S.mapPan = e.target.checked; updMap(); });
  if ($("mirror")) $("mirror").addEventListener("change", (e) => { S.mirror = e.target.checked; prev = null; });
  renderVoices(); setMode("zonas"); updVisState(); updEnvCap(); HL = { key: null, t: 0 };

  // pantalla completa
  $("fsBtn").addEventListener("click", async () => {
    const st = $("stage");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (st.requestFullscreen) await st.requestFullscreen();
      else if (st.webkitRequestFullscreen) st.webkitRequestFullscreen();
      else throw new Error("no");
    } catch (_) { toast("Pantalla completa no disponible en esta vista"); }
  });
  document.addEventListener("fullscreenchange", () => { $("fsBtn").textContent = document.fullscreenElement ? "⛶ Salir" : "⛶ Pantalla completa"; });

  // ================= MIDI =================
  const STORE = "oirlaluz.midi.v1";
  let midiMap = {};
  try { midiMap = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (_) { midiMap = {}; }
  let learning = false, learnTarget = null;
  function saveMap() { try { localStorage.setItem(STORE, JSON.stringify(midiMap)); } catch (_) {} }
  function paintBadges() {
    document.querySelectorAll(".cc").forEach((b) => { b.hidden = true; b.textContent = ""; });
    Object.entries(midiMap).forEach(([cc, id]) => { const b = document.querySelector('.cc[data-for="' + id + '"]'); if (b) { b.hidden = false; b.textContent = "CC" + cc; } });
  }
  paintBadges();
  function onMidi(e) {
    const [st, d1, d2] = e.data;
    if ((st & 0xf0) !== 0xb0) return;
    if (learning && learnTarget) {
      Object.keys(midiMap).forEach((k) => { if (midiMap[k] === learnTarget.id) delete midiMap[k]; });
      midiMap[d1] = learnTarget.id; saveMap(); paintBadges();
      if ($("midiHint")) $("midiHint").textContent = "CC " + d1 + " → " + learnTarget.id + ". Toca otro slider o termina con Asignar.";
      learnTarget.classList.remove("target"); learnTarget = null; return;
    }
    const id = midiMap[d1]; if (!id) return;
    const el = $(id); if (!el) return;
    const min = Number(el.min), max = Number(el.max), step = Number(el.step) || 1;
    el.value = String(Math.round((min + (d2 / 127) * (max - min)) / step) * step);
    el.dispatchEvent(new Event("input"));
  }
  if ($("midiBtn")) {
    $("midiBtn").addEventListener("click", async () => {
      if (!navigator.requestMIDIAccess) { if ($("midiHint")) $("midiHint").textContent = "Este navegador no tiene Web MIDI. Usa Chrome o Edge en la versión local."; return; }
      try {
        const access = await navigator.requestMIDIAccess();
        const bind = () => { let n = 0; access.inputs.forEach((i) => { i.onmidimessage = onMidi; n++; }); if ($("stMidi")) $("stMidi").textContent = n ? n + " conectado" + (n > 1 ? "s" : "") : "sin equipos"; if ($("midiHint")) $("midiHint").textContent = n ? "Presiona Asignar." : "No hay controladores conectados. Enchufa uno y vuelve a intentar."; };
        access.onstatechange = bind; bind();
        $("midiBtn").setAttribute("aria-pressed", "true"); if ($("learnBtn")) $("learnBtn").disabled = false; if ($("midiClear")) $("midiClear").disabled = false;
      } catch (e) { if ($("midiHint")) $("midiHint").textContent = "MIDI no disponible en esta vista. Abre la versión local en Chrome o Edge."; }
    });
  }
  if ($("learnBtn")) {
    $("learnBtn").addEventListener("click", () => {
      learning = !learning; $("learnBtn").setAttribute("aria-pressed", String(learning));
      $("dock").classList.toggle("learning", learning);
      if (learnTarget) { learnTarget.classList.remove("target"); learnTarget = null; }
      if ($("midiHint")) $("midiHint").textContent = learning ? "Abre otro panel, toca un slider y mueve una perilla." : "Asignaciones guardadas en este navegador.";
    });
  }
  document.querySelectorAll("input[type=range]").forEach((el) => el.addEventListener("pointerdown", () => {
    if (!learning) return;
    if (learnTarget) learnTarget.classList.remove("target");
    learnTarget = el; el.classList.add("target");
    if ($("midiHint")) $("midiHint").textContent = "Mueve una perilla para asignarla a " + el.id + ".";
  }));
  if ($("midiClear")) $("midiClear").addEventListener("click", () => { midiMap = {}; saveMap(); paintBadges(); if ($("midiHint")) $("midiHint").textContent = "Asignaciones borradas."; });

  // ================= bucle =================
  let lastT = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (S.src === "demo") drawDemo(dt);
    acc += dt;
    if (acc >= 1 / 15) { acc = 0; analyse(now); }
    if (S.mode === "escaner") scanTick(now);
    drawView(dt); drawScope(); drawEnv(); drawRoll(now);
    if (recording && $("recTime")) { const s = Math.floor((now - recStart) / 1000), t = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); $("recTime").textContent = t; if ($("recBadgeT")) $("recBadgeT").textContent = t; }
    requestAnimationFrame(loop);
  }
  updSoundBtn(); drawDemo(0);
  requestAnimationFrame(loop);
})();
