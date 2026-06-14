import { Graphics, TilingSprite, RenderTexture, Container } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';

/**
 * 在琴键上方创建一条运动的发光波浪带
 * 性能优化：预渲染到纹理 + TilingSprite 滚动，无需每帧重绘
 */
export function createWaveLine(app, options = {}) {
    const cfg = {
        y: 0,
        startX: 0,
        endX: 0,
        amplitude: 3,
        wavelength: 300,
        speed: 1.5,
        bandHeight: 10,
        color: 0xFFD700,
        glowDistance: 15,
        outerStrength: 8,
        innerStrength: 2,
        quality: 0.4,
        ...options,
    };

    // 用一个容器包裹 TilingSprite，方便控制层级和显隐
    const container = new Container();
    container.label = 'waveLine';
    app.stage.addChild(container);

    let tilingSprite = null;
    let renderTexture = null;

    function getWaveY(x, p) {
        const base = (x / cfg.wavelength) * Math.PI * 2;
        return (
            Math.sin(base + p) * cfg.amplitude +
            Math.sin(base * 2.3 + p * 1.7) * (cfg.amplitude * 0.35) +
            Math.sin(base * 0.6 + p * 0.4) * (cfg.amplitude * 0.25)
        );
    }

    /** 预渲染波浪纹理（只在初始化 / resize / 颜色变化时调用） */
    function buildTexture() {
        const rangeWidth = cfg.endX - cfg.startX;
        if (rangeWidth <= 0) return;

        // 纹理宽度 = 键盘宽度 + 一个波长（用于无缝滚动）
        const texWidth = Math.ceil(rangeWidth + cfg.wavelength);
        const texHeight = Math.ceil(cfg.bandHeight + cfg.amplitude * 2 + cfg.glowDistance * 2 + 4);
        const centerY = texHeight / 2;

        // 离屏绘制波浪
        const gfx = new Graphics();
        const step = 3;
        const x0 = 0;
        const x1 = texWidth;

        // 上边缘
        gfx.moveTo(x0, centerY + getWaveY(x0, 0) - cfg.bandHeight / 2);
        for (let x = x0 + step; x <= x1; x += step) {
            gfx.lineTo(x, centerY + getWaveY(x, 0) - cfg.bandHeight / 2);
        }
        // 下边缘（反向闭合）
        for (let x = x1; x >= x0; x -= step) {
            gfx.lineTo(x, centerY + getWaveY(x, 0) + cfg.bandHeight / 2);
        }
        gfx.closePath();
        gfx.fill({ color: cfg.color, alpha: 0.35 });

        // 中心亮线
        gfx.moveTo(x0, centerY + getWaveY(x0, 0));
        for (let x = x0 + step; x <= x1; x += step) {
            gfx.lineTo(x, centerY + getWaveY(x, 0));
        }
        gfx.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.9 });

        // 应用发光滤镜后渲染到纹理
        const glowFilter = new GlowFilter({
            distance: cfg.glowDistance,
            outerStrength: cfg.outerStrength,
            innerStrength: cfg.innerStrength,
            color: cfg.color,
            quality: cfg.quality,
        });
        gfx.filters = [glowFilter];

        // 销毁旧纹理
        if (renderTexture) renderTexture.destroy();
        renderTexture = RenderTexture.create({ width: texWidth, height: texHeight });
        app.renderer.render({ container: gfx, target: renderTexture });
        gfx.destroy();

        // 创建/更新 TilingSprite
        if (tilingSprite) {
            tilingSprite.texture = renderTexture;
            tilingSprite.width = cfg.endX - cfg.startX;
        } else {
            tilingSprite = new TilingSprite({
                texture: renderTexture,
                width: rangeWidth,
                height: texHeight,
            });
            container.addChild(tilingSprite);
        }

        // 定位
        container.x = cfg.startX;
        container.y = cfg.y - texHeight / 2;
    }

    /** 每帧只移动 tilePosition，零重绘开销 */
    const tickerCallback = (ticker) => {
        if (!tilingSprite) return;
        tilingSprite.tilePosition.x -= cfg.speed * ticker.deltaTime * 0.5;
    };
    app.ticker.add(tickerCallback);

    // 首次构建
    buildTexture();

    return {
        graphics: container,
        setY(newY) {
            cfg.y = newY;
            if (renderTexture) container.y = cfg.y - renderTexture.height / 2;
        },
        setRange(startX, endX) {
            cfg.startX = startX;
            cfg.endX = endX;
            buildTexture();
        },
        setColor(newColor) {
            cfg.color = newColor;
            buildTexture();
        },
        destroy() {
            app.ticker.remove(tickerCallback);
            if (tilingSprite) tilingSprite.destroy();
            if (renderTexture) renderTexture.destroy();
            container.destroy();
        },
    };
}
