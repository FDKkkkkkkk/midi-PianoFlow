
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import * as PIXI from 'pixi.js';
import PianoWav from 'tonejs-instrument-piano-wav';

// 常量定义
const CANVAS_HEIGHT=650;
const TOTAL_KEYS = 88;  // 定义总键数
const WHITE_KEY_COUNT = 52;  // 白键数量
const BLACK_KEY_COUNT = 36;  // 黑键数量


const app = new PIXI.Application({
    width: window.innerWidth,
    height: CANVAS_HEIGHT,
    backgroundColor: 0x2c2c3e,
    antialias: true,
});
app.view.style.display = 'block';
app.view.style.width = '100%';

app.view.style.height='auto';

document.body.appendChild(app.view);



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

// 判断是否为黑键
function isBlackKey(noteName) {
    return noteName.includes('#');
}

// 键盘参数
let whiteKeyWidth = 38;     // 白键宽度
const whiteKeyHeight = 200;  // 白键高度
const blackKeyWidth = 24;    // 黑键宽度
const blackKeyHeight = 120;  // 黑键高度

// 存储所有键
const keys = [];

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
    const startY = CANVAS_HEIGHT-whiteKeyHeight-20

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
    // 先画白键
    keys.forEach(key => {
        if (!key.isBlack) {
            const graphics = new PIXI.Graphics();

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

            // 音符标签
            let textColor = 0x999999;
            let fontSize = Math.min(11, key.width / 3);

            const text = new PIXI.Text(key.noteName, {
                fontSize: fontSize,
                fill: textColor,
                fontWeight: 'normal',
                fontFamily: 'Arial'
            });
            text.x = key.x + key.width / 2 - text.width / 2;
            text.y = key.y + key.height - 22;

            key.graphics = graphics;
            key.text = text;
            
            app.stage.addChild(graphics);
            app.stage.addChild(text);
        }
    });

    // 后画黑键（覆盖在白键上）
    keys.forEach(key => {
        if (key.isBlack) {
            const graphics = new PIXI.Graphics();

            // 黑键背景
            graphics.beginFill(0x1a1a1a);
            graphics.lineStyle(1, 0x444444, 1);
            graphics.drawRect(key.x, key.y, key.width, key.height);
            graphics.endFill();

            // 黑键高光
            graphics.beginFill(0x333333, 0.3);
            graphics.drawRect(key.x + 2, key.y + 2, key.width - 4, 8);
            graphics.endFill();

            // 音符标签（白色小字）
            let fontSize = Math.min(9, key.width / 2.5);
            const text = new PIXI.Text(key.noteName, {
                fontSize: fontSize,
                fill: 0xcccccc,
                fontWeight: 'bold',
                fontFamily: 'Arial'
            });
            text.x = key.x + key.width / 2 - text.width / 2;
            text.y = key.y + key.height - 18;

            key.graphics = graphics;
            key.text = text;

            app.stage.addChild(graphics);
            app.stage.addChild(text);
        }
    });
}

// 添加鼠标悬停效果
function addHoverEffects() {
    app.stage.eventMode='static';
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
            if (key.isBlack) {
                key.graphics.clear();
                key.graphics.beginFill(0x1a1a1a);
                key.graphics.lineStyle(1, 0x444444, 1);
                key.graphics.drawRect(key.x, key.y, key.width, key.height);
                key.graphics.endFill();
                key.graphics.beginFill(0x333333, 0.3);
                key.graphics.drawRect(key.x + 2, key.y + 2, key.width - 4, 8);
                key.graphics.endFill();
            } else {
                key.graphics.clear();
                key.graphics.beginFill(0xffffff);
                key.graphics.lineStyle(1, 0x888888, 1);
                key.graphics.drawRect(key.x, key.y, key.width, key.height);
                key.graphics.endFill();
                key.graphics.lineStyle(0);
                key.graphics.beginFill(0x000000, 0.05);
                key.graphics.drawRect(key.x + 2, key.y + 2, key.width, key.height);
                key.graphics.endFill();
            }
        });

        // 高亮当前悬停的琴键
        if (hoveredKey) {
            if (hoveredKey.isBlack) {
                hoveredKey.graphics.clear();
                hoveredKey.graphics.beginFill(0x3a3a5a);
                hoveredKey.graphics.lineStyle(1, 0x666666, 1);
                hoveredKey.graphics.drawRect(hoveredKey.x, hoveredKey.y, hoveredKey.width, hoveredKey.height);
                hoveredKey.graphics.endFill();
                hoveredKey.graphics.beginFill(0x555577, 0.3);
                hoveredKey.graphics.drawRect(hoveredKey.x + 2, hoveredKey.y + 2, hoveredKey.width - 4, 8);
                hoveredKey.graphics.endFill();
            } else {
                hoveredKey.graphics.clear();
                hoveredKey.graphics.beginFill(0xe8e8ff);
                hoveredKey.graphics.lineStyle(1, 0x9999cc, 1);
                hoveredKey.graphics.drawRect(hoveredKey.x, hoveredKey.y, hoveredKey.width, hoveredKey.height);
                hoveredKey.graphics.endFill();
                hoveredKey.graphics.lineStyle(0);
                hoveredKey.graphics.beginFill(0x000000, 0.05);
                hoveredKey.graphics.drawRect(hoveredKey.x + 2, hoveredKey.y + 2, hoveredKey.width, hoveredKey.height);
                hoveredKey.graphics.endFill();
            }
        }
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
                    key.graphics.clear();
                    key.graphics.beginFill(0x5a5a8a);
                    key.graphics.lineStyle(1, 0x8888aa, 1);
                    key.graphics.drawRect(key.x, key.y, key.width, key.height);
                    key.graphics.endFill();
                } else {
                    key.graphics.clear();
                    key.graphics.beginFill(0xccccff);
                    key.graphics.lineStyle(1, 0xaaaaff, 1);
                    key.graphics.drawRect(key.x, key.y, key.width, key.height);
                    key.graphics.endFill();
                }

                // 延迟恢复
                setTimeout(() => {
                    if (key.isBlack) {
                        key.graphics.clear();
                        key.graphics.beginFill(0x1a1a1a);
                        key.graphics.lineStyle(1, 0x444444, 1);
                        key.graphics.drawRect(key.x, key.y, key.width, key.height);
                        key.graphics.endFill();
                        key.graphics.beginFill(0x333333, 0.3);
                        key.graphics.drawRect(key.x + 2, key.y + 2, key.width - 4, 8);
                        key.graphics.endFill();
                    } else {
                        key.graphics.clear();
                        key.graphics.beginFill(0xffffff);
                        key.graphics.lineStyle(1, 0x888888, 1);
                        key.graphics.drawRect(key.x, key.y, key.width, key.height);
                        key.graphics.endFill();
                        key.graphics.lineStyle(0);
                        key.graphics.beginFill(0x000000, 0.05);
                        key.graphics.drawRect(key.x + 2, key.y + 2, key.width, key.height);
                        key.graphics.endFill();
                    }
                }, 150);

                break;
            }
        }
    });
}
// 初始化
function init() {
    calculateKeyPositions();
    drawKeyboard();
    addHoverEffects();
    addClickEffects();

    // 监听窗口大小变化
    // window.addEventListener('resize', handleResize);

    console.log('钢琴键盘初始化完成');
    console.log(keys)
}

// 启动
init();
let timeouts=[];
const pianoMap = new Map();
let cMajorBasis = 21;
for (let i = 0; i < keys.length; i++) {
    pianoMap.set(cMajorBasis, keys[i]);
    cMajorBasis++;
}

function lightKey(index, during) {
    const key = pianoMap.get(index);
    if (key.isBlack) {
        key.graphics.clear();
        key.graphics.beginFill(0x5a5a8a);
        key.graphics.lineStyle(1, 0x8888aa, 1);
        key.graphics.drawRect(key.x, key.y, key.width, key.height);
        key.graphics.endFill();
    } else {
        key.graphics.clear();
        key.graphics.beginFill(0xccccff);
        key.graphics.lineStyle(1, 0xaaaaff, 1);
        key.graphics.drawRect(key.x, key.y, key.width, key.height);
        key.graphics.endFill();
    }
    // 延迟恢复
    let thisTimeout=setTimeout(() => {
        if (key.isBlack) {
            key.graphics.clear();
            key.graphics.beginFill(0x1a1a1a);
            key.graphics.lineStyle(1, 0x444444, 1);
            key.graphics.drawRect(key.x, key.y, key.width, key.height);
            key.graphics.endFill();
            key.graphics.beginFill(0x333333, 0.3);
            key.graphics.drawRect(key.x + 2, key.y + 2, key.width - 4, 8);
            key.graphics.endFill();
        } else {
            key.graphics.clear();
            key.graphics.beginFill(0xffffff);
            key.graphics.lineStyle(1, 0x888888, 1);
            key.graphics.drawRect(key.x, key.y, key.width, key.height);
            key.graphics.endFill();
            key.graphics.lineStyle(0);
            key.graphics.beginFill(0x000000, 0.05);
            key.graphics.drawRect(key.x + 2, key.y + 2, key.width, key.height);
            key.graphics.endFill();
        }
    }, during * 1000);
    timeouts.push(thisTimeout)
}
let midi = null;
let notes = [];
let currentpart = null
document.getElementById('midi').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    midi = new Midi(buffer);
    midiInit();
})
// 1. 创建合成器（多音合成器，支持和弦）
const synth = new Tone.PolySynth(Tone.Synth, {
    maxPolyphony: 32,  // 最大同时发声数
}).toDestination();

const piano = new PianoWav({
    onload: () => {
        console.log('钢琴加载完成');
        piano.toDestination();
        piano.volume.value=-10;     
        piano.triggerAttackRelease("C4", "2n");
    }
});
export function play() {
    currentpart.start();
    Tone.Transport.start();
    console.log('kaishi')
}
document.getElementById('playmidi').onclick = () => { play() };

function midiInit() {
    notes=[];
    if (currentpart) {
        currentpart.dispose();
        Tone.Transport.stop();
        Tone.Transport.cancel();
        currentpart = null;
    }
    if(timeouts.length!=0){
        timeouts.forEach(clearTimeout)
    }
    midi.tracks.forEach(
        track => {
            track.notes.forEach(note => {
                notes.push(note);
            })
        }
    )
    console.log(notes)
    currentpart = new Tone.Part((time, note) => {
        // synth.triggerAttackRelease(
        //     note.name,           // 音名 'C4'
        //     note.duration,       // 持续时间（秒）
        //     time,                // 开始时间（Transport 自动传入）
        //     note.velocity        // 力度 0-1
        // )
        piano.triggerAttackRelease(
            note.name,           // 音名 'C4'
            note.duration,       // 持续时间（秒）
            time,                // 开始时间（Transport 自动传入）
            note.velocity        // 力度 0-1
        )
        lightKey(note.midi, note.duration)
    }, notes.map(n => [n.time, n]))
}