import { Graphics } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';

/**
 * 在琴键上方创建一条运动的发光波浪带
 */
export function createWaveLine(app, options = {}) {
    const cfg = {
        y: 0,
        startX: 0,              // 绘制起始 X
        endX: 0,                // 绘制终止 X
        amplitude: 3,
        wavelength: 300,
        speed: 1.5,
        bandHeight: 10,
        color: 0xFFD700,
        glowDistance: 40,
        outerStrength: 8,
        innerStrength: 2,
        quality: 0.4,
        ...options,
    };

    const graphics = new Graphics();
    graphics.label = 'waveLine';

    const glowFilter = new GlowFilter({
        distance: cfg.glowDistance,
        outerStrength: cfg.outerStrength,
        innerStrength: cfg.innerStrength,
        color: cfg.color,
        quality: cfg.quality,
    });
    graphics.filters = [glowFilter];

    app.stage.addChild(graphics);

    let phase = 0;

    function getWaveY(x, p) {
        const base = (x / cfg.wavelength) * Math.PI * 2;
        return (
            Math.sin(base + p) * cfg.amplitude +
            Math.sin(base * 2.3 + p * 1.7) * (cfg.amplitude * 0.35) +
            Math.sin(base * 0.6 + p * 0.4) * (cfg.amplitude * 0.25)
        );
    }

    function draw() {
        graphics.clear();

        const x0 = cfg.startX;
        const x1 = cfg.endX;
        if (x1 <= x0) return;

        const step = 2;

        // 上边缘（从左到右）
        graphics.moveTo(x0, cfg.y + getWaveY(x0, phase) - cfg.bandHeight / 2);
        for (let x = x0 + step; x <= x1; x += step) {
            graphics.lineTo(x, cfg.y + getWaveY(x, phase) - cfg.bandHeight / 2);
        }

        // 下边缘（从右到左，反向闭合）
        for (let x = x1; x >= x0; x -= step) {
            graphics.lineTo(x, cfg.y + getWaveY(x, phase) + cfg.bandHeight / 2);
        }

        graphics.closePath();
        graphics.fill({ color: cfg.color, alpha: 0.35 });

        // 中心亮线
        graphics.moveTo(x0, cfg.y + getWaveY(x0, phase));
        for (let x = x0 + step; x <= x1; x += step) {
            graphics.lineTo(x, cfg.y + getWaveY(x, phase));
        }
        graphics.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.9 });
    }

    const tickerCallback = (ticker) => {
        phase += cfg.speed * ticker.deltaTime * 0.05;
        draw();
    };
    app.ticker.add(tickerCallback);

    draw();

    return {
        graphics,
        glowFilter,
        setY(newY) { cfg.y = newY; },
        setRange(startX, endX) { cfg.startX = startX; cfg.endX = endX; },
        setColor(newColor) {
            cfg.color = newColor;
            glowFilter.color = newColor;
        },
        destroy() {
            app.ticker.remove(tickerCallback);
            graphics.destroy();
        },
    };
}
