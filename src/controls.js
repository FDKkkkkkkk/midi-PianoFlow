/**
 * 格式化时间为 m:ss 格式
 */
export function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * 初始化音量控制
 */
export function setupVolume(volumeSlider, volumeBtn, iconSound, iconMute, volumeNode) {
    let isMuted = false;
    let savedVolume = 0.8;

    volumeSlider.addEventListener('input', () => {
        const v = parseFloat(volumeSlider.value) / 100;
        savedVolume = v;
        volumeNode.gain.value = v;
        if (v === 0) {
            iconSound.style.display = 'none';
            iconMute.style.display = 'block';
            volumeBtn.title = '取消静音';
            isMuted = true;
        } else if (isMuted) {
            iconSound.style.display = 'block';
            iconMute.style.display = 'none';
            volumeBtn.title = '静音';
            isMuted = false;
        }
    });

    volumeBtn.onclick = () => {
        isMuted = !isMuted;
        if (isMuted) {
            savedVolume = volumeNode.gain.value;
            volumeNode.gain.value = 0;
            volumeSlider.value = 0;
            iconSound.style.display = 'none';
            iconMute.style.display = 'block';
            volumeBtn.title = '取消静音';
        } else {
            volumeNode.gain.value = savedVolume || 0.8;
            volumeSlider.value = (savedVolume || 0.8) * 100;
            iconSound.style.display = 'block';
            iconMute.style.display = 'none';
            volumeBtn.title = '静音';
        }
    };
}

/**
 * 初始化全屏切换
 */
export function setupFullscreen(fullscreenBtn) {
    fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            fullscreenBtn.title = '退出全屏';
        } else {
            document.exitFullscreen();
            fullscreenBtn.title = '全屏';
        }
    };

    document.addEventListener('fullscreenchange', () => {
        fullscreenBtn.title = document.fullscreenElement ? '退出全屏' : '全屏';
    });
}
