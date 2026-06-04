import * as PIXI from 'pixi.js';
import { Emitter } from '@momer/pixi-particle-emitter';
const { app, pianoMap } = await import('./midi-visual.js');
import { BlurFilter } from 'pixi.js';
import { BloomFilter,AdvancedBloomFilter,GlowFilter } from 'pixi-filters';



const glow = new PIXI.Graphics()
    .circle(0, 0, 0.8 )
    .fill({ color: 0xffffff });

  const texture = app.renderer.generateTexture(glow);
  







export function emitParticle(midiindex,duration){
    let key=pianoMap.get(midiindex);
    // 把容器移动到琴键位置
    const container1=new PIXI.Container();
    const blurFilter = new BlurFilter();
    const bloomFilter = new BloomFilter({
     blur: 8,          // 模糊强度（相当于半径），默认 2
    quality: 4,       // 质量，默认 4
    resolution: 2,   // 亮度阈值
  });
    blurFilter.strength=1;
const bloom = new AdvancedBloomFilter({
    threshold: 0.2,      // 较低阈值，让紫色也能触发发光
    bloomScale: 1.8,     // 较高强度，让发光更明显
    brightness: 1.2,     // 轻微提亮整体
    blur: 10,            // 较大半径，产生柔和光晕
    quality: 4,          // 中等质量，平衡性能
});
const glowFilter = new GlowFilter({
  distance: 15,      // 发光距离（像素）
  outerStrength: 5,  // 外部发光强度
  innerStrength: 4,  // 内部发光强度
  color: 0xaa66ff,   // 发光颜色（紫色）
  quality: 0.5       // 质量
});
    container1.filters=[glowFilter];
   
  app.stage.addChild(container1);
    container1.x = key.x 
    container1.y = key.y;
    const config = {
    lifetime: {
      min: 1,
      max: 3,
    },
    frequency:0.1,
    spawnChance: 1,
    particlesPerWave: 20,
    emitterLifetime: duration+0.5,
    maxParticles: 800,
    pos: { x: 0, y: 0 },
    behaviors: [
        {
        type: 'textureSingle',
        config: { texture },
      },{
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
      {
  type: 'colorStatic',
  config: {
    color: "8000ff"  // 固定橙色
  }
},
      {
        type: 'rotation',
        config: {
          minStart: 250,
          maxStart: 290,
          minSpeed: 0,
          maxSpeed: 0,
          accel: 0,
        },
      },
      {
  type: 'spawnShape',
  config: {
    type: 'rect',
    data: {
      x: 0,  // 矩形左上角 X（相对于发射器）
      y: 0,  // 矩形左上角 Y
      w: (key.width),  // 宽度
      h: -20    // 高度
    }
  }
},{
    type: 'movePath',
    config: {
      
      path: "sin(x/10) * min(x/10, 30)",
     
      speed: {
        list: [
          { value: 120, time: 0 },      // 诞生时速度快
          { value: 0, time: 1 }         // 消亡时速度为0
        ]
      },
      // 可选：速度变化倍率范围，增加随机感
      minMult: 0.8
    }
  }
    ]
  }

const emitter=new Emitter(container1,config)
emitter.emit=true

app.ticker.add((ticker)=>{
    // let a=Math.random()*400;
    // console.log(a);
    // emitter.updateOwnerPos(a,200)

    emitter.update(ticker.deltaMS/1000)})


}

window.emitParticle=emitParticle