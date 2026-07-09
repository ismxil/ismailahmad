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
        var idleTweens = [];
        var audioCtx = null;
        var analyser = null;
        var sourceNode = null;
        var freqData = null;
        var rafId = null;
        var active = false;
        var blobPhases = [];
        var smoothed = new Float32Array(BLOB_COUNT);
        var prevEnergy = new Float32Array(BLOB_COUNT);
        var baseSizes = [];
        var currentColors = ['#4220c8', '#ff5c9f', '#0b163f'];
        var getColors = options.getColors || function () { return currentColors; };

        for (var i = 0; i < BLOB_COUNT; i++) {
            var blob = document.createElement('div');
            blob.className = 'music-lava-blob';
            var left = (i % 3 - 1) * 18 + 58;
            var top = 28 + (i * 11 % 42);
            blob.style.left = left + '%';
            blob.style.top = top + '%';
            lavaBg.appendChild(blob);
            blobs.push(blob);
            blobPhases.push({
                phaseX: Math.random() * Math.PI * 2,
                phaseY: Math.random() * Math.PI * 2,
                speedX: 0.4 + Math.random() * 0.5,
                speedY: 0.35 + Math.random() * 0.45
            });
        }

        function killIdleTweens() {
            idleTweens.forEach(function (t) {
                if (t && t.kill) t.kill();
            });
            idleTweens = [];
        }

        function applyBlobColors(colors) {
            currentColors = colors && colors.length ? colors : currentColors;
            blobs.forEach(function (blob, i) {
                blob.style.background = currentColors[i % currentColors.length];
            });
        }

        function startIdleMotion() {
            if (typeof gsap === 'undefined') return;
            killIdleTweens();
            blobs.forEach(function (blob, i) {
                var size = baseSizes[i] || 160;
                idleTweens.push(gsap.to(blob, {
                    x: (Math.random() - 0.5) * 80,
                    y: (Math.random() - 0.5) * 60,
                    duration: 2.8 + Math.random() * 2.4,
                    ease: 'sine.inOut',
                    repeat: -1,
                    yoyo: true,
                    delay: i * 0.18
                }));
                idleTweens.push(gsap.to(blob, {
                    borderRadius: (45 + Math.random() * 18) + '% ' + (52 + Math.random() * 16) + '% ' + (48 + Math.random() * 20) + '% ' + (50 + Math.random() * 14) + '%',
                    duration: 3.2 + Math.random() * 2,
                    ease: 'sine.inOut',
                    repeat: -1,
                    yoyo: true,
                    delay: i * 0.12
                }));
            });
        }

        function showLava() {
            applyBlobColors(getColors());
            baseSizes = blobs.map(function () {
                return 120 + Math.random() * 180;
            });

            if (typeof gsap !== 'undefined') {
                gsap.to(blobs, {
                    opacity: 0.82,
                    duration: 0.9,
                    ease: 'power2.out',
                    stagger: 0.06
                });
                blobs.forEach(function (blob, i) {
                    var size = baseSizes[i];
                    gsap.set(blob, { width: size, height: size });
                });
            } else {
                blobs.forEach(function (blob, i) {
                    var size = baseSizes[i];
                    blob.style.opacity = '0.82';
                    blob.style.width = size + 'px';
                    blob.style.height = size + 'px';
                });
            }

            startIdleMotion();
            container.classList.add('is-active');
            if (popover) popover.classList.add('is-glowing');
        }

        function hideLava() {
            stopReactiveLoop();
            killIdleTweens();
            if (typeof gsap !== 'undefined') {
                gsap.to(blobs, {
                    opacity: 0,
                    duration: 0.55,
                    ease: 'power2.in',
                    onComplete: function () {
                        blobs.forEach(function (blob) {
                            gsap.set(blob, { clearProps: 'all' });
                        });
                    }
                });
            } else {
                blobs.forEach(function (blob) {
                    blob.style.opacity = '0';
                });
            }
            container.classList.remove('is-active');
            if (popover) popover.classList.remove('is-glowing');
        }

        function ensureAudioGraph() {
            if (audioCtx) return;
            var Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            audioCtx = new Ctx();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.78;
            freqData = new Uint8Array(analyser.frequencyBinCount);
            sourceNode = audioCtx.createMediaElementSource(audioEl);
            sourceNode.connect(analyser);
            analyser.connect(audioCtx.destination);
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

        function reactiveLoop() {
            if (!active || !analyser) {
                rafId = null;
                return;
            }

            analyser.getByteFrequencyData(freqData);
            var bass = getBandEnergy(0, 8);
            var lowMid = getBandEnergy(8, 24);
            var mid = getBandEnergy(24, 64);
            var high = getBandEnergy(64, 128);
            var total = getBandEnergy(0, freqData.length);
            var beat = Math.max(0, total - prevEnergy[0]);
            prevEnergy[0] = lerp(prevEnergy[0], total, 0.35);

            var bands = [
                { lo: 0, hi: bass },
                { lo: 0, hi: lowMid },
                { lo: lowMid, hi: mid },
                { lo: mid, hi: high },
                { lo: 0, hi: total },
                { lo: bass, hi: mid },
                { lo: mid, hi: total }
            ];

            var t = performance.now() * 0.001;

            blobs.forEach(function (blob, i) {
                var band = bands[i] || bands[bands.length - 1];
                var energy = lerp(band.lo, band.hi, 0.65) + beat * (i < 2 ? 0.35 : 0.12);
                var target = clamp(energy, 0, 1);
                smoothed[i] = lerp(smoothed[i], target, 0.14);

                var phase = blobPhases[i];
                var base = baseSizes[i] || 160;
                var pulse = 1 + smoothed[i] * (i < 3 ? 0.55 : 0.32);
                var wobbleX = Math.sin(t * phase.speedX + phase.phaseX) * (12 + smoothed[i] * 28);
                var wobbleY = Math.cos(t * phase.speedY + phase.phaseY) * (10 + smoothed[i] * 22);
                var bleed = i > 3 ? smoothed[i] * 0.18 : 0;

                var size = base * pulse;
                blob.style.width = size + 'px';
                blob.style.height = (size * (0.92 + bleed)) + 'px';
                blob.style.transform = 'translate(calc(-50% + ' + wobbleX + 'px), calc(-50% + ' + wobbleY + 'px))';
                blob.style.opacity = String(clamp(0.55 + smoothed[i] * 0.42, 0.35, 0.95));
            });

            rafId = requestAnimationFrame(reactiveLoop);
        }

        function startReactiveLoop() {
            if (rafId) return;
            rafId = requestAnimationFrame(reactiveLoop);
        }

        function stopReactiveLoop() {
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
                    audioCtx.resume();
                }
                showLava();
                startReactiveLoop();
            },
            onPause: function () {
                active = false;
                hideLava();
            },
            onTrackChange: function () {
                applyBlobColors(getColors());
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
