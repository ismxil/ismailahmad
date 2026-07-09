(function () {
    var TRACKS = [
        {
            title: 'Dream',
            artist: 'Alan Watts',
            src: 'assets/audio/Alan Watts - Dream.flac',
            cover: 'assets/music/dream-cover-opt.jpg',
            colors: ['#4220c8', '#ff5c9f', '#0b163f']
        },
        {
            title: 'Beautiful Error',
            artist: 'Alan Watts',
            src: 'assets/audio/Alan Watts - Beautiful Error.flac',
            cover: 'assets/music/dream-cover-opt.jpg',
            colors: ['#ff4300', '#393bfe', '#ffb347']
        },
        {
            title: 'Burgs',
            artist: 'Mt. Wolf',
            src: 'assets/audio/Mt. Wolf - Burgs.flac',
            cover: 'assets/music/thumb-next.jpg',
            colors: ['#00db2e', '#393bfe', '#66cb29']
        }
    ];

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    window.initMusicPlayer = function () {
        var audio = document.getElementById('site-audio');
        var glow = document.getElementById('music-glow');
        var glowImg = document.getElementById('music-glow-bg');
        var player = document.getElementById('music-player');
        var playBtn = document.getElementById('play-btn');
        var iconPlay = document.getElementById('icon-play');
        var iconPause = document.getElementById('icon-pause');
        var artImg = document.getElementById('music-player-art');
        var artistEl = document.getElementById('music-player-artist');
        var titleEl = document.getElementById('music-player-title');
        var thumbsEl = document.getElementById('music-player-thumbs');
        var btnPrev = document.getElementById('music-prev');
        var btnMain = document.getElementById('music-play-pause');
        var btnNext = document.getElementById('music-next');
        var mainIconPlay = document.getElementById('music-main-icon-play');
        var mainIconPause = document.getElementById('music-main-icon-pause');

        if (!audio || !glow || !player || !playBtn) return null;

        var index = 0;
        var playing = false;
        var open = false;
        var audioCtx = null;
        var analyser = null;
        var sourceNode = null;
        var freqData = null;
        var rafId = null;
        var smoothEnergy = 0;
        var prevTotal = 0;

        function trackAt(i) {
            return TRACKS[((i % TRACKS.length) + TRACKS.length) % TRACKS.length];
        }

        function renderThumbs() {
            thumbsEl.innerHTML = '';
            for (var thumbIndex = 0; thumbIndex < 3; thumbIndex++) {
                var trackIndex = index + thumbIndex - 1;
                var track = trackAt(trackIndex);
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'music-player__thumb' + (thumbIndex === 1 ? ' is-active' : '');
                btn.setAttribute('aria-label', 'Play ' + track.title);
                var img = document.createElement('img');
                img.src = track.cover;
                img.alt = '';
                btn.appendChild(img);
                btn.addEventListener('click', (function (ti) {
                    return function () { playTrack(ti, playing); };
                })(trackIndex));
                thumbsEl.appendChild(btn);
            }
        }

        function updateUI() {
            var track = trackAt(index);
            artImg.src = track.cover;
            artImg.alt = track.title + ' cover art';
            artistEl.textContent = track.artist;
            titleEl.textContent = track.title;
            renderThumbs();

            iconPlay.style.display = playing ? 'none' : 'block';
            iconPause.style.display = playing ? 'block' : 'none';
            mainIconPlay.style.display = playing ? 'none' : 'block';
            mainIconPause.style.display = playing ? 'block' : 'none';
            playBtn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
            btnMain.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        }

        function setOpen(next) {
            open = next;
            player.classList.toggle('is-open', open);
            player.setAttribute('aria-hidden', open ? 'false' : 'true');
        }

        function setGlow(next) {
            glow.classList.toggle('is-active', next);
            glow.setAttribute('aria-hidden', next ? 'false' : 'true');
            if (next) startPulse();
            else stopPulse();
        }

        function ensureAudioGraph() {
            if (audioCtx) return true;
            var Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return false;
            try {
                audioCtx = new Ctx();
                analyser = audioCtx.createAnalyser();
                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.72;
                freqData = new Uint8Array(analyser.frequencyBinCount);
                sourceNode = audioCtx.createMediaElementSource(audio);
                sourceNode.connect(analyser);
                analyser.connect(audioCtx.destination);
                return true;
            } catch (e) {
                audioCtx = null;
                return false;
            }
        }

        function readEnergy() {
            var t = performance.now() * 0.001;
            var total = 0;
            if (analyser && freqData && !audio.paused) {
                analyser.getByteFrequencyData(freqData);
                var sum = 0;
                for (var i = 0; i < freqData.length; i++) sum += freqData[i];
                total = sum / freqData.length / 255;
            } else {
                total = 0.28 + Math.sin(t * 2.4) * 0.12 + Math.sin(t * 5.3) * 0.06;
            }
            var beat = Math.max(0, total - prevTotal);
            prevTotal = lerp(prevTotal, total, 0.35);
            smoothEnergy = lerp(smoothEnergy, total + beat * 0.45, 0.14);
            return smoothEnergy;
        }

        function pulseFrame() {
            if (!glow.classList.contains('is-active') || !glowImg) {
                rafId = null;
                return;
            }
            var energy = readEnergy();
            var scale = 1 + energy * 0.14;
            var blur = 0.5 + energy * 2.5;
            var bright = 1 + energy * 0.22;
            var saturate = 1 + energy * 0.35;
            glowImg.style.transform = 'scale(' + scale.toFixed(3) + ')';
            glowImg.style.filter = 'blur(' + blur.toFixed(2) + 'px) brightness(' + bright.toFixed(3) + ') saturate(' + saturate.toFixed(3) + ')';
            rafId = requestAnimationFrame(pulseFrame);
        }

        function startPulse() {
            if (rafId) return;
            rafId = requestAnimationFrame(pulseFrame);
        }

        function stopPulse() {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
            if (glowImg) {
                glowImg.style.transform = '';
                glowImg.style.filter = '';
            }
        }

        function loadTrack(i, autoplay) {
            index = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
            var track = trackAt(index);
            var resolved = new URL(track.src, window.location.href).href;
            if (audio.src !== resolved) {
                audio.src = track.src;
                audio.load();
            }
            updateUI();
            if (autoplay) return play();
        }

        function play() {
            setOpen(true);
            setGlow(true);
            ensureAudioGraph();
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume().catch(function () { /* ignore */ });
            }
            playing = true;
            updateUI();
            return audio.play().then(function () {
                playing = true;
                updateUI();
                startPulse();
            }).catch(function () {
                playing = false;
                updateUI();
                return Promise.reject();
            });
        }

        function pause() {
            audio.pause();
            playing = false;
            updateUI();
        }

        function playTrack(i, keepPlaying) {
            var shouldPlay = keepPlaying !== false;
            loadTrack(i, false);
            if (shouldPlay) return play();
            updateUI();
            return Promise.resolve();
        }

        function toggle() {
            if (!open) {
                return play();
            }
            if (playing) {
                pause();
                return Promise.resolve();
            }
            return play();
        }

        playBtn.addEventListener('click', function () { toggle(); });
        btnMain.addEventListener('click', function () { toggle(); });
        btnPrev.addEventListener('click', function () { playTrack(index - 1, playing); });
        btnNext.addEventListener('click', function () { playTrack(index + 1, playing); });

        audio.addEventListener('ended', function () {
            playTrack(index + 1, true);
        });

        audio.addEventListener('playing', function () {
            playing = true;
            setOpen(true);
            setGlow(true);
            updateUI();
        });

        audio.addEventListener('pause', function () {
            if (!audio.ended) {
                playing = false;
                updateUI();
            }
        });

        updateUI();

        return {
            start: function () { return play(); },
            toggle: toggle,
            pause: pause,
            isPlaying: function () { return playing; }
        };
    };
})();
