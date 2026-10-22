// ==UserScript==
// @name         ELLLO 循环播放
// @namespace    https://e.191929.xyz/
// @version      1.5.0
// @description  为 ELLLO 课程中的音频和视频添加播放、暂停、循环和自动下一课控制。
// @match        https://elllo.org/*
// @match        https://www.elllo.org/*
// @downloadURL  https://e.191929.xyz/elllo/elllo-loop.user.js
// @updateURL    https://e.191929.xyz/elllo/elllo-loop.user.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const storageKey = 'shiguang-elllo-loop-enabled';
  const autoNextKey = 'shiguang-elllo-auto-next-enabled';
  const autoPlayPendingKey = 'shiguang-elllo-auto-play-pending';
  let enabled = localStorage.getItem(storageKey) !== 'false';
  let autoNext = localStorage.getItem(autoNextKey) === 'true';
  if (autoNext) enabled = false;
  let playback = '尚未播放';
  let activeMedia = null;
  const boundMedia = new WeakSet();

  const bindMedia = media => {
    if (boundMedia.has(media)) return;
    boundMedia.add(media);
    media.addEventListener('play', () => {
      activeMedia = media;
      playback = '正在播放';
      localStorage.removeItem(autoPlayPendingKey);
      renderControls();
    });
    media.addEventListener('pause', () => {
      if (activeMedia !== media) return;
      playback = media.ended ? '播放完毕' : '已暂停';
      renderControls();
    });
    media.addEventListener('ended', () => {
      if (activeMedia !== media) return;
      playback = autoNext ? '正在切换下一课' : enabled ? '正在循环' : '播放完毕';
      renderControls();
      if (autoNext) {
        localStorage.setItem(autoPlayPendingKey, 'true');
        window.top.postMessage({source: 'shiguang-elllo', action: 'next'}, '*');
      }
    });
    media.addEventListener('canplay', tryAutoPlay);
    if (!media.paused && !media.ended) {
      activeMedia = media;
      playback = '正在播放';
    }
  };

  const applyLoop = root => {
    root.querySelectorAll('audio, video').forEach(media => {
      media.loop = enabled;
      bindMedia(media);
    });
  };

  const panel = document.createElement('div');
  Object.assign(panel.style, {
    position: 'fixed',
    top: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    maxWidth: 'calc(100vw - 28px)',
    padding: '9px',
    border: '1px solid #c8c8c8',
    borderRadius: '14px',
    background: '#fff',
    color: '#151914',
    font: '700 14px system-ui, sans-serif',
    boxShadow: '0 4px 18px rgba(0,0,0,.18)'
  });

  const status = document.createElement('span');
  status.style.padding = '0 4px';
  const playButton = document.createElement('button');
  const loopButton = document.createElement('button');
  const nextButton = document.createElement('button');
  [playButton, loopButton, nextButton].forEach(control => {
    control.type = 'button';
    Object.assign(control.style, {
      padding: '8px 12px',
      border: '1px solid #aaa',
      borderRadius: '999px',
      color: '#151914',
      font: '700 13px system-ui, sans-serif',
      cursor: 'pointer'
    });
  });
  panel.append(status, playButton, loopButton, nextButton);

  const currentMedia = () => activeMedia || document.querySelector('audio, video');

  async function tryAutoPlay() {
    if (!autoNext || localStorage.getItem(autoPlayPendingKey) !== 'true') return;
    const media = currentMedia();
    if (!media) return;
    activeMedia = media;
    try {
      await media.play();
      localStorage.removeItem(autoPlayPendingKey);
    } catch {
      playback = '请点击播放继续';
      renderControls();
    }
  }

  const renderControls = () => {
    const media = currentMedia();
    const playing = Boolean(media && !media.paused && !media.ended);
    status.textContent = media ? (playing ? '▶ 正在播放' : `⏸ ${playback}`) : '未找到播放器';
    playButton.textContent = playing ? '暂停' : '播放';
    playButton.disabled = !media;
    playButton.style.background = playing ? '#ffe6a7' : '#c9f36b';
    playButton.style.opacity = media ? '1' : '.5';
    loopButton.textContent = `循环已${enabled ? '开启' : '关闭'}`;
    loopButton.setAttribute('aria-pressed', String(enabled));
    loopButton.style.background = enabled ? '#c9f36b' : '#e5e5e5';
    loopButton.style.borderColor = enabled ? '#7ea83b' : '#aaa';
    nextButton.textContent = `自动下一课已${autoNext ? '开启' : '关闭'}`;
    nextButton.setAttribute('aria-pressed', String(autoNext));
    nextButton.style.background = autoNext ? '#c9f36b' : '#e5e5e5';
    nextButton.style.borderColor = autoNext ? '#7ea83b' : '#aaa';
  };

  playButton.addEventListener('click', async () => {
    const media = currentMedia();
    if (!media) return;
    activeMedia = media;
    if (media.paused || media.ended) {
      try {
        await media.play();
        localStorage.removeItem(autoPlayPendingKey);
      } catch {
        playback = '无法播放';
        renderControls();
      }
    } else {
      media.pause();
    }
  });

  loopButton.addEventListener('click', () => {
    enabled = !enabled;
    if (enabled) autoNext = false;
    localStorage.setItem(storageKey, String(enabled));
    localStorage.setItem(autoNextKey, String(autoNext));
    applyLoop(document);
    renderControls();
  });

  nextButton.addEventListener('click', () => {
    autoNext = !autoNext;
    if (autoNext) enabled = false;
    localStorage.setItem(autoNextKey, String(autoNext));
    localStorage.setItem(storageKey, String(enabled));
    applyLoop(document);
    renderControls();
  });

  applyLoop(document);
  renderControls();
  document.body.append(panel);
  window.setTimeout(tryAutoPlay, 500);

  new MutationObserver(mutations => {
    const mediaAdded = mutations.some(mutation => [...mutation.addedNodes].some(node =>
      node.nodeType === 1 && (node.matches('audio, video') || node.querySelector('audio, video'))
    ));
    if (!mediaAdded) return;
    applyLoop(document);
    renderControls();
    tryAutoPlay();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
