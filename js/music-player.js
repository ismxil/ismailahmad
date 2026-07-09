(function () {
    var TRACKS = [
        {
            title: 'Dream',
            artist: 'Alan Watts',
            src: 'assets/audio/Alan Watts - Dream.flac',
            cover: 'assets/music/dream-cover-opt.jpg'
        },
        {
            title: 'Beautiful Error',
            artist: 'Alan Watts',
            src: 'assets/audio/Alan Watts - Beautiful Error.flac',
            cover: 'assets/music/dream-cover-opt.jpg'
        },
        {
            title: 'Burgs',
            artist: 'Mt. Wolf',
            src: 'assets/audio/Mt. Wolf - Burgs.flac',
            cover: 'assets/music/thumb-next.jpg'
        }
    ];

    window.initMusicPlayer = function () {
        var audio = document.getElementById('site-audio');
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

        if (!audio || !player || !playBtn) return null;

        audio.preload = 'auto';

        var index = 0;
        var playing = false;
        var open = false;

        function trackAt(i) {
            return TRACKS[((i % TRACKS.length) + TRACKS.length) % TRACKS.length];
        }

        function trackUrl(track) {
            return new URL(track.src, window.location.href).href;
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

        function currentAudioSrc() {
            var raw = audio.currentSrc || audio.src || '';
            if (!raw) return '';
            try {
                return new URL(raw, window.location.href).href;
            } catch (err) {
                return raw;
            }
        }

        function loadTrack(i) {
            index = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
            var track = trackAt(index);
            var resolved = trackUrl(track);
            if (currentAudioSrc() !== resolved) {
                audio.src = track.src;
                audio.load();
            }
            updateUI();
        }

        function beginPlayback() {
            setOpen(true);
            if (!audio.src) loadTrack(index);
            return audio.play().then(function () {
                playing = true;
                updateUI();
            }).catch(function () {
                playing = false;
                updateUI();
                return Promise.reject(new Error('Playback failed'));
            });
        }

        function play() {
            if (!audio.src) loadTrack(index);
            return beginPlayback();
        }

        function pause() {
            audio.pause();
            playing = false;
            updateUI();
        }

        function playTrack(i, keepPlaying) {
            loadTrack(i);
            if (keepPlaying) return beginPlayback();
            updateUI();
            return Promise.resolve();
        }

        function toggle() {
            if (!open) {
                setOpen(true);
                return play();
            }
            if (playing) {
                pause();
                return Promise.resolve();
            }
            return play();
        }

        playBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            toggle();
        });
        btnMain.addEventListener('click', function (e) {
            e.stopPropagation();
            toggle();
        });
        btnPrev.addEventListener('click', function (e) {
            e.stopPropagation();
            playTrack(index - 1, playing);
        });
        btnNext.addEventListener('click', function (e) {
            e.stopPropagation();
            playTrack(index + 1, playing);
        });

        audio.addEventListener('ended', function () {
            playTrack(index + 1, true);
        });

        audio.addEventListener('playing', function () {
            playing = true;
            setOpen(true);
            updateUI();
        });

        audio.addEventListener('pause', function () {
            if (!audio.ended) {
                playing = false;
                updateUI();
            }
        });

        audio.addEventListener('error', function () {
            playing = false;
            updateUI();
        });

        loadTrack(0);
        updateUI();

        return {
            start: function () { return play(); },
            toggle: toggle,
            pause: pause,
            isPlaying: function () { return playing; }
        };
    };
})();
