(function () {
    var TRACKS = [
        {
            title: 'Dream',
            artist: 'Alan Watts',
            src: 'assets/audio/dream/Alan Watts - Dream.flac',
            cover: 'assets/audio/dream/dream cover.jpg'
        },
        {
            title: 'Beautiful Error',
            artist: 'Alan Watts',
            src: 'assets/audio/beautiful-error/Alan Watts - Beautiful Error.flac',
            cover: 'assets/audio/beautiful-error/beautiful error cover.jpg'
        },
        {
            title: 'Burgs',
            artist: 'Mt. Wolf',
            src: 'assets/audio/burgs/Mt. Wolf - Burgs.flac',
            cover: 'assets/audio/burgs/burgs cover.jpg'
        }
    ];

    function encodeAudioPath(path) {
        return path.split('/').map(encodeURIComponent).join('/');
    }

    function isTouch() {
        return !window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }

    var STORAGE_KEY = 'siteMusicState';

    function readSavedState() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    window.initMusicPlayer = function () {
        var audio     = document.getElementById('site-audio');
        var stack     = document.getElementById('music-stack');
        var player    = document.getElementById('music-player');
        var playBtn   = document.getElementById('play-btn');
        var musicZone = document.getElementById('bottom-bar-music');
        var artImg        = document.getElementById('music-player-art');
        var artistEl      = document.getElementById('music-player-artist');
        var titleEl       = document.getElementById('music-player-title');
        var thumbsEl      = document.getElementById('music-player-thumbs');
        var btnPrev       = document.getElementById('music-prev');
        var btnMain       = document.getElementById('music-play-pause');
        var btnNext       = document.getElementById('music-next');
        var mainIconPlay  = document.getElementById('music-main-icon-play');
        var mainIconPause = document.getElementById('music-main-icon-pause');

        if (!audio || !player || !playBtn) return null;

        audio.preload = 'metadata';

        var index     = 0;
        var playing   = false;
        var panelOpen = false;
        var hideTimer = null;
        var audioCtx  = null;

        // ── AudioContext unlock (browser autoplay policy) ────────────
        function ensureAudioContext() {
            if (!audioCtx) {
                var Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) audioCtx = new Ctx();
            }
            if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        }

        // ── Helpers ──────────────────────────────────────────────────
        function trackAt(i) {
            return TRACKS[((i % TRACKS.length) + TRACKS.length) % TRACKS.length];
        }
        function trackUrl(track) {
            return new URL(encodeAudioPath(track.src), window.location.href).href;
        }
        function currentAudioSrc() {
            var raw = audio.currentSrc || audio.src || '';
            if (!raw) return '';
            try { return new URL(raw).href; } catch (e) { return raw; }
        }

        // ── Thumbnails ───────────────────────────────────────────────
        function renderThumbs() {
            if (!thumbsEl) return;
            thumbsEl.innerHTML = '';
            for (var t = 0; t < 3; t++) {
                var ti    = index + t - 1;
                var track = trackAt(ti);
                var btn   = document.createElement('button');
                btn.type  = 'button';
                btn.className = 'music-player__thumb' + (t === 1 ? ' is-active' : '');
                btn.setAttribute('aria-label', 'Play ' + track.title);
                var img = document.createElement('img');
                img.src = encodeAudioPath(track.cover);
                img.alt = '';
                btn.appendChild(img);
                btn.addEventListener('click', (function (idx) {
                    return function () { playTrack(idx); };
                })(ti));
                thumbsEl.appendChild(btn);
            }
        }

        // ── UI sync ───────────────────────────────────────────────────
        function updateUI() {
            var track = trackAt(index);
            if (artImg)   { artImg.src = encodeAudioPath(track.cover); artImg.alt = track.title + ' cover art'; }
            if (artistEl) artistEl.textContent = track.artist;
            if (titleEl)  titleEl.textContent  = track.title;
            renderThumbs();

            // Soundbar icon pulsates when playing
            playBtn.classList.toggle('is-playing', playing);

            // Inner pause/play icon inside the player card
            if (mainIconPlay)  mainIconPlay.style.display  = playing ? 'none'  : 'block';
            if (mainIconPause) mainIconPause.style.display = playing ? 'block' : 'none';
            if (btnMain) btnMain.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        }

        // ── Panel show / hide (UI only — never touches audio) ────────
        function showPanel() {
            clearTimeout(hideTimer);
            panelOpen = true;
            if (stack) { stack.classList.add('is-open'); stack.setAttribute('aria-hidden', 'false'); }
            player.classList.add('is-open');
            player.setAttribute('aria-hidden', 'false');
        }

        function hidePanel() {
            panelOpen = false;
            if (stack) { stack.classList.remove('is-open'); stack.setAttribute('aria-hidden', 'true'); }
            player.classList.remove('is-open');
            player.setAttribute('aria-hidden', 'true');
        }

        // 200 ms grace period lets the mouse travel from the button
        // up into the player card without the panel blinking closed.
        function schedulePanelHide() {
            clearTimeout(hideTimer);
            hideTimer = setTimeout(hidePanel, 200);
        }

        // ── Cross-page persistence (sessionStorage) ────────────────────
        // Lets playback survive normal in-site navigation (not a hard
        // refresh's worth of guarantee, but sessionStorage does persist
        // across reloads too within the same tab).
        function saveState() {
            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                    trackIndex: index,
                    currentTime: audio.currentTime || 0,
                    playing: playing
                }));
            } catch (e) {}
        }

        // ── Track loading ────────────────────────────────────────────
        function loadTrack(i) {
            index = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
            var resolved = trackUrl(trackAt(index));
            if (currentAudioSrc() !== resolved) { audio.src = resolved; audio.load(); }
            updateUI();
        }

        // ── Playback (start / pause) ──────────────────────────────────
        function startPlaying() {
            if (!audio.src) loadTrack(index);
            ensureAudioContext();
            return audio.play().then(function () {
                playing = true;
                updateUI();
                saveState();
            }).catch(function (err) {
                console.warn('[MusicPlayer] Playback failed:', err);
                playing = false;
                updateUI();
                saveState();
            });
        }

        function pausePlaying() {
            audio.pause();
            playing = false;
            updateUI();
            saveState();
        }

        function playTrack(i) {
            loadTrack(i);
            return startPlaying();
        }

        // ── Soundbar button — hover + click ───────────────────────────
        //
        // HOVER (desktop): reveals the player panel.
        // CLICK: toggles playback — starts if paused, pauses if playing.
        //
        playBtn.addEventListener('mouseenter', function () {
            if (!isTouch()) {
                clearTimeout(hideTimer);
                showPanel();
            }
        });

        playBtn.addEventListener('mouseleave', function () {
            if (!isTouch()) schedulePanelHide();
        });

        playBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            ensureAudioContext();

            if (isTouch() && !panelOpen) showPanel();

            if (playing) {
                pausePlaying();
            } else {
                startPlaying();
            }
        });

        // ── Player panel hover (keeps panel visible during mouse travel) ─
        if (stack) {
            stack.addEventListener('mouseenter', function () {
                if (!isTouch()) clearTimeout(hideTimer);
            });
            stack.addEventListener('mouseleave', function () {
                if (!isTouch()) schedulePanelHide();
            });
        }

        // ── Play/pause control inside the player card ─────────────────
        if (btnMain) {
            btnMain.addEventListener('click', function (e) {
                e.stopPropagation();
                if (playing) {
                    pausePlaying();
                } else {
                    ensureAudioContext();
                    startPlaying();
                }
            });
        }

        // ── Prev / Next (always keeps playing if was playing) ─────────
        if (btnPrev) {
            btnPrev.addEventListener('click', function (e) {
                e.stopPropagation();
                loadTrack(index - 1);
                startPlaying();
            });
        }
        if (btnNext) {
            btnNext.addEventListener('click', function (e) {
                e.stopPropagation();
                loadTrack(index + 1);
                startPlaying();
            });
        }

        // ── Audio element events ──────────────────────────────────────
        // The <audio> element can survive a soft page navigation (see
        // spa-nav.js), which means this whole init function — and these
        // listeners — can run again against the *same* element. Remove
        // whatever this element's last init attached before adding fresh
        // ones, otherwise events like 'ended' fire once per past page
        // visited and skip multiple tracks at once.
        if (audio._musicPlayerListeners) {
            Object.keys(audio._musicPlayerListeners).forEach(function (type) {
                audio.removeEventListener(type, audio._musicPlayerListeners[type]);
            });
        }
        var listeners = {
            ended:   function () { playTrack(index + 1); },
            playing: function () { playing = true;  updateUI(); },
            pause:   function () { if (!audio.ended) { playing = false; updateUI(); } },
            error:   function () {
                var err = audio.error;
                console.warn('[MusicPlayer] Audio error:', err ? 'code ' + err.code + ' — ' + err.message : 'unknown');
                playing = false; updateUI();
            }
        };
        Object.keys(listeners).forEach(function (type) {
            audio.addEventListener(type, listeners[type]);
        });
        audio._musicPlayerListeners = listeners;

        // ── Mobile: tap outside → hide panel (music keeps playing) ───
        document.addEventListener('click', function (e) {
            if (!isTouch() || !panelOpen) return;
            if (musicZone && musicZone.contains(e.target)) return;
            hidePanel();
        });

        // ── Persist state so navigating to another page keeps the music
        //    going (picks up the same track/position on the next page).
        //    initMusicPlayer() can run again on the same window after a
        //    soft navigation, so tear down the previous page's hooks
        //    first instead of stacking duplicate timers/listeners.
        var prev = window._musicPlayerPersistence;
        if (prev) {
            window.removeEventListener('pagehide', prev.save);
            window.removeEventListener('beforeunload', prev.save);
            clearInterval(prev.interval);
        }
        window.addEventListener('pagehide', saveState);
        window.addEventListener('beforeunload', saveState);
        window._musicPlayerPersistence = {
            save: saveState,
            interval: setInterval(function () { if (playing) saveState(); }, 3000)
        };

        // ── Init ──────────────────────────────────────────────────────
        // A soft (SPA-style) navigation carries the *same* <audio> element
        // over from the previous page — it already has a src and may
        // already be playing. Detect that case via currentSrc so we don't
        // reset or re-seek a track that's already live.
        var isPersistedAudio = !!audio.currentSrc;
        var saved = readSavedState();

        if (isPersistedAudio) {
            var matchedIndex = -1;
            for (var t = 0; t < TRACKS.length; t++) {
                if (trackUrl(TRACKS[t]) === currentAudioSrc()) { matchedIndex = t; break; }
            }
            index = matchedIndex !== -1 ? matchedIndex : 0;
            playing = !audio.paused;
            updateUI();
        } else {
            loadTrack(saved ? saved.trackIndex : 0);
            updateUI();

            if (saved) {
                (function () {
                    var resumeTime = saved.currentTime || 0;
                    var shouldResume = !!saved.playing;
                    function applyResume() {
                        audio.removeEventListener('loadedmetadata', applyResume);
                        if (resumeTime > 0) {
                            try { audio.currentTime = resumeTime; } catch (e) {}
                        }
                        if (shouldResume) startPlaying();
                    }
                    audio.addEventListener('loadedmetadata', applyResume);
                })();
            }
        }

        return {
            // Called by "Enter with sound" button
            start:     function () { return startPlaying(); },
            pause:     pausePlaying,
            isPlaying: function () { return playing; }
        };
    };
})();
