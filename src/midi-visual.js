import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { Application, Container } from 'pixi.js';
import { Piano } from 'd-piano';
import {
    addKeyGlow, drawDefaultBlackKey, drawDefaultWhiteKey,
    drawHighlightBlackKey, drawHighlightWhiteKey, drawKeyShadow,
    removeKeyGlow, isBlackKey,
    drawKeyboard, addHoverEffects, addClickEffects
} from './key-renderer';
import { initParticle } from './particle.js';
import {
    TOTAL_KEYS, WHITE_KEY_COUNT, noteNames,
    whiteKeyHeight, blackKeyWidth, blackKeyHeight, HighlightColor,
    setHighlightColor
} from './constants.js';
import { createWaterfall } from './waterfall.js';
import { formatTime, setupVolume, setupFullscreen } from './controls.js';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
import Stats from 'stats.js';
const notyf = new Notyf({
    position: { x: 'right', y: 'top' },
    duration: 2500
});


// 动态画布高度
let canvasHeight = window.innerHeight;

// 验证音符数量
if (noteNames.length !== TOTAL_KEYS) {
    console.error(`音符数量错误: 期望${TOTAL_KEYS}个，实际${noteNames.length}个`);
}

// ============ PixiJS App 初始化 ============
const app = new Application();
await app.init({
    width: window.innerWidth,
    height: canvasHeight,
    backgroundColor: 0x00000,
    antialias: true,
});

app.canvas.style.display = 'block';
app.canvas.style.position = 'fixed';
app.canvas.style.top = '0';
app.canvas.style.left = '0';
app.canvas.style.width = '100%';
app.canvas.style.height = '100%';
document.body.appendChild(app.canvas);

// ============ 四层架构 ============
const waterfallLayer = new Container();
const whiteLayer = new Container();
const glowLayer = new Container();
const blackLayer = new Container();
app.stage.addChild(waterfallLayer, whiteLayer, glowLayer, blackLayer);

// ============ 键盘数据 ============
let whiteKeyWidth = 38;
const keys = [];

// 调整白键宽度以适应屏幕
function calculateKeySize() {
    whiteKeyWidth = (app.screen.width - 40) / WHITE_KEY_COUNT;
    return whiteKeyWidth;
}

// 计算琴键位置
function calculateKeyPositions() {
    const actualWhiteKeyWidth = calculateKeySize();
    const startX = (app.screen.width - (WHITE_KEY_COUNT * actualWhiteKeyWidth)) / 2;
    const startY = canvasHeight - whiteKeyHeight;

    let whiteKeyIndex = 0;
    let currentX = startX;

    for (let i = 0; i < TOTAL_KEYS; i++) {
        const noteName = noteNames[i];
        const isBlack = isBlackKey(noteName);

        if (isBlack) {
            const x = currentX - blackKeyWidth / 2;
            keys.push({
                index: i, noteName, isBlack: true,
                x, y: startY, width: blackKeyWidth, height: blackKeyHeight,
                whiteKeyIndex: whiteKeyIndex - 1
            });
        } else {
            keys.push({
                index: i, noteName, isBlack: false,
                x: currentX, y: startY, width: actualWhiteKeyWidth, height: whiteKeyHeight,
                whiteKeyIndex
            });
            currentX += actualWhiteKeyWidth;
            whiteKeyIndex++;
        }
    }
    // console.log(`已生成 ${keys.length} 个琴键 (白键: ${whiteKeyIndex}, 黑键: ${TOTAL_KEYS - whiteKeyIndex})`);
}
// ============ pianoMap & 瀑布流系统 ============
const pianoMap = new Map();
const waterfall = createWaterfall(waterfallLayer, pianoMap, keys);

// ============ 状态变量 ============
let midi = null;
let notes = [];
let currentpart = null;
let isPlaying = false;
let midiDuration = 0;
let isSeeking = false;

// ============ 初始化（支持窗口缩放时重新调用） ============
function init() {
    keys.length = 0;
    waterfallLayer.removeChildren();
    whiteLayer.removeChildren();
    glowLayer.removeChildren();
    blackLayer.removeChildren();
    waterfall.clear();

    calculateKeyPositions();
    drawKeyboard(keys, whiteLayer, blackLayer);
    addHoverEffects(app, keys, HighlightColor);
    addClickEffects(app, keys, HighlightColor);

    pianoMap.clear();
    let midiBasis = 21;
    for (let i = 0; i < keys.length; i++) {
        pianoMap.set(midiBasis, keys[i]);
        midiBasis++;
    }

    if (!init._waterfallAdded) {
        app.ticker.add(() => waterfall.update(Tone.Transport.seconds));
        init._waterfallAdded = true;
    }

    // resize 后重新注入已加载的音符数据
    if (notes.length > 0) {
        waterfall.addNotes(notes.map(n => ({ note: n })));
    }
   // console.log('钢琴键盘初始化完成');
}

// 窗口缩放处理（防抖）
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        canvasHeight = window.innerHeight;
        app.renderer.resize(window.innerWidth, window.innerHeight);
        init();
    }, 200);
});

// 启动
init();
const { emit: emitParticle, setColor: setParticleColor, setEnabled: setParticleEnabled } = initParticle(app, pianoMap);

// ============ 帧率显示 ============
const stats = new Stats();
stats.dom.style.position = 'fixed';
stats.dom.style.top = '0';
stats.dom.style.left = '0';
stats.dom.style.zIndex = '10000';
stats.dom.style.display = 'none';
document.body.appendChild(stats.dom);
app.ticker.add(() => stats.update());

// ============ 按键高亮系统 ============
const keyHighlightEndTime = new Map();

function lightKey(index, during) {
    const key = pianoMap.get(index);
    if (!key) return;
    if (key.isBlack) {
        drawHighlightBlackKey(key, HighlightColor);
        drawKeyShadow(key);
        addKeyGlow(key, glowLayer, HighlightColor);
    } else {
        drawHighlightWhiteKey(key, HighlightColor);
        drawKeyShadow(key);
        addKeyGlow(key, glowLayer, HighlightColor);
    }
    keyHighlightEndTime.set(index, Tone.Transport.seconds + during);
}

// 每帧检查是否有按键需要恢复
app.ticker.add(() => {
    const now = Tone.Transport.seconds;
    keyHighlightEndTime.forEach((endTime, midi) => {
        if (now >= endTime) {
            const key = pianoMap.get(midi);
            if (key) {
                removeKeyGlow(key, glowLayer);
                if (key.isBlack) drawDefaultBlackKey(key);
                else drawDefaultWhiteKey(key);
            }
            keyHighlightEndTime.delete(midi);
        }
    });
});

function clearAllKeyHighlights() {
    keyHighlightEndTime.forEach((_, midi) => {
        const key = pianoMap.get(midi);
        if (key) {
            removeKeyGlow(key, glowLayer);
            if (key.isBlack) drawDefaultBlackKey(key);
            else drawDefaultWhiteKey(key);
        }
    });
    keyHighlightEndTime.clear();
}

// ============ Piano 音源 ============
const piano = new Piano({
    velocities: 5,
    maxPolyphony: 64,
    volume: { strings: -10, keybed: -10, harmonics: -5, pedal: -10 }
});
const reverb = new Tone.Reverb({ decay: 2.5, wet: 0 });
const volumeNode = new Tone.Gain(0.8).toDestination();
piano.connect(reverb);
reverb.connect(volumeNode);

let pianoLoaded = false;

piano.load().then(() => {
    console.log('钢琴音源加载完成');
    pianoLoaded = true;
    notyf.success('钢琴音源加载成功');
}).catch((err) => {
    console.error('钢琴音源加载失败', err);
    notyf.error('钢琴音源加载失败');
});

// ============ MIDI 文件加载 ============
async function loadMidiBuffer(buffer, displayName) {
    document.getElementById('filename').textContent = displayName;
    midi = new Midi(buffer);
    midiInit();
}

document.getElementById('midi').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    await loadMidiBuffer(buffer, file.name);
});

document.getElementById('load-example').addEventListener('click', async () => {
    const btn = document.getElementById('load-example');
    btn.disabled = true;
    btn.textContent = '加载中...';
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}Flower_Dance.mid`);
        if (!response.ok) throw new Error('加载失败');
        const buffer = await response.arrayBuffer();
        await loadMidiBuffer(buffer, 'Flower_Dance.mid');
    } catch (err) {
        console.error('示例加载失败:', err);
        alert('示例文件加载失败');
    } finally {
        btn.disabled = false;
        btn.textContent = '示例';
    }
});

// ============ 播放/暂停 ============
const playBtn = document.getElementById('playmidi');
const iconPlay = playBtn.querySelector('.icon-play');
const iconPause = playBtn.querySelector('.icon-pause');

export function togglePlay() {
    if (!pianoLoaded) {
        notyf.error({ message: '钢琴音源尚未加载完成，请稍候', duration: 3000 });
        return;
    }
    if (!currentpart) {
        document.getElementById('midi').click();
        return;
    }
    if (isPlaying) {
        Tone.Transport.pause();
        piano.pedalUp();
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
        playBtn.title = '播放';
        isPlaying = false;
    } else {
        if (Tone.Transport.state === 'paused') {
            Tone.Transport.start();
        } else {
            currentpart.start();
            Tone.Transport.start();
        }
        iconPlay.style.display = 'none';
        iconPause.style.display = 'block';
        playBtn.title = '暂停';
        isPlaying = true;
    }
}

Tone.Transport.on('stop', () => {
    iconPlay.style.display = 'block';
    iconPause.style.display = 'none';
    playBtn.title = '播放';
    isPlaying = false;
    progressBar.value = 0;
    timeCurrent.textContent = '0:00';
});



playBtn.onclick = () => {  togglePlay(); };

// 空格键控制播放/暂停
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        togglePlay();
    }
});

// ============ 设置面板 ============
const settingsBtn = document.getElementById('settings-btn');
const settingsDialog = document.getElementById('settings-dialog');
const waterfallToggle = document.getElementById('waterfall-toggle');
const settingsClose = document.getElementById('settings-close');
const settingsReset = document.getElementById('settings-reset');
const bgColorInput = document.getElementById('bg-color');
const highlightColorInput = document.getElementById('highlight-color');
const waterfallColorInput = document.getElementById('waterfall-color');
const particleColorInput = document.getElementById('particle-color');
const particleToggle = document.getElementById('particle-toggle');
const fpsToggle = document.getElementById('fps-toggle');
const reverbToggle = document.getElementById('reverb-toggle');
const reverbSlider = document.getElementById('reverb-slider');
const reverbValue = document.getElementById('reverb-value');

const DEFAULTS = {
    waterfallVisible: true,
    particleVisible: true,
    fpsVisible: false,
    bgColor: '#000000',
    highlightColor: '#9400D3',
    waterfallColor: '#aa66ff',
    particleColor: '#aa66ff',
    reverbEnabled: false,
    reverbWet: 30,
};

// 工具函数：hex 字符串 → 数值
function hexToNum(hex) { return parseInt(hex.replace('#', ''), 16); }

// 从 localStorage 恢复设置
const savedWaterfall = localStorage.getItem('waterfallVisible');
if (savedWaterfall !== null) {
    waterfallLayer.visible = savedWaterfall === 'true';
    waterfallToggle.checked = waterfallLayer.visible;
} else {
    waterfallToggle.checked = DEFAULTS.waterfallVisible;
}

const savedParticle = localStorage.getItem('particleVisible');
if (savedParticle !== null) {
    setParticleEnabled(savedParticle === 'true');
    particleToggle.checked = savedParticle === 'true';
} else {
    setParticleEnabled(DEFAULTS.particleVisible);
    particleToggle.checked = DEFAULTS.particleVisible;
}

const savedFps = localStorage.getItem('fpsVisible');
if (savedFps !== null) {
    const show = savedFps === 'true';
    stats.dom.style.display = show ? 'block' : 'none';
    fpsToggle.checked = show;
} else {
    stats.dom.style.display = 'none';
    fpsToggle.checked = DEFAULTS.fpsVisible;
}

function restoreOr(cfgKey, input, applyFn) {
    const saved = localStorage.getItem(cfgKey);
    if (saved) {
        input.value = saved;
        applyFn(saved);
    } else {
        input.value = DEFAULTS[cfgKey];
        applyFn(DEFAULTS[cfgKey]);
    }
}

function applyBgColor(hexStr) {
    app.renderer.background.color = hexToNum(hexStr);
    document.body.style.background = hexStr;
}

function applyHighlightColor(hexStr) {
    setHighlightColor(hexToNum(hexStr));
    init();
}

function applyWaterfallColor(hexStr) {
    waterfall.setColor(hexToNum(hexStr));
    // 瀑布流条的颜色在 initBar 时写入，需要重建
    if (notes.length > 0) {
        waterfall.clear();
        waterfall.addNotes(notes.map(n => ({ note: n })));
    }
}

function applyParticleColor(hexStr) {
    setParticleColor(hexToNum(hexStr));
}

restoreOr('bgColor', bgColorInput, applyBgColor);
restoreOr('highlightColor', highlightColorInput, applyHighlightColor);
restoreOr('waterfallColor', waterfallColorInput, applyWaterfallColor);
restoreOr('particleColor', particleColorInput, applyParticleColor);

settingsBtn.addEventListener('click', () => {
    settingsDialog.showModal();
});

settingsClose.addEventListener('click', () => {
    settingsDialog.close();
});

settingsDialog.addEventListener('click', (e) => {
    if (e.target === settingsDialog) settingsDialog.close();
});

waterfallToggle.addEventListener('change', () => {
    waterfallLayer.visible = waterfallToggle.checked;
    localStorage.setItem('waterfallVisible', waterfallToggle.checked);
});

particleToggle.addEventListener('change', () => {
    setParticleEnabled(particleToggle.checked);
    localStorage.setItem('particleVisible', particleToggle.checked);
});

fpsToggle.addEventListener('change', () => {
    stats.dom.style.display = fpsToggle.checked ? 'block' : 'none';
    localStorage.setItem('fpsVisible', fpsToggle.checked);
});

// ============ 混响控制 ============
function applyReverbToggle() {
    const enabled = reverbToggle.checked;
    reverb.wet.value = enabled ? reverbSlider.value / 100 : 0;
    reverbSlider.disabled = !enabled;
    reverbValue.style.opacity = enabled ? '1' : '0.4';
}

function applyReverbWet() {
    const wet = reverbSlider.value / 100;
    if (reverbToggle.checked) {
        reverb.wet.value = wet;
    }
    reverbValue.textContent = reverbSlider.value + '%';
}

// 恢复混响设置
const savedReverbEnabled = localStorage.getItem('reverbEnabled');
if (savedReverbEnabled !== null) {
    reverbToggle.checked = savedReverbEnabled === 'true';
} else {
    reverbToggle.checked = DEFAULTS.reverbEnabled;
}
const savedReverbWet = localStorage.getItem('reverbWet');
if (savedReverbWet !== null) {
    reverbSlider.value = savedReverbWet;
} else {
    reverbSlider.value = DEFAULTS.reverbWet;
}
applyReverbToggle();
applyReverbWet();

reverbToggle.addEventListener('change', () => {
    applyReverbToggle();
    localStorage.setItem('reverbEnabled', reverbToggle.checked);
});

reverbSlider.addEventListener('input', () => {
    applyReverbWet();
    localStorage.setItem('reverbWet', reverbSlider.value);
});

bgColorInput.addEventListener('input', () => {
    const val = bgColorInput.value;
    applyBgColor(val);
    localStorage.setItem('bgColor', val);
});

highlightColorInput.addEventListener('input', () => {
    const val = highlightColorInput.value;
    applyHighlightColor(val);
    localStorage.setItem('highlightColor', val);
});

waterfallColorInput.addEventListener('input', () => {
    const val = waterfallColorInput.value;
    applyWaterfallColor(val);
    localStorage.setItem('waterfallColor', val);
});

particleColorInput.addEventListener('input', () => {
    const val = particleColorInput.value;
    applyParticleColor(val);
    localStorage.setItem('particleColor', val);
});

// 重置所有设置为默认值
settingsReset.addEventListener('click', () => {
    localStorage.clear();
    waterfallLayer.visible = DEFAULTS.waterfallVisible;
    waterfallToggle.checked = DEFAULTS.waterfallVisible;
    setParticleEnabled(DEFAULTS.particleVisible);
    particleToggle.checked = DEFAULTS.particleVisible;
    stats.dom.style.display = 'none';
    fpsToggle.checked = DEFAULTS.fpsVisible;
    bgColorInput.value = DEFAULTS.bgColor;
    applyBgColor(DEFAULTS.bgColor);
    highlightColorInput.value = DEFAULTS.highlightColor;
    applyHighlightColor(DEFAULTS.highlightColor);
    waterfallColorInput.value = DEFAULTS.waterfallColor;
    applyWaterfallColor(DEFAULTS.waterfallColor);
    particleColorInput.value = DEFAULTS.particleColor;
    applyParticleColor(DEFAULTS.particleColor);
    reverbToggle.checked = DEFAULTS.reverbEnabled;
    reverbSlider.value = DEFAULTS.reverbWet;
    applyReverbToggle();
    applyReverbWet();
});

// ============ 音量 & 全屏 ============
setupVolume(
    document.getElementById('volume-slider'),
    document.getElementById('volume-btn'),
    document.getElementById('volume-btn').querySelector('.icon-sound'),
    document.getElementById('volume-btn').querySelector('.icon-mute'),
    volumeNode
);
setupFullscreen(document.getElementById('fullscreen'));

// ============ 进度条 ============
const progressBar = document.getElementById('progress-bar');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');

function updateProgressBar() {
    if (isSeeking || !midiDuration) return;
    const t = Tone.Transport.seconds;
    if (t >= midiDuration) {
        Tone.Transport.pause();
        Tone.Transport.seconds = 0;
        clearAllKeyHighlights();
        progressBar.value = 0;
        timeCurrent.textContent = '0:00';
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
        playBtn.title = '播放';
        isPlaying = false;
        return;
    }
    progressBar.value = t;
    timeCurrent.textContent = formatTime(t);
}

progressBar.addEventListener('input', () => {
    if (!midiDuration) return;
    isSeeking = true;
    if (isPlaying) Tone.Transport.pause();
    const t = parseFloat(progressBar.value);
    timeCurrent.textContent = formatTime(t);
});

progressBar.addEventListener('change', () => {
    if (!midiDuration) return;
    const t = parseFloat(progressBar.value);

    if (Tone.Transport.state === 'stopped') {
        currentpart.start();
        Tone.Transport.start();
        Tone.Transport.seconds = t;
        Tone.Transport.pause();
    } else {
        if (isPlaying) Tone.Transport.pause();
        Tone.Transport.seconds = t;
    }

    clearAllKeyHighlights();
    if (isPlaying) {
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
        playBtn.title = '播放';
        isPlaying = false;
    }
    isSeeking = false;
});

function progressLoop() {
    if (isPlaying || isSeeking) {
        updateProgressBar();
    }
    requestAnimationFrame(progressLoop);
}
requestAnimationFrame(progressLoop);

// ============ MIDI 初始化（解析音符、踏板事件、创建 Part） ============
function midiInit() {
    notes = [];
    waterfall.clear();

    if (currentpart) {
        currentpart.dispose();
        Tone.Transport.stop();
        Tone.Transport.cancel();
        currentpart = null;
    }
    clearAllKeyHighlights();

    // 收集音符
    midi.tracks.forEach((track) => {
        track.notes.forEach(note => {
            notes.push(note);
        });
    });

    // 收集延音踏板事件
    const pedalEvents = [];
    midi.tracks.forEach((track) => {
        const cc = track.controlChanges;
        const sustainCC = cc.sustain || cc["64"] || cc[64];
        if (sustainCC) {
            sustainCC.forEach(evt => {
                pedalEvents.push({
                    time: evt.time,
                    down: evt.value >= 0.5,
                });
            });
        }
    });
    pedalEvents.sort((a, b) => a.time - b.time);

    // 将每个音符拆成 noteOn / noteOff 两个事件，与踏板事件合并
    const allEvents = [];
    for (const n of notes) {
        allEvents.push({ time: n.time, type: 'noteOn', data: n });
        allEvents.push({ time: n.time + n.duration, type: 'noteOff', data: n });
    }
    for (const e of pedalEvents) {
        allEvents.push({ time: e.time, type: 'pedal', data: e });
    }
    allEvents.sort((a, b) => a.time - b.time);

    // 将音符数据注入瀑布流系统
    waterfall.addNotes(notes.map(note => ({ note })));

   // console.log(`加载了 ${notes.length} 个音符，${pedalEvents.length} 个踏板事件`);

    currentpart = new Tone.Part((time, event) => {
        if (event.type === 'noteOn') {
            const note = event.data;
            piano.keyDown({ note: note.name, time, velocity: note.velocity });
            lightKey(note.midi, note.duration);
            emitParticle(note.midi, note.duration);
        } else if (event.type === 'noteOff') {
            const note = event.data;
            piano.keyUp({ note: note.name, time });
        } else if (event.type === 'pedal') {
            if (event.data.down) {
                piano.pedalDown({ time });
            } else {
                piano.pedalUp({ time });
            }
        }
    }, allEvents.map(e => [e.time, e]));

    // 更新进度条总时长
    midiDuration = midi.duration;
    timeTotal.textContent = formatTime(midiDuration);
    progressBar.max = midiDuration;
    progressBar.value = 0;
    progressBar.disabled = false;
    timeCurrent.textContent = '0:00';
}
