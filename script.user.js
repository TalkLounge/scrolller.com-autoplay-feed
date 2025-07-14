// ==UserScript==
// @name            Scrolller.com Autoplay Feed
// @name:de         Scrolller.com Automatische Wiedergabe im Feed
// @version         1.0.5
// @description     Autoplay Videos in Feed on Scrolller.com
// @description:de  Spiele Videos im Feed automatisch ab auf Scrolller.com
// @icon            https://scrolller.com/assets/favicon-16x16.png
// @author          TalkLounge (https://github.com/TalkLounge)
// @namespace       https://github.com/TalkLounge/scrolller.com-autoplay-feed
// @license         MIT
// @match           https://scrolller.com/*
// @grant           none
// @run-at          document-start
// ==/UserScript==

(function () {
    'use strict';

    let interval, muted = true;
    let cooldown = Date.now();

    function video2SVGParent(video) {
        const parent = video.parentNode.parentNode.parentNode;
        //console.log(`video2SVGParent():`, video, "Return:", parent);
        return parent;
    }

    function insertSound(parent, mute) {
        if (!parent || [...parent.classList].includes("noaudio")) {
            return;
        }
        //console.log(`insertSound():`, parent, mute);

        parent.querySelector(".sound")?.remove();

        let html;
        if (mute) {
            html = `
            <svg class="sound muted" viewBox="0 0 512 512" style="fill: grey; position: absolute; z-index: 1; width: 1.5em; cursor: pointer; margin-left: 0.2em">
                <path d="M232 416a23.88 23.88 0 01-14.2-4.68 8.27 8.27 0 01-.66-.51L125.76 336H56a24 24 0 01-24-24V200a24 24 0 0124-24h69.75l91.37-74.81a8.27 8.27 0 01.66-.51A24 24 0 01256 120v272a24 24 0 01-24 24zm-106.18-80zm-.27-159.86zM320 336a16 16 0 01-14.29-23.19c9.49-18.87 14.3-38 14.3-56.81 0-19.38-4.66-37.94-14.25-56.73a16 16 0 0128.5-14.54C346.19 208.12 352 231.44 352 256c0 23.86-6 47.81-17.7 71.19A16 16 0 01320 336z"></path>
                <path d="M368 384a16 16 0 01-13.86-24C373.05 327.09 384 299.51 384 256c0-44.17-10.93-71.56-29.82-103.94a16 16 0 0127.64-16.12C402.92 172.11 416 204.81 416 256c0 50.43-13.06 83.29-34.13 120a16 16 0 01-13.87 8z"></path>
                <path d="M416 432a16 16 0 01-13.39-24.74C429.85 365.47 448 323.76 448 256c0-66.5-18.18-108.62-45.49-151.39a16 16 0 1127-17.22C459.81 134.89 480 181.74 480 256c0 64.75-14.66 113.63-50.6 168.74A16 16 0 01416 432z"></path>
            </svg>`;
        } else {
            html = `
            <svg class="sound volume" viewBox="0 0 512 512" style="fill: white; position: absolute; z-index: 1; width: 1.5em; cursor: pointer; margin-left: 0.2em">
                <path d="M232 416a23.88 23.88 0 01-14.2-4.68 8.27 8.27 0 01-.66-.51L125.76 336H56a24 24 0 01-24-24V200a24 24 0 0124-24h69.75l91.37-74.81a8.27 8.27 0 01.66-.51A24 24 0 01256 120v272a24 24 0 01-24 24zm-106.18-80zm-.27-159.86zM320 336a16 16 0 01-14.29-23.19c9.49-18.87 14.3-38 14.3-56.81 0-19.38-4.66-37.94-14.25-56.73a16 16 0 0128.5-14.54C346.19 208.12 352 231.44 352 256c0 23.86-6 47.81-17.7 71.19A16 16 0 01320 336z"></path>
                <path d="M368 384a16 16 0 01-13.86-24C373.05 327.09 384 299.51 384 256c0-44.17-10.93-71.56-29.82-103.94a16 16 0 0127.64-16.12C402.92 172.11 416 204.81 416 256c0 50.43-13.06 83.29-34.13 120a16 16 0 01-13.87 8z"></path>
                <path d="M416 432a16 16 0 01-13.39-24.74C429.85 365.47 448 323.76 448 256c0-66.5-18.18-108.62-45.49-151.39a16 16 0 1127-17.22C459.81 134.89 480 181.74 480 256c0 64.75-14.66 113.63-50.6 168.74A16 16 0 01416 432z"></path>
            </svg>`;
        }
        html = html.replace(/>\s+</g, '><').trim(); // Clean up formatted html, Thanks to https://stackoverflow.com/a/27841683
        const child = new DOMParser().parseFromString(html, "text/html");

        child.body.firstChild.addEventListener("click", (e) => {
            e.stopPropagation();

            const svg = e.target.closest(".sound");
            //console.log("Clicked Sound Button", svg);

            document.querySelectorAll("video").forEach(video => {
                if (!video.muted) {
                    insertSound(video2SVGParent(video), true);
                }

                video.muted = true;
            });

            if ([...svg.classList].includes("muted")) {
                //console.log("Muted");
                muted = false;

                parent.querySelector("video").muted = false;

                insertSound(parent);
            } else {
                //console.log("Unmuted");
                muted = true;

                insertSound(parent, true);
            }
        });

        parent.insertBefore(child.body.firstChild, parent.firstChild);
    }

    function extractMediaSourceFromVideoTag(data) {
        return [...data.querySelectorAll("video source")].map(item => { return { url: item.src } });
    }

    function extractMediaSourceFromScrollerConfig(data) {
        data = [...data.querySelectorAll("head script")];
        data = data.find(item => item.innerText.includes("window.scrolllerConfig"));
        data = data.textContent;
        data = data.replace("window.scrolllerConfig=", "");
        data = data.replace(/\\'/g, "'");
        data = JSON.parse(JSON.parse(data));
        return data.item.mediaSources;
    }

    function extractMediaSourceFromScriptTags(data, url) {
        data = [...data.querySelectorAll("script")];
        data = data.find(item => item.innerText.includes("mediaSources") && item.innerText.includes("blurredMediaSources"));

        if (!data) {
            console.log("----------");
            console.error("Could not load url scripts");
            console.log(url);
            return;
        }

        data = data.innerText;
        const dataBefore = data;

        const indexStart = data.indexOf(`"mediaSources`);
        let subString = data.substring(indexStart);

        const indexEnd = subString.indexOf("}]") + 2;
        subString = subString.substring(0, indexEnd);

        subString = `{${subString}}`;
        subString = subString.replace(/\\"/g, '"');
        const dataBefore2 = subString;

        try {
            return JSON.parse(subString)?.mediaSources;
        } catch (e) {
            console.log("----------");
            console.error("Unable to parse JSON");
            console.log(url);
            console.error(e);
            console.log(dataBefore);
            console.log(dataBefore2);
        }
    }

    async function loadVideo(parent) {
        if ([...parent.classList].includes("loaded")) {
            return;
        }
        //console.log(`loadVideo():`, parent);

        parent.classList.add("loaded");
        parent.querySelector("div>svg").parentNode.remove();
        const url = parent.querySelector("a").href;

        let data;
        for (let i = 0; i < 5; i++) { // Try 4 times in case of HTTP Code 500
            try {
                data = await fetch(url);

                if (data.ok) {
                    break;
                }
            } catch (e) { }

            if (i == 4) {
                console.error("Got 4 HTTP Code 500. Exiting", url);
                return;
            } else {
                console.log("Got HTTP Code 500. Try again", i, url);
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        data = await data.text();
        data = new DOMParser().parseFromString(data, "text/html");

        let mediaSources;
        try {
            mediaSources = extractMediaSourceFromVideoTag(data);
        } catch (e) { }

        if (!mediaSources || !mediaSources.length) {
            try {
                mediaSources = extractMediaSourceFromScrollerConfig(data);
            } catch (e) { }
        }

        if (!mediaSources || !mediaSources.length) {
            try {
                mediaSources = extractMediaSourceFromScriptTags(data, url);
            } catch (e) { }
        }

        if (!mediaSources || !mediaSources.length) {
            console.log("----------");
            console.error("Could not load mediaSources");
            console.log(url);
            return;
        }

        mediaSources = mediaSources.filter(item => (item.url.endsWith(".webm") || item.url.endsWith(".mp4")) && !item.url.endsWith("_thumb."));
        mediaSources = mediaSources.map(item => item.url);

        const video = document.createElement("video");
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.style.height = "100%";
        video.style.position = "absolute";
        video.addEventListener("loadeddata", () => {
            parent.querySelector("picture").remove();

            const hasAudio = video.mozHasAudio || Boolean(video.webkitAudioDecodedByteCount) || Boolean(video.audioTracks && video.audioTracks.length);

            if (!hasAudio) {
                parent.classList.add("noaudio");
            }

            insertSound(parent, true);
        });

        for (const src of mediaSources) {
            const source = document.createElement("source");
            source.src = src;
            video.append(source);
        }

        parent.querySelector("a>div").insertBefore(video, parent.querySelector("a>div").firstChild);
    }

    function loadVideos() {
        const items = document.querySelectorAll("main>div>div>div a:has(div>svg), [class^=verticalView_container]>div>div a:has(div>svg)");

        for (const item of items) {
            loadVideo(item.parentNode);
        }
    }

    async function init() {
        if (!document.querySelector("main>div>div>div picture, [class^=verticalView_container]>div>div picture")) {
            return;
        }

        window.clearInterval(interval);

        window.setInterval(loadVideos, 500);

        document.body.onscroll = function () {
            if (muted) {
                return;
            }

            if (Date.now() - cooldown < 250) {
                return;
            }
            cooldown = Date.now();

            //console.log("Scroll");
            let diffMin = 1000000;
            let nearest;
            let middle = window.innerHeight / 2;

            document.querySelectorAll("video").forEach(video => {
                const loud = video2SVGParent(video).querySelector(".sound:not(.muted)");
                if (loud) {
                    insertSound(video2SVGParent(video), true);
                }
                video.muted = true;
                const rect = video.getBoundingClientRect();
                const elemMiddle = rect.y + (rect.height / 2);
                const diff = Math.abs(middle - elemMiddle);
                if (diff < diffMin) {
                    diffMin = diff;
                    nearest = video;
                }
            });

            if (!nearest || diffMin > middle || video2SVGParent(nearest).querySelector(".sound:not(.muted)")) {
                return;
            }

            nearest.muted = false;

            insertSound(video2SVGParent(nearest));
        }
    }

    interval = window.setInterval(init, 500);
})();
