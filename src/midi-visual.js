import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { Application, Graphics, Text, BlurFilter, Container } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { Piano } from 'd-piano';
import { addKeyGlow, drawDefaultBlackKey, drawDefaultWhiteKey, drawHighlightBlackKey, drawHighlightWhiteKey, drawKeyShadow, removeKeyGlow ,isBlackKey} from './key-renderer';
import { initParticle } from './particle.js';
import Stats from 'stats.js';

// 初始化 Stats (FPS 显示器)
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

// 在 ticker 中更新 stats


// 常量定义
let canvasHeight = window.innerHeight;  // 动态画布高度
const TOTAL_KEYS = 88;  // 定义总键数
const WHITE_KEY_COUNT = 52;  // 白键数量
const BLACK_KEY_COUNT = 36;  // 黑键数量

// 瀑布流配置
const WATERFALL = {
    pixelsPerSecond: 150,    // 每秒对应的像素数
    lookAheadTime: 5,        // 提前显示的时间（秒）
    color: 0xaa66ff,         // 统一颜色（紫色）
};

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


// 88键音符名称 (从A0到C8)
const noteNames = [
    'A0', 'A#0', 'B0',  // 1-3
    'C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1',  // 4-16
    'C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2',
    'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5',
    'C6', 'C#6', 'D6', 'D#6', 'E6', 'F6', 'F#6', 'G6', 'G#6', 'A6', 'A#6', 'B6',
    'C7', 'C#7', 'D7', 'D#7', 'E7', 'F7', 'F#7', 'G7', 'G#7', 'A7', 'A#7', 'B7',
    'C8'
];

// 验证音符数量
if (noteNames.length !== TOTAL_KEYS) {
    console.error(`音符数量错误: 期望${TOTAL_KEYS}个，实际${noteNames.length}个`);
}



// 键盘参数
let whiteKeyWidth = 38;     // 白键宽度
const whiteKeyHeight = 200;  // 白键高度
const blackKeyWidth = 18;    // 黑键宽度
const blackKeyHeight = 120;  // 黑键高度
const HighlightColor = 0x9400D3;
// 存储所有键
const keys = [];

// 四层架构：瀑布流层 → 白键层 → 发光层 → 黑键层
const waterfallLayer = new Container();  // 瀑布流最底层
const whiteLayer = new Container();
const glowLayer = new Container();
const blackLayer = new Container();
app.stage.addChild(waterfallLayer);
app.stage.addChild(whiteLayer);
app.stage.addChild(glowLayer);
app.stage.addChild(blackLayer);
app.ticker.add(() => {
    stats.update();
});

// 调整白键宽度以适应屏幕
function calculateKeySize() {
    const totalWhiteKeysWidth = WHITE_KEY_COUNT * whiteKeyWidth;
    //  if (totalWhiteKeysWidth > app.screen.width) {
    whiteKeyWidth = (app.screen.width - 40) / WHITE_KEY_COUNT;
    return whiteKeyWidth;
    //  }
    // return whiteKeyWidth;
}

// 计算琴键位置
function calculateKeyPositions() {
    const actualWhiteKeyWidth = calculateKeySize();
    const startX = (app.screen.width - (WHITE_KEY_COUNT * actualWhiteKeyWidth)) / 2;
    const startY = canvasHeight - whiteKeyHeight 

    let whiteKeyIndex = 0;
    let currentX = startX;

    for (let i = 0; i < TOTAL_KEYS; i++) {
        const noteName = noteNames[i];
        const isBlack = isBlackKey(noteName);

        if (isBlack) {
            // 黑键位于两个白键之间，偏左一点
            const x = currentX - blackKeyWidth / 2;
            const y = startY;
            keys.push({
                index: i,
                noteName: noteName,
                isBlack: true,
                x: x,
                y: y,
                width: blackKeyWidth,
                height: blackKeyHeight,
                whiteKeyIndex: whiteKeyIndex - 1
            });
        } else {
            // 白键
            const x = currentX;
            const y = startY;
            keys.push({
                index: i,
                noteName: noteName,
                isBlack: false,
                x: x,
                y: y,
                width: actualWhiteKeyWidth,
                height: whiteKeyHeight,
                whiteKeyIndex: whiteKeyIndex
            });
            currentX += actualWhiteKeyWidth;
            whiteKeyIndex++;
        }
    }

    console.log(`已生成 ${keys.length} 个琴键 (白键: ${whiteKeyIndex}, 黑键: ${TOTAL_KEYS - whiteKeyIndex})`);
}

// 绘制整个键盘
function drawKeyboard() {
    // 先画白键（加入 whiteLayer）
    keys.forEach(key => {
        if (!key.isBlack) {
            const graphics = new Graphics();

            // 白键背景
            graphics.beginFill(0xffffff);
            graphics.lineStyle(1, 0x888888, 1);
            graphics.drawRect(key.x, key.y, key.width, key.height);
            graphics.endFill();

            // 添加阴影效果
            graphics.lineStyle(0);
            graphics.beginFill(0x000000, 0.05);
            graphics.drawRect(key.x + 2, key.y + 2, key.width, key.height);
            graphics.endFill();

            key.graphics = graphics;
            whiteLayer.addChild(graphics);
        }
    });

    // 后画黑键（加入 blackLayer，在最顶层）
    keys.forEach(key => {
        if (key.isBlack) {
            const graphics = new Graphics();

            // 黑键背景
            graphics.beginFill(0x1a1a1a);
            graphics.lineStyle(1, 0x444444, 1);
            graphics.drawRect(key.x, key.y, key.width, key.height);
            graphics.endFill();

            // 黑键高光
            graphics.beginFill(0x333333, 0.3);
            graphics.drawRect(key.x + 2, key.y + 2, key.width - 4, 8);
            graphics.endFill();

            key.graphics = graphics;
            blackLayer.addChild(graphics);
        }
    });
}

// 添加鼠标悬停效果
function addHoverEffects() {
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    // 监听鼠标移动
    app.stage.on('mousemove', (event) => {
        const mousePos = event.data.global;
        let hoveredKey = null;

        // 查找鼠标下的琴键
        for (let key of keys) {
            if (mousePos.x >= key.x && mousePos.x <= key.x + key.width &&
                mousePos.y >= key.y && mousePos.y <= key.y + key.height) {
                hoveredKey = key;
                break;
            }
        }
        
        // 重置所有琴键样式
        keys.forEach(key => {
            if(key.glowContainer){return ;}
          if (key.isBlack) {
                drawDefaultBlackKey(key);
            } else {
                drawDefaultWhiteKey(key);
            }
        });

        // 高亮当前悬停的琴键
        if (hoveredKey) {
            if (hoveredKey.isBlack) {
                drawHighlightBlackKey(hoveredKey, HighlightColor);
                drawKeyShadow(hoveredKey);
            } else {
                drawHighlightWhiteKey(hoveredKey, HighlightColor);
                drawKeyShadow(hoveredKey);
            }
           
        }
    });

    // 鼠标离开画布时恢复所有琴键
    app.stage.on('mouseout', () => {
        keys.forEach(key => {
            if (key.glowContainer) return;
            if (key.isBlack) {
                drawDefaultBlackKey(key);
            } else {
                drawDefaultWhiteKey(key);
            }
        });
    });
}

// 添加点击效果（只改变颜色，不发声）
function addClickEffects() {
    app.stage.on('mousedown', (event) => {
        const mousePos = event.data.global;

        // 查找点击的琴键
        for (let key of keys) {
            if (mousePos.x >= key.x && mousePos.x <= key.x + key.width &&
                mousePos.y >= key.y && mousePos.y <= key.y + key.height) {

                // 按下效果
                if (key.isBlack) {
                    drawHighlightBlackKey(key, HighlightColor);
                } else {
                    drawHighlightWhiteKey(key, HighlightColor);
                }

                // 延迟恢复
                setTimeout(() => {
                    if (key.isBlack) {
                        drawDefaultBlackKey(key);
                    } else {
                        drawDefaultWhiteKey(key);
                    }
                }, 150);

                break;
            }
        }
    });
}
// ============ 瀑布流系统 ============
let allWaterfallNotes = [];   // 所有瀑布流音符数据
let activeWaterfallBars = []; // 当前活动的瀑布流条 Graphics 对象
const waterfallBarPool = [];  // 对象池（复用 Graphics）
const noteToBarMap = new Map(); // noteData -> bar 映射，避免每帧重复创建

// 发光滤镜（所有瀑布流条共用，提高性能）
const waterfallGlowFilter = new GlowFilter({
    distance: 12,
    outerStrength: 3,
    innerStrength: 1.5,
    color: WATERFALL.color,
    quality: 0.4,
});

// 创建或从对象池获取一个瀑布流音符条
function getWaterfallBar() {
    if (waterfallBarPool.length > 0) {
        const bar = waterfallBarPool.pop();
        bar.visible = true;
        return bar;
    }
    const bar = new Graphics();
    bar.filters = [waterfallGlowFilter];
    return bar;
}

// 回收瀑布流音符条到对象池
function recycleWaterfallBar(bar) {
    bar.visible = false;
    bar._noteData = null;
    waterfallBarPool.push(bar);
}

// 初始化瀑布流音符条（只绘制一次，后续只改位置）
function initWaterfallBar(bar, noteData) {
    const key = pianoMap.get(noteData.note.midi);
    if (!key) return false;

    const barHeight = Math.max(noteData.note.duration * WATERFALL.pixelsPerSecond, 3);

    bar.clear();

    // 底部柔光底衬（比主色条略宽，产生光晕）
    bar.beginFill(WATERFALL.color, 0.15);
    bar.drawRoundedRect(-1, -1, key.width + 2, barHeight + 2, 10);
    bar.endFill();

    // 主色条
    bar.beginFill(WATERFALL.color, 0.85);
    bar.drawRoundedRect(0, 0, key.width, barHeight, 10);
    bar.endFill();

    // 顶部高亮边
    bar.lineStyle(1.5, 0xFFFFFF, 0.6);
    bar.moveTo(0, 0);
    bar.lineTo(key.width, 0);

    bar._keyX = key.x;
    bar._noteData = noteData;
    return true;
}

// 更新瀑布流（每帧调用）
function updateWaterfall() {
    if (allWaterfallNotes.length === 0) return;

    const currentTime = Tone.Transport.seconds;
    const keyStartY = keys[0]?.y || 0;
    const visibleTopY = keyStartY - WATERFALL.lookAheadTime * WATERFALL.pixelsPerSecond;
    const nextActiveSet = new Set();

    // 遍历所有音符，找出当前应该在屏幕上的
    for (const noteData of allWaterfallNotes) {
        const timeDiff = noteData.note.time - currentTime;
        const barBottomY = keyStartY - timeDiff * WATERFALL.pixelsPerSecond;
        const barHeight = Math.max(noteData.note.duration * WATERFALL.pixelsPerSecond, 3);
        const barTopY = barBottomY - barHeight;

        // 完全在可视区域上方 → 还没到
        if (barTopY < visibleTopY) continue;
        // 音符已结束超过0.3秒 → 不再显示
        if (timeDiff + noteData.note.duration < -0.3) continue;

        let bar = noteToBarMap.get(noteData);
        if (!bar) {
            bar = getWaterfallBar();
            if (!initWaterfallBar(bar, noteData)) continue;
            if (!bar.parent) {
                waterfallLayer.addChild(bar);
            }
            noteToBarMap.set(noteData, bar);
        }

        bar.x = bar._keyX;
        bar.y = barTopY;
        bar.visible = true;
        nextActiveSet.add(bar);
    }

    // 回收不再可见的 bar
    for (const bar of activeWaterfallBars) {
        if (!nextActiveSet.has(bar)) {
            recycleWaterfallBar(bar);
            if (bar._noteData) noteToBarMap.delete(bar._noteData);
        }
    }

    activeWaterfallBars = Array.from(nextActiveSet);
}

// 初始化（支持窗口缩放时重新调用）
function init() {
    // 清除旧数据
    keys.length = 0;
    noteToBarMap.clear();
    activeWaterfallBars.forEach(bar => recycleWaterfallBar(bar));
    activeWaterfallBars = [];
    waterfallBarPool.forEach(bar => { if (bar.parent) bar.parent.removeChild(bar); });
    waterfallBarPool.length = 0;
    waterfallLayer.removeChildren();
    whiteLayer.removeChildren();
    glowLayer.removeChildren();
    blackLayer.removeChildren();

    calculateKeyPositions();
    drawKeyboard();
    addHoverEffects();
    addClickEffects();

    // 重建 pianoMap
    pianoMap.clear();
    let midiBasis = 21;
    for (let i = 0; i < keys.length; i++) {
        pianoMap.set(midiBasis, keys[i]);
        midiBasis++;
    }

    // 更新瀑布流定时器引用（避免重复添加）
    if (!init._waterfallAdded) {
        app.ticker.add(updateWaterfall);
        init._waterfallAdded = true;
    }

    console.log('钢琴键盘初始化完成');
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

// 声明 pianoMap（init 内部会填充）
const pianoMap = new Map();

// 启动
init();
const emitParticle = initParticle(app, pianoMap);

// 按键高亮结束时间记录（midi → 结束时间戳）
const keyHighlightEndTime = new Map();

function lightKey(index, during) {
    const key = pianoMap.get(index);
    if (!key) return;
    if (key.isBlack) {
        drawHighlightBlackKey(key, HighlightColor);
        drawKeyShadow(key);
        addKeyGlow(key, glowLayer);
    } else {
        drawHighlightWhiteKey(key, HighlightColor);
        drawKeyShadow(key);
        addKeyGlow(key, glowLayer);
    }
    // 记录该按键应该恢复的时间
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
                if (key.isBlack) {
                    drawDefaultBlackKey(key);
                } else {
                    drawDefaultWhiteKey(key);
                }
            }
            keyHighlightEndTime.delete(midi);
        }
    });
});
let midi = null;
let notes = [];
let currentpart = null;
document.getElementById('midi').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('filename').textContent = file.name;
    const buffer = await file.arrayBuffer();
    midi = new Midi(buffer);
    midiInit();
})
// 自动加载固定的MIDI文件
async function loadDefaultMidi() {
    try {
        const response = await fetch('/Steinway.mid'); // 修改为你的文件名
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        midi = new Midi(buffer);
        midiInit();
        console.log('默认MIDI文件加载完成');
    } catch (error) {
        console.error('加载默认MIDI文件失败:', error);
    }
}






const piano = new Piano({
    velocities: 5,
    maxPolyphony: 128,
    volume: { strings: -10, keybed: -10, harmonics: -5, pedal: -10 }
});
piano.toDestination();

piano.load().then(() => {
    console.log('钢琴音源加载完成');
    
    loadDefaultMidi();
    
});

let isPlaying = false;
const playBtn = document.getElementById('playmidi');
const iconPlay = playBtn.querySelector('.icon-play');
const iconPause = playBtn.querySelector('.icon-pause');

export function togglePlay() {
    if (!currentpart) {
        console.warn('MIDI尚未加载完成');
        return;
    }
    if (isPlaying) {
        Tone.Transport.pause();
        iconPlay.style.display = 'block';
        iconPause.style.display = 'none';
        playBtn.title = '播放';
        isPlaying = false;
        console.log('暂停播放');
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
        console.log('开始播放');
    }
}

// 播放结束时重置状态
Tone.Transport.on('stop', () => {
    iconPlay.style.display = 'block';
    iconPause.style.display = 'none';
    playBtn.title = '播放';
    isPlaying = false;
});

playBtn.onclick = () => { togglePlay() };

// 全屏切换
const fullscreenBtn = document.getElementById('fullscreen');
fullscreenBtn.onclick = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        fullscreenBtn.title = '退出全屏';
    } else {
        document.exitFullscreen();
        fullscreenBtn.title = '全屏';
    }
};
// 监听 ESC 键或全屏状态变化
document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.title = document.fullscreenElement ? '退出全屏' : '全屏';
});

function midiInit() {
    notes = [];
    allWaterfallNotes = [];  // 清空瀑布流数据
    // 清空之前的瀑布流条
    activeWaterfallBars.forEach(bar => recycleWaterfallBar(bar));
    activeWaterfallBars = [];
    // 也清理对象池中还在 stage 上的
    waterfallBarPool.forEach(bar => {
        if (bar.parent) bar.parent.removeChild(bar);
    });
    waterfallBarPool.length = 0;
    // 清理 waterfallLayer 上的残留
    waterfallLayer.removeChildren();
    noteToBarMap.clear();

    if (currentpart) {
        currentpart.dispose();
        Tone.Transport.stop();
        Tone.Transport.cancel();
        currentpart = null;
    }
    // 恢复踏板状态
    piano.pedalUp();
    // 恢复所有正在高亮的按键并清空记录
    keyHighlightEndTime.forEach((_, midi) => {
        const key = pianoMap.get(midi);
        if (key) {
            removeKeyGlow(key, glowLayer);
            if (key.isBlack) {
                drawDefaultBlackKey(key);
            } else {
                drawDefaultWhiteKey(key);
            }
        }
    });
    keyHighlightEndTime.clear();

    midi.tracks.forEach((track) => {
        track.notes.forEach(note => {
            notes.push(note);
            allWaterfallNotes.push({ note });
        });
    });

    // 加载延音踏板事件（sustain = CC#64）
    const pedalEvents = [];
    midi.tracks.forEach((track) => {
        const cc = track.controlChanges;
        const sustainCC = cc.sustain || cc["64"] || cc[64];
        if (sustainCC) {
            sustainCC.forEach(evt => {
                pedalEvents.push({
                    time: evt.time,
                    down: evt.value >= 0.5,  // @tonejs/midi 归一化为 0-1
                });
            });
        }
    });
    pedalEvents.sort((a, b) => a.time - b.time);

    // 只保留 DOWN 事件，在每个 DOWN 前自动插入 UP（提前一小段时间释放旧音）
    const PEDAL_UP_LEAD = 0.01; // 提前10ms抬起，避免和下一个DOWN重叠
    const filteredPedalEvents = [];
    for (let i = 0; i < pedalEvents.length; i++) {
        const evt = pedalEvents[i];
        if (evt.down) {
            // 在DOWN之前插入UP，让之前的延音释放
            filteredPedalEvents.push({ time: evt.time - PEDAL_UP_LEAD, down: false });
            filteredPedalEvents.push(evt);
        }
        // 忽略原始的UP事件，由上面的逻辑自动生成
    }

    // 合并音符和踏板事件到一个 Part
    const allEvents = [
        ...notes.map(n => ({ time: n.time, type: 'note', data: n })),
        ...filteredPedalEvents.map(e => ({ time: e.time, type: 'pedal', data: e })),
    ];
    allEvents.sort((a, b) => a.time - b.time);

    console.log(`加载了 ${notes.length} 个音符，${allWaterfallNotes.length} 个瀑布流音符，${pedalEvents.length} 个踏板事件`);

    currentpart = new Tone.Part((time, event) => {
        if (event.type === 'note') {
            const note = event.data;
            piano.keyDown({ note: note.name, time, velocity: note.velocity });
            piano.keyUp({ note: note.name, time: time + note.duration });
            lightKey(note.midi, note.duration);
            emitParticle(note.midi, note.duration);
        } else if (event.type === 'pedal') {
            if (event.data.down) {
                piano.pedalDown({ time });
            } else {
                piano.pedalUp({ time });
            }
        }
    }, allEvents.map(e => [e.time, e]));
}
