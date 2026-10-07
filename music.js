document.addEventListener("DOMContentLoaded", function () {

    const songs = [
        {
            title: "Midnight Dreams",
            artist: "Demo Artist",
            duration: 18
        },
        {
            title: "Neon Lights",
            artist: "Demo Artist",
            duration: 18
        },
        {
            title: "Ocean Waves",
            artist: "Demo Artist",
            duration: 18
        }
    ];

    const songTitle = document.getElementById("song-title");
    console.log(songTitle);
    
    const artistName = document.getElementById("artist-name");
    const progressBar = document.getElementById("progress-bar");
    const currentTime = document.getElementById("current-time");
    const durationText = document.getElementById("duration");

    const playButton = document.getElementById("play-button");
    const previousButton = document.getElementById("previous-button");
    const nextButton = document.getElementById("next-button");
    const volumeBar = document.getElementById("volume-bar");

    const songItems = document.querySelectorAll(".song-item");

    let currentSong = 0;
    let isPlaying = false;
    let elapsed = 0;
    let timer = null;

    let audioContext = null;
    let masterGain = null;

    function formatTime(seconds) {
        seconds = Math.floor(seconds);

        const minutes = Math.floor(seconds / 60);
        const secondsLeft = seconds % 60;

        return `${minutes}:${String(secondsLeft).padStart(2, "0")}`;
    }

    function setupAudio() {

        if (audioContext) {
            return;
        }

        audioContext = new (
            window.AudioContext ||
            window.webkitAudioContext
        )();

        masterGain = audioContext.createGain();

        masterGain.gain.value =
            Number(volumeBar.value) / 100;

        masterGain.connect(audioContext.destination);
    }

    function playNote(frequency, startTime, length) {

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(
            0.001,
            startTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.08,
            startTime + 0.03
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            startTime + length
        );

        oscillator.connect(gain);
        gain.connect(masterGain);

        oscillator.start(startTime);
        oscillator.stop(startTime + length);
    }

    function createMusic() {

        const start =
            audioContext.currentTime + 0.05;

        const melodies = [

            [
                261.63,
                329.63,
                392.00,
                329.63,
                293.66,
                349.23,
                440.00,
                349.23
            ],

            [
                329.63,
                392.00,
                493.88,
                392.00,
                369.99,
                440.00,
                554.37,
                440.00
            ],

            [
                220.00,
                261.63,
                293.66,
                329.63,
                293.66,
                261.63
            ]
        ];

        const melody = melodies[currentSong];

        for (let i = 0; i < 36; i++) {

            const frequency =
                melody[i % melody.length];

            playNote(
                frequency,
                start + i * 0.5,
                0.42
            );
        }
    }

    function updateDisplay() {

        const duration =
            songs[currentSong].duration;

        currentTime.textContent =
            formatTime(elapsed);

        durationText.textContent =
            formatTime(duration);

        progressBar.value =
            (elapsed / duration) * 100;
    }

    function startSong() {

        setupAudio();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        isPlaying = true;

        createMusic();

        clearInterval(timer);

        timer = setInterval(function () {

            elapsed += 0.1;

            updateDisplay();

            if (
                elapsed >=
                songs[currentSong].duration
            ) {
                nextSong();
            }

        }, 100);

        playButton.textContent = "❚❚";
    }

    function pauseSong() {

        isPlaying = false;

        clearInterval(timer);

        playButton.textContent = "▶";
    }

    function loadSong(index) {

        currentSong =
            (index + songs.length) %
            songs.length;

        elapsed = 0;

        clearInterval(timer);

        isPlaying = false;

        const song =
            songs[currentSong];

        songTitle.textContent =
            song.title;

        artistName.textContent =
            song.artist;

        updateDisplay();

        songItems.forEach(function (item, i) {

            item.classList.toggle(
                "active",
                i === currentSong
            );

        });

        playButton.textContent = "▶";
    }

    function nextSong() {

        loadSong(currentSong + 1);

        startSong();
    }

    function previousSong() {

        loadSong(currentSong - 1);

        startSong();
    }

    playButton.addEventListener(
        "click",
        function () {

            if (isPlaying) {
                pauseSong();
            } else {
                startSong();
            }

        }
    );

    nextButton.addEventListener(
        "click",
        nextSong
    );

    previousButton.addEventListener(
        "click",
        previousSong
    );

    songItems.forEach(
        function (item, index) {

            item.addEventListener(
                "click",
                function () {

                    loadSong(index);

                    startSong();

                }
            );

        }
    );

    progressBar.addEventListener(
        "input",
        function () {

            elapsed =
                Number(progressBar.value) /
                100 *
                songs[currentSong].duration;

            updateDisplay();

        }
    );

    volumeBar.addEventListener(
        "input",
        function () {

            setupAudio();

            masterGain.gain.value =
                Number(volumeBar.value) / 100;

        }
    );

    loadSong(0);

});

