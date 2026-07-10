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
        var btnMain       = document.getElementById('music-play-pause');  // THE ONLY pause control
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
            }).catch(function (err) {
                console.warn('[MusicPlayer] Playback failed:', err);
                playing = false;
                updateUI();
            });
        }

        // THE ONLY function that pauses — called exclusively by btnMain
        function pausePlaying() {
            audio.pause();
            playing = false;
            updateUI();
        }

        function playTrack(i) {
            loadTrack(i);
            return startPlaying();
        }

        // ── Soundbar button — hover + click ───────────────────────────
        //
        // HOVER (desktop): reveals the player panel.
        // CLICK: starts music if not already playing — but NEVER pauses.
        //        Clicking the soundbar when music is playing does nothing to audio.
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

            if (isTouch()) {
                // Mobile: tap soundbar → open panel if closed; start music if not playing.
                if (!panelOpen) showPanel();
                if (!playing) startPlaying();
            } else {
                // Desktop: click → start music if not already playing. Never pauses.
                if (!playing) startPlaying();
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

        // ── THE ONLY pause control: btnMain inside the player card ────
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
        audio.addEventListener('ended',   function () { playTrack(index + 1); });
        audio.addEventListener('playing', function () { playing = true;  updateUI(); });
        audio.addEventListener('pause',   function () { if (!audio.ended) { playing = false; updateUI(); } });
        audio.addEventListener('error',   function () {
            var err = audio.error;
            console.warn('[MusicPlayer] Audio error:', err ? 'code ' + err.code + ' — ' + err.message : 'unknown');
            playing = false; updateUI();
        });

        // ── Mobile: tap outside → hide panel (music keeps playing) ───
        document.addEventListener('click', function (e) {
            if (!isTouch() || !panelOpen) return;
            if (musicZone && musicZone.contains(e.target)) return;
            hidePanel();
        });

        // ── Init ──────────────────────────────────────────────────────
        loadTrack(0);
        updateUI();

        return {
            // Called by "Enter with sound" button
            start:     function () { return startPlaying(); },
            pause:     pausePlaying,
            isPlaying: function () { return playing; }
        };
    };
})();
