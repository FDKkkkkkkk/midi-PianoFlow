import { Graphics } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { WATERFALL } from './constants.js';

/**
 * 创建瀑布流系统
 * @param {import('pixi.js').Container} waterfallLayer - 瀑布流渲染层
 * @param {Map<number, object>} pianoMap - midi → key 映射表
 * @param {object[]} keysRef - 琴键数组引用（用于获取 keyStartY）
 * @returns 瀑布流操作接口
 */
export function createWaterfall(waterfallLayer, pianoMap, keysRef) {
    const allWaterfallNotes = [];
    let activeWaterfallBars = [];
    const waterfallBarPool = [];
    const noteToBarMap = new Map();

    // 发光滤镜（所有瀑布流条共用，提高性能）
    let waterfallGlowFilter = new GlowFilter({
        distance: 12,
        outerStrength: 3,
        innerStrength: 1.5,
        color: WATERFALL.color,
        quality: 0.4,
    });

    // 运行时修改瀑布流颜色
    function setColor(numColor) {
        WATERFALL.color = numColor;
        waterfallGlowFilter.color = numColor;
    }

    // 创建或从对象池获取一个瀑布流音符条
    function getBar() {
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
    function recycleBar(bar) {
        bar.visible = false;
        bar._noteData = null;
        waterfallBarPool.push(bar);
    }

    // 初始化瀑布流音符条（只绘制一次，后续只改位置）
    function initBar(bar, noteData) {
        const key = pianoMap.get(noteData.note.midi);
        if (!key) return false;

        const barHeight = Math.max(noteData.note.duration * WATERFALL.pixelsPerSecond, 3);

        bar.clear();
        bar.beginFill(WATERFALL.color, 0.85);
        bar.drawRect(0, 0, key.width, barHeight);
        bar.endFill();

        bar._keyX = key.x;
        bar._keyWidth = key.width;
        bar._clipped = false;
        bar._lastClipOffset = 0;
        bar._noteData = noteData;
        return true;
    }

    // 更新瀑布流（每帧调用）
    function update(currentTime) {
        if (allWaterfallNotes.length === 0) return;

        const keyStartY = keysRef[0]?.y || 0;
        const visibleTopY = keyStartY - WATERFALL.lookAheadTime * WATERFALL.pixelsPerSecond;
        const nextActiveSet = new Set();

        for (const noteData of allWaterfallNotes) {
            const timeDiff = noteData.note.time - currentTime;
            const barBottomY = keyStartY - timeDiff * WATERFALL.pixelsPerSecond;
            const barHeight = Math.max(noteData.note.duration * WATERFALL.pixelsPerSecond, 3);
            const barTopY = barBottomY - barHeight;

            if (barTopY < visibleTopY) continue;
            if (timeDiff + noteData.note.duration < -0.3) continue;

            let bar = noteToBarMap.get(noteData);
            if (!bar) {
                bar = getBar();
                if (!initBar(bar, noteData)) continue;
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
                recycleBar(bar);
                if (bar._noteData) noteToBarMap.delete(bar._noteData);
            }
        }

        activeWaterfallBars = Array.from(nextActiveSet);
    }

    // 添加音符到瀑布流数据
    function addNotes(notes) {
        allWaterfallNotes.push(...notes);
    }

    // 清空瀑布流
    function clear() {
        activeWaterfallBars.forEach(bar => recycleBar(bar));
        activeWaterfallBars = [];
        waterfallBarPool.forEach(bar => { if (bar.parent) bar.parent.removeChild(bar); });
        waterfallBarPool.length = 0;
        waterfallLayer.removeChildren();
        noteToBarMap.clear();
        allWaterfallNotes.length = 0;
    }

    return { update, addNotes, clear, setColor };
}
