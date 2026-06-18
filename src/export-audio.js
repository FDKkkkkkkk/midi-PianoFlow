import * as Tone from 'tone';
import { Piano } from 'd-piano';

/**
 * 将已解析的 MIDI 离线渲染为音频并编码为 MP3
 * @param {import('@tonejs/midi').Midi} midi - 已解析的 MIDI 对象
 * @param {object} options
 * @param {number} [options.reverbWet=0] - 混响湿度 0~1
 * @param {number} [options.volume=0.8] - 音量 0~1
 * @param {number} [options.bitrate=128] - MP3 比特率 kbps
 * @param {(progress:number)=>void} [onProgress] - 进度回调 0~1
 * @returns {Promise<Blob>} MP3 Blob
 */
export async function exportMidiToMp3(midi, options = {}, onProgress) {
    const { reverbWet = 0, volume = 0.8, bitrate = 128 } = options;

    // 尾部留 3 秒收尾（延音 / 混响余响）
    const tail = 3;
    const duration = midi.duration + tail;

    const buffer = await Tone.Offline(async ({ transport }) => {
        const piano = new Piano({
            velocities: 5,
            maxPolyphony: 64,
            volume: { strings: -6, keybed: -6, harmonics: -3, pedal: -6 },
        });

        // 放大链路：gain(音量) → boost(固定放大) → limiter(防削波) → destination
        const gain = new Tone.Gain(volume);
        const boost = new Tone.Gain(2.5);
        const limiter = new Tone.Limiter(-1);
        gain.connect(boost);
        boost.connect(limiter);
        limiter.toDestination();

        let reverb = null;
        if (reverbWet > 0) {
            reverb = new Tone.Reverb({ decay: 2.5, wet: reverbWet });
            piano.connect(reverb);
            reverb.connect(gain);
            try {
                await reverb.generate();
            } catch (e) {
                // 混响生成失败则降级为无混响
                reverb.disconnect();
                reverb = null;
                piano.connect(gain);
            }
        } else {
            piano.connect(gain);
        }

        await piano.load();

        // 收集音符与延音踏板事件
        const notes = [];
        const pedalEvents = [];
        midi.tracks.forEach((track) => {
            track.notes.forEach((n) => notes.push(n));
            const cc = track.controlChanges;
            const sustain = cc.sustain || cc['64'] || cc[64];
            if (sustain) {
                sustain.forEach((evt) => {
                    pedalEvents.push({ time: evt.time, down: evt.value >= 0.5 });
                });
            }
        });

        const allEvents = [];
        for (const n of notes) {
            allEvents.push({ time: n.time, type: 'noteOn', data: n });
            allEvents.push({ time: n.time + n.duration, type: 'noteOff', data: n });
        }
        for (const e of pedalEvents) {
            allEvents.push({ time: e.time, type: 'pedal', data: e });
        }

        const part = new Tone.Part((time, event) => {
            if (event.type === 'noteOn') {
                const note = event.data;
                piano.keyDown({ note: note.name, time, velocity: note.velocity });
            } else if (event.type === 'noteOff') {
                piano.keyUp({ note: event.data.name, time });
            } else if (event.type === 'pedal') {
                if (event.data.down) piano.pedalDown({ time });
                else piano.pedalUp({ time });
            }
        }, allEvents.map((e) => [e.time, e]));
        part.start(0);
        transport.start();
    }, duration);

    // MP3 编码放到 Worker 子线程，避免阻塞主线程（长曲子会导致页面卡死、无法刷新）
    return await encodeMp3InWorker(buffer, bitrate, onProgress);
}

function encodeMp3InWorker(buffer, bitrate, onProgress) {
    return new Promise((resolve, reject) => {
        const left = buffer.getChannelData(0);
        const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
        // 复制一份，因为 transfer 会剥夺原 buffer 的所有权
        const leftCopy = new Float32Array(left);
        const rightCopy = new Float32Array(right);

        const worker = new Worker(new URL('./mp3-encoder.worker.js', import.meta.url), { type: 'module' });

        worker.onmessage = (e) => {
            const msg = e.data;
            if (msg.type === 'progress') {
                if (onProgress) onProgress(msg.progress);
            } else if (msg.type === 'done') {
                worker.terminate();
                resolve(msg.blob);
            } else if (msg.type === 'error') {
                worker.terminate();
                reject(new Error(msg.error));
            }
        };
        worker.onerror = (err) => {
            worker.terminate();
            reject(err);
        };

        worker.postMessage(
            { left: leftCopy, right: rightCopy, sampleRate: buffer.sampleRate, bitrate },
            [leftCopy.buffer, rightCopy.buffer],
        );
    });
}
