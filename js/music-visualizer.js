(function () {
    var BLOB_COUNT = 7;

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    window.initMusicVisualizer = function (audioEl, options) {
        options = options || {};
        var container = document.getElementById('music-visualizer');
        var lavaBg = container && container.querySelector('.music-lava-bg');
        var popover = document.getElementById('music-popover');
        if (!container || !lavaBg || !audioEl) return null;

        var blobs = [];
        var audioCtx = null;
        var analyser = null;
        var sourceNode = null;
        var freqData = null;
        var rafId = null;
        var active = false;
        var blobPhases = [];
        var smoothed = new Float32Array(BLOB_COUNT);
        var prevTotal = 0;
        var baseSizes = [];
        var currentColors = ['#4220c8', '#ff5c9f', '#0b163f'];
        var getColors = options.getColors || function () { return currentColors; };

        for (var i = 0; i < BLOB_COUNT; i++) {
            var blob = document.createElement('div');
            blob.className = 'music-lava-blob';
            var left = (i % 3 - 1) * 16 + 62;
            var top = 24 + (i * 11 % 44);
            blob.style.left = left + '%';
            blob.style.top = top + '%';
            lavaBg.appendChild(blob);
            blobs.push(blob);
            blobPhases.push({
                phaseX: Math.random() * Math.PI * 2,
                phaseY: Math.random() * Math.PI * 2,
                speedX: 0.45 + Math.random() * 0.55,
                speedY: 0.38 + Math.random() * 0.48
            });
        }

        function applyBlobColors(colors) {
            currentColors = colors && colors.length ? colors : currentColors;
            blobs.forEach(function (blob, i) {
                blob.style.background = currentColors[i % currentColors.length];
            });
        }

        function layoutBlobs() {
            baseSizes = blobs.map(function (_, i) {
                return 140 + (i % 3) * 36 + Math.random() * 120;
            });
            blobs.forEach(function (blob, i) {
                var size = baseSizes[i];
                blob.style.width = size + 'px';
                blob.style.height = size + 'px';
                blob.style.opacity = '0.8';
            });
        }

        function showLava() {
            applyBlobColors(getColors());
            layoutBlobs();
            container.classList.add('is-active');
            container.setAttribute('aria-hidden', 'false');
            if (popover) popover.classList.add('is-glowing');
        }

        function hideLava() {
            stopLoop();
            blobs.forEach(function (blob) {
                blob.style.opacity = '0';
                blob.style.transform = 'translate(-50%, -50%)';
            });
            container.classList.remove('is-active');
            container.setAttribute('aria-hidden', 'true');
            if (popover) popover.classList.remove('is-glowing');
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
                sourceNode = audioCtx.createMediaElementSource(audioEl);
                sourceNode.connect(analyser);
                analyser.connect(audioCtx.destination);
                return true;
            } catch (err) {
                audioCtx = null;
                analyser = null;
                sourceNode = null;
                freqData = null;
                return false;
            }
        }

        function getBandEnergy(start, end) {
            if (!freqData) return 0;
            var sum = 0;
            var count = 0;
            for (var i = start; i < end && i < freqData.length; i++) {
                sum += freqData[i];
                count++;
            }
            return count ? sum / count / 255 : 0;
        }

        function readEnergy() {
            var t = performance.now() * 0.001;
            var bass = 0;
            var lowMid = 0;
            var mid = 0;
            var high = 0;
            var total = 0;
            var beat = 0;

            if (analyser && freqData && !audioEl.paused) {
                analyser.getByteFrequencyData(freqData);
                bass = getBandEnergy(0, 10);
                lowMid = getBandEnergy(10, 28);
                mid = getBandEnergy(28, 72);
                high = getBandEnergy(72, 140);
                total = getBandEnergy(0, freqData.length);
                beat = Math.max(0, total - prevTotal);
                prevTotal = lerp(prevTotal, total, 0.4);
            } else {
                total = 0.32 + Math.sin(t * 2.2) * 0.14 + Math.sin(t * 5.1) * 0.07;
                bass = total * 1.15;
                lowMid = 0.22 + Math.sin(t * 1.6 + 1.2) * 0.1;
                mid = 0.18 + Math.sin(t * 3.3 + 0.4) * 0.08;
                high = 0.12 + Math.sin(t * 4.8 + 2.1) * 0.06;
                beat = Math.max(0, Math.sin(t * 3.8) * 0.18);
            }

            return { bass: bass, lowMid: lowMid, mid: mid, high: high, total: total, beat: beat, t: t };
        }

        function tick() {
            if (!active) {
                rafId = null;
                return;
            }

            var energy = readEnergy();
            var bands = [
                { lo: 0, hi: energy.bass },
                { lo: 0, hi: energy.lowMid },
                { lo: energy.lowMid, hi: energy.mid },
                { lo: energy.mid, hi: energy.high },
                { lo: 0, hi: energy.total },
                { lo: energy.bass, hi: energy.mid },
                { lo: energy.mid, hi: energy.total }
            ];

            blobs.forEach(function (blob, i) {
                var band = bands[i] || bands[bands.length - 1];
                var target = clamp(lerp(band.lo, band.hi, 0.7) + energy.beat * (i < 2 ? 0.42 : 0.14), 0, 1);
                smoothed[i] = lerp(smoothed[i], target, 0.16);

                var phase = blobPhases[i];
                var base = baseSizes[i] || 180;
                var pulse = 1 + smoothed[i] * (i < 3 ? 0.62 : 0.36);
                var wobbleX = Math.sin(energy.t * phase.speedX + phase.phaseX) * (18 + smoothed[i] * 34);
                var wobbleY = Math.cos(energy.t * phase.speedY + phase.phaseY) * (14 + smoothed[i] * 28);

                var size = base * pulse;
                blob.style.width = size + 'px';
                blob.style.height = (size * (0.9 + (i > 3 ? smoothed[i] * 0.2 : 0))) + 'px';
                blob.style.borderRadius = (44 + smoothed[i] * 14) + '% ' +
                    (52 + smoothed[i] * 10) + '% ' +
                    (48 + smoothed[i] * 12) + '% ' +
                    (50 + smoothed[i] * 8) + '%';
                blob.style.transform = 'translate(calc(-50% + ' + wobbleX + 'px), calc(-50% + ' + wobbleY + 'px))';
                blob.style.opacity = String(clamp(0.58 + smoothed[i] * 0.38, 0.45, 0.96));
            });

            rafId = requestAnimationFrame(tick);
        }

        function startLoop() {
            if (rafId) return;
            rafId = requestAnimationFrame(tick);
        }

        function stopLoop() {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        }

        return {
            setColors: applyBlobColors,
            onPlay: function () {
                active = true;
                ensureAudioGraph();
                if (audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume().catch(function () { /* ignore */ });
                }
                showLava();
                startLoop();
            },
            onPause: function () {
                active = false;
                hideLava();
            },
            onTrackChange: function () {
                applyBlobColors(getColors());
                if (active) layoutBlobs();
            },
            destroy: function () {
                active = false;
                hideLava();
                if (audioCtx) {
                    try { audioCtx.close(); } catch (e) { /* ignore */ }
                }
            }
        };
    };
})();
