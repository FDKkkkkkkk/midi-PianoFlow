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

// key-renderer.js 第 64~85 行替换为：

export function addKeyGlow(key, stage) {
    // 如果已经有 glowContainer，先移除
    if (key.glowContainer) {
        removeKeyGlow(key, stage);
    }

    // 创建一个独立的发光覆盖层，不干扰 key.graphics
    const glowGraphics = new Graphics();
    
    // 用和琴键完全相同的坐标绘制一个半透明矩形作为发光底
    glowGraphics.beginFill(0xaa66ff, 0.25);
    glowGraphics.lineStyle(2, 0xaa66ff, 0.6);
    glowGraphics.drawRect(key.x, key.y, key.width, key.height);
    glowGraphics.endFill();

    const glowFilter = new GlowFilter({
        distance: 15,
        outerStrength: 5,
        innerStrength: 2,
        color: 0xaa66ff,
        quality: 0.5
    });
    glowGraphics.filters = [glowFilter];

    // 确保发光层在最上层（zIndex 最高）
    glowGraphics.zIndex = 5;
    
    stage.addChild(glowGraphics);
    key.glowContainer = glowGraphics;  // 存起来，方便后续移除
}

export function removeKeyGlow(key, stage) {
    if (key.glowContainer) {
        stage.removeChild(key.glowContainer);
        key.glowContainer.destroy({ children: true });
        key.glowContainer = null;
    }
}
