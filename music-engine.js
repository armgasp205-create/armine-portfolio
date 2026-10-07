document.addEventListener("DOMContentLoaded", () => {
    const titles = ["Midnight Dreams", "Neon Lights", "Ocean Waves"];
    const melodies = [[261.63,329.63,392,329.63,293.66,349.23,440,349.23],[329.63,392,493.88,392,369.99,440,554.37,440],[220,261.63,293.66,329.63,293.66,261.63]];
    const play = document.getElementById("play-button"), progress = document.getElementById("progress-bar"), volume = document.getElementById("volume-bar");
    const items = Array.from(document.querySelectorAll(".song-item"));
    let context, gain, source, buffers = [], track = 0, offset = 0, started = 0, playing = false, frame, intent = 0;
    const duration = 18;
    const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,"0")}`;
    function elapsed() {return playing ? Math.min(duration, offset + context.currentTime - started) : offset;}
    function display() {
        const time = elapsed();
        document.getElementById("current-time").textContent = format(time);
        document.getElementById("duration").textContent = format(duration);
        progress.value = time / duration * 100;
        progress.setAttribute("aria-valuetext", `${format(time)} of ${format(duration)}`);
        play.textContent = playing ? "❚❚" : "▶";
        play.setAttribute("aria-label", playing ? "Pause" : "Play");
        if (playing) frame = requestAnimationFrame(display);
    }
    function setup() {
        if (context) return;
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) throw new Error("This browser does not support Web Audio.");
        context = new Audio(); gain = context.createGain(); gain.connect(context.destination); gain.gain.value = Number(volume.value) / 100;
        buffers = melodies.map(notes => {
            const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate), samples = buffer.getChannelData(0);
            for (let i = 0; i < samples.length; i++) {
                const t = i / context.sampleRate, position = t % .5;
                const envelope = position < .42 ? Math.min(1, position / .03) * Math.max(0, 1 - position / .42) : 0;
                samples[i] = Math.sin(2 * Math.PI * notes[Math.floor(t / .5) % notes.length] * position) * envelope * .2;
            }
            return buffer;
        });
    }
    function stop() {
        cancelAnimationFrame(frame);
        if (source) {source.onended = null; source.stop(); source.disconnect(); source = null;}
    }
    async function start() {
        const token = ++intent;
        try {
            setup(); await context.resume();
            if (token !== intent) return;
            stop(); if (offset >= duration) offset = 0;
            source = context.createBufferSource(); source.buffer = buffers[track]; source.connect(gain);
            started = context.currentTime; playing = true;
            source.onended = () => {if (playing) select((track + 1) % titles.length, true);};
            source.start(0, offset); display();
        } catch (error) {playing = false; document.getElementById("music-status").textContent = error.message; display();}
    }
    function pause() {intent++; offset = elapsed(); playing = false; stop(); display();}
    function select(index, autoplay) {
        intent++; playing = false; stop(); offset = 0; track = (index + titles.length) % titles.length;
        document.getElementById("song-title").textContent = titles[track];
        document.getElementById("artist-name").textContent = "Demo Artist";
        items.forEach((item, i) => {item.classList.toggle("active", i === track); item.setAttribute("aria-pressed", String(i === track));});
        display(); if (autoplay) start();
    }
    play.addEventListener("click", () => playing ? pause() : start());
    document.getElementById("previous-button").addEventListener("click", () => select(track - 1, playing));
    document.getElementById("next-button").addEventListener("click", () => select(track + 1, playing));
    items.forEach((item, i) => {
        item.tabIndex = 0; item.setAttribute("role", "button");
        item.addEventListener("click", () => select(i, true));
        item.addEventListener("keydown", event => {if (event.key === "Enter" || event.key === " ") {event.preventDefault(); select(i, true);}});
    });
    progress.setAttribute("aria-label", "Playback position"); volume.setAttribute("aria-label", "Volume");
    progress.addEventListener("input", () => {const resume = playing; intent++; playing = false; stop(); offset = Number(progress.value) / 100 * duration; display(); if (resume) start();});
    volume.addEventListener("input", () => {if (gain) gain.gain.setValueAtTime(Number(volume.value) / 100, context.currentTime);});
    document.querySelector(".playlist-button").addEventListener("click", () => {document.querySelector(".playlist").scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); items[track].focus({preventScroll:true});});
    window.addEventListener("pagehide", () => {if (playing) pause();});
    select(0, false);
});
