import { Mp3Encoder } from '@breezystack/lamejs';

/**
 * MP3 编码 Worker
 * 接收 { left, right, sampleRate, bitrate }
 * 返回 { blob }（MP3 Blob）或 { error }
 */
self.onmessage = (e) => {
    const { left, right, sampleRate, bitrate } = e.data;
    try {
        const encoder = new Mp3Encoder(2, sampleRate, bitrate);
        const mp3Data = [];
        const blockSize = 1152;
        const total = left.length;
        let reported = 0;

        for (let i = 0; i < total; i += blockSize) {
            const leftChunk = floatToInt16(left.subarray(i, i + blockSize));
            const rightChunk = floatToInt16(right.subarray(i, i + blockSize));
            const chunk = encoder.encodeBuffer(leftChunk, rightChunk);
            if (chunk.length > 0) mp3Data.push(chunk);

            // 每 ~5% 上报一次进度
            const pct = Math.floor((i / total) * 100);
            if (pct >= reported + 5) {
                reported = pct;
                self.postMessage({ type: 'progress', progress: i / total });
            }
        }
        const end = encoder.flush();
        if (end.length > 0) mp3Data.push(end);
        self.postMessage({ type: 'progress', progress: 1 });

        const blob = new Blob(mp3Data, { type: 'audio/mpeg' });
        self.postMessage({ type: 'done', blob });
    } catch (err) {
        self.postMessage({ type: 'error', error: err?.message || String(err) });
    }
};

function floatToInt16(float32) {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16;
}
