import { Graphics, Container } from 'pixi.js';
import { Emitter } from '@momer/pixi-particle-emitter';
import { GlowFilter } from 'pixi-filters';

// ===== 对象池 & 全局状态 =====
const emitterPool = [];
const containerPool = [];
const activeEmitters = [];
let particleTexture = null;
let sharedGlowFilter = null;
let tickerRegistered = false;
let particleColor = 0xaa66ff; // 运行时可变
let particleEnabled = true;   // 运行时开关

// ===== 初始化（只执行一次） =====
function initParticleTexture(app) {
    if (particleTexture) return;
    const glow = new Graphics()
        .circle(0, 0, 0.8)
        .fill({ color: 0xffffff });
    particleTexture = app.renderer.generateTexture(glow);
    glow.destroy();
}

function initSharedFilters() {
    if (sharedGlowFilter) return;
    sharedGlowFilter = new GlowFilter({
        distance: 15,
        outerStrength: 5,
        innerStrength: 4,
        color: particleColor,
        quality: 0.5
    });
}

// ===== 统一更新（只注册一个 ticker） =====
function updateParticles(ticker) {
    const delta = ticker.deltaMS / 1000;
    const now = Date.now();
    for (let i = activeEmitters.length - 1; i >= 0; i--) {
        const item = activeEmitters[i];
        item.emitter.update(delta);
        // 发射器生命周期到了，停止发射
        if (!item.emitterStopped && now - item.startTime > item.lifetime * 1000) {
            item.emitter.emit = false;
            item.emitterStopped = true;
        }
        // 停止发射后再等粒子最大 lifetime（3秒）让粒子自然消亡
        if (item.emitterStopped && now - item.startTime > (item.lifetime + 3) * 1000) {
            destroyEmitter(item);
            activeEmitters.splice(i, 1);
        }
    }
}

function destroyEmitter({ emitter, container }) {
    emitter.emit = false;
    if (container.parent) container.parent.removeChild(container);
    container.removeChildren();
    container.filters = null;
    emitterPool.push(emitter);
    containerPool.push(container);
}

/**
 * 初始化粒子系统，返回 emitParticle 函数
 * @param {PIXI.Application} app - PixiJS 应用实例
 * @param {Map} pianoMap - midi -> key 映射表
 * @returns {(midiindex: number, duration: number) => void}
 */
export function initParticle(app, pianoMap) {
    initParticleTexture(app);
    initSharedFilters();
    app.stage.sortableChildren = true;

    if (!tickerRegistered) {
        app.ticker.add(updateParticles);
        tickerRegistered = true;
    }

    return {
        emit: emitParticle,
        setColor,
        setEnabled,
    };

    function setEnabled(on) {
        particleEnabled = on;
    }

    function setColor(numColor) {
        particleColor = numColor;
        if (sharedGlowFilter) sharedGlowFilter.color = numColor;
    }

    function emitParticle(midiindex, duration) {
        if (!particleEnabled) return;
        const key = pianoMap.get(midiindex);
        if (!key) return;

        // 从对象池获取容器
        let container = containerPool.pop() || new Container();
        container.filters = [sharedGlowFilter];
        container.x = key.x;
        container.y = key.y;
        container.zIndex = 999;
        app.stage.addChild(container);

        const config = {
            lifetime: { min: 1, max: 3 },
            frequency: 0.1,
            spawnChance: 1,
            particlesPerWave: 15,
            emitterLifetime: duration + 0.5,
            maxParticles: 500,
            pos: { x: 0, y: 0 },
            behaviors: [
                { type: 'textureSingle', config: { texture: particleTexture } },
                {
                    type: 'alpha',
                    config: {
                        alpha: {
                            list: [
                                { value: 1, time: 0 },
                                { value: 0.8, time: 0.6 },
                                { value: 0, time: 1 },
                            ],
                        },
                    },
                },
                { type: 'colorStatic', config: { color: particleColor.toString(16).padStart(6, '0') } },
                {
                    type: 'rotation',
                    config: { minStart: 250, maxStart: 290, minSpeed: 0, maxSpeed: 0, accel: 0 },
                },
                {
                    type: 'spawnShape',
                    config: { type: 'rect', data: { x: 0, y: 0, w: key.width, h: -20 } },
                },
                {
                    type: 'movePath',
                    config: {
                        path: "sin(x/10) * min(x/10, 30)",
                        speed: { list: [{ value: 120, time: 0 }, { value: 0, time: 1 }] },
                        minMult: 0.8,
                    },
                },
            ],
        };

        // 从对象池获取或创建发射器
        let emitter = emitterPool.pop();
        if (emitter) {
            emitter.parent = container;
            emitter.init(config);
        } else {
            emitter = new Emitter(container, config);
        }
        emitter.emit = true;

        activeEmitters.push({
            emitter,
            container,
            startTime: Date.now(),
            lifetime: duration + 0.5,
        });
    };
}