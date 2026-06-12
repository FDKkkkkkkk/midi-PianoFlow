import { Text, Graphics, Container } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';


export function drawWhiteKeyName(key) {
    // 音符标签
    let textColor = 0x999999;
    let fontSize = Math.min(11, key.width / 3);

    const text = new Text(key.noteName, {
        fontSize: fontSize,
        fill: textColor,
        fontWeight: 'normal',
        fontFamily: 'Arial'
    });
    text.x = key.x + key.width / 2 - text.width / 2;
    text.y = key.y + key.height - 22;
    key.text = text;
    app.stage.addChild(text);
}


export function drawBlackKeyName(key) {
    // 音符标签（白色小字）
    let fontSize = Math.min(9, key.width / 2.5);
    const text = new Text(key.noteName, {
        fontSize: fontSize,
        fill: 0xcccccc,
        fontWeight: 'bold',
        fontFamily: 'Arial'
    });
    text.x = key.x + key.width / 2 - text.width / 2;
    text.y = key.y + key.height - 18;


    key.text = text;
    app.stage.addChild(text);
}

/**
 * 画琴键的阴影
 * @param {Key} key 
 */
export function drawKeyShadow(key) {
    // 2. 画内阴影 - 顶部
    key.graphics.beginFill(0x000000, 0.3);
    key.graphics.drawRect(key.x, key.y, key.width, 4);
    key.graphics.endFill();

    // 3. 画内阴影 - 左侧
    key.graphics.beginFill(0x000000, 0.3);
    key.graphics.drawRect(key.x, key.y, 3, key.height);
    key.graphics.endFill();

    // 4. 画内阴影 - 右侧
    key.graphics.beginFill(0x000000, 0.3);
    key.graphics.drawRect(key.x + key.width - 3, key.y, 3, key.height);
    key.graphics.endFill();

    // 5. 画内阴影 - 底部
    key.graphics.beginFill(0x000000, 0.3);
    key.graphics.drawRect(key.x, key.y + key.height - 4, key.width, 4);
    key.graphics.endFill();

}

export function addKeyGlow(key, glowLayer, color = 0xaa66ff) {
    // 如果已经有发光层，先移除
    if (key.glowContainer) {
        removeKeyGlow(key, glowLayer);
    }

    // 创建一个独立的发光覆盖层，不干扰 key.graphics
    const glowGraphics = new Graphics();
    
    // 用和琴键完全相同的坐标绘制一个半透明矩形作为发光底
    glowGraphics.beginFill(color, 0.25);
    glowGraphics.lineStyle(2, color, 0.6);
    glowGraphics.drawRect(key.x, key.y, key.width, key.height);
    glowGraphics.endFill();

    const glowFilter = new GlowFilter({
        distance: 15,
        outerStrength: 5,
        innerStrength: 2,
        color: color,
        quality: 0.5
    });
    glowGraphics.filters = [glowFilter];
    
    glowLayer.addChild(glowGraphics);
    key.glowContainer = glowGraphics;  // 存起来，方便后续移除
}

export function removeKeyGlow(key, glowLayer) {
    if (key.glowContainer) {
        glowLayer.removeChild(key.glowContainer);
        key.glowContainer.destroy({ children: true });
        key.glowContainer = null;
    }
}

// 绘制默认黑键样式
export function drawDefaultBlackKey(key) {
    key.graphics.clear();
    key.graphics.beginFill(0x1a1a1a);
    key.graphics.lineStyle(1, 0x444444, 1);
    key.graphics.drawRect(key.x, key.y, key.width, key.height);
    key.graphics.endFill();
    key.graphics.beginFill(0x333333, 0.3);
    key.graphics.drawRect(key.x + 2, key.y + key.height - 10, key.width - 4, 8);
    key.graphics.endFill();
}

// 绘制默认白键样式
export function drawDefaultWhiteKey(key) {
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

// 绘制高亮黑键样式
export function drawHighlightBlackKey(key, color) {
    key.graphics.clear();
    key.graphics.beginFill(color);
    key.graphics.lineStyle(1, 0x666666, 1);
    key.graphics.drawRect(key.x, key.y, key.width, key.height);
    key.graphics.endFill();
    key.graphics.beginFill(0x555577, 0.3);
    key.graphics.drawRect(key.x + 2, key.y + key.height - 10, key.width - 4, 8);
    key.graphics.endFill();
}

// 绘制高亮白键样式
export function drawHighlightWhiteKey(key, color) {
    key.graphics.clear();
    key.graphics.beginFill(color);
    key.graphics.lineStyle(1, 0x9999cc, 1);
    key.graphics.drawRect(key.x, key.y, key.width, key.height);
    key.graphics.endFill();
    key.graphics.lineStyle(0);
    key.graphics.beginFill(0x000000, 0.05);
    key.graphics.drawRect(key.x + 2, key.y + 2, key.width, key.height);
    key.graphics.endFill();
    
}

// 判断是否为黑键
export function isBlackKey(noteName) {
    return noteName.includes('#');
}

// ============ 键盘整体绘制 ============

/**
 * 绘制整个键盘（白键层 + 黑键层）
 */
export function drawKeyboard(keys, whiteLayer, blackLayer) {
    // 先画白键
    keys.forEach(key => {
        if (!key.isBlack) {
            const graphics = new Graphics();
            graphics.beginFill(0xffffff);
            graphics.lineStyle(1, 0x888888, 1);
            graphics.drawRect(key.x, key.y, key.width, key.height);
            graphics.endFill();
            graphics.lineStyle(0);
            graphics.beginFill(0x000000, 0.05);
            graphics.drawRect(key.x + 2, key.y + 2, key.width, key.height);
            graphics.endFill();
            key.graphics = graphics;
            whiteLayer.addChild(graphics);
        }
    });
    // 后画黑键
    keys.forEach(key => {
        if (key.isBlack) {
            const graphics = new Graphics();
            graphics.beginFill(0x1a1a1a);
            graphics.lineStyle(1, 0x444444, 1);
            graphics.drawRect(key.x, key.y, key.width, key.height);
            graphics.endFill();
            graphics.beginFill(0x333333, 0.3);
            graphics.drawRect(key.x + 2, key.y + key.height - 10, key.width - 4, 8);
            graphics.endFill();
            key.graphics = graphics;
            blackLayer.addChild(graphics);
        }
    });
}

/**
 * 添加鼠标悬停高亮效果
 */
export function addHoverEffects(app, keys, highlightColor) {
    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;

    app.stage.on('mousemove', (event) => {
        const mousePos = event.data.global;
        let hoveredKey = null;
        for (let key of keys) {
            if (mousePos.x >= key.x && mousePos.x <= key.x + key.width &&
                mousePos.y >= key.y && mousePos.y <= key.y + key.height) {
                hoveredKey = key;
                break;
            }
        }
        keys.forEach(key => {
            if (key.glowContainer) return;
            if (key.isBlack) drawDefaultBlackKey(key);
            else drawDefaultWhiteKey(key);
        });
        if (hoveredKey) {
            if (hoveredKey.isBlack) {
                drawHighlightBlackKey(hoveredKey, highlightColor);
                drawKeyShadow(hoveredKey);
            } else {
                drawHighlightWhiteKey(hoveredKey, highlightColor);
                drawKeyShadow(hoveredKey);
            }
        }
    });

    app.stage.on('mouseout', () => {
        keys.forEach(key => {
            if (key.glowContainer) return;
            if (key.isBlack) drawDefaultBlackKey(key);
            else drawDefaultWhiteKey(key);
        });
    });
}

/**
 * 添加鼠标点击变色效果
 */
export function addClickEffects(app, keys, highlightColor) {
    app.stage.on('mousedown', (event) => {
        const mousePos = event.data.global;
        for (let key of keys) {
            if (mousePos.x >= key.x && mousePos.x <= key.x + key.width &&
                mousePos.y >= key.y && mousePos.y <= key.y + key.height) {
                if (key.isBlack) drawHighlightBlackKey(key, highlightColor);
                else drawHighlightWhiteKey(key, highlightColor);
                setTimeout(() => {
                    if (key.isBlack) drawDefaultBlackKey(key);
                    else drawDefaultWhiteKey(key);
                }, 150);
                break;
            }
        }
    });
}