// ==UserScript==
// @name            Scrolller.com Autoplay Feed
// @name:de         Scrolller.com Automatische Wiedergabe im Feed
// @version         1.0.4
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

    function parseJSON(data) {
        try {
            return JSON.parse(data);
        } catch (e) {
            const possibleEnds = [...data.matchAll(/\]\]/g)].map(match => match.index);
            for (let i = 0; i < possibleEnds.length; i++) { // Try possible ends of the Array
                try {
                    return JSON.parse(data.slice(0, possibleEnds[i] + 2));
                } catch (e) { }
            }

            throw e;
        }
    }

    async function loadVideo(parent) {
        if ([...parent.classList].includes("loaded")) {
            return;
        }
        //console.log(`loadVideo():`, parent);

        parent.classList.add("loaded");
        parent.querySelector("div>svg").parentNode.remove();

        let response = await fetch(parent.querySelector("a").href);
        response = await response.text();
        response = new DOMParser().parseFromString(response, "text/html");

        let data;
        try { // Try old first
            data = [...response.querySelectorAll("head script")];
            data = data.find(item => item.innerText.includes("window.scrolllerConfig"));
            data = data.textContent;
            data = data.replace("window.scrolllerConfig=", "");
            data = data.replace(/\\'/g, "'");
            data = JSON.parse(JSON.parse(data));
            data = data.item.mediaSources;
        } catch (e) { // Then try new
            data = [...response.querySelectorAll("script")];
            data = data.find(item => item.innerText.includes("mediaSources") && item.innerText.includes("blurredMediaSources"));

            if (!data) {
                console.log("----------");
                console.error("Could not load url scripts");
                console.log(parent.querySelector("a").href);
                return;
            }

            data = data.innerText;
            const dataIntial = data;


            // Base
            data = data.replace('self.__next_f.push([1,"', "");


            if (data.indexOf('],\"default\"]') != -1) { // Delete static/chunks Array
                data = data.slice(data.indexOf('],\"default\"]'));

                console.log(data.indexOf(':[\"$undefined\"'));
                if (data.indexOf(':[\"$undefined\"') != -1) {
                    data = data.slice(data.indexOf(':[\"$undefined\"') + 15);
                    console.log(data);
                }
            }

            if (data.indexOf('dangerouslySetInnerHTML\":{\"__html\":\"$') != -1) { // Delete empty dangerouslySetInnerHTML
                data = data.slice(data.indexOf('dangerouslySetInnerHTML\":{\"__html\":\"$') + 36);
            }

            // Delete parts of another JSON / Array
            while (data.indexOf("}") < data.indexOf("{")) {
                data = data.slice(data.indexOf("}") + 1);
            }

            while (data.indexOf("]") < data.indexOf("[")) {
                data = data.slice(data.indexOf("]") + 1);
            }

            data = data.replace(/^,/, "");
            data = data.trim();


            // Detect Type
            let type;
            if (/^\d+:\[\[/.test(data)) { // 8:[[
                console.log('Test Case is 8:[[');
                type = 0;
            } else if (/^\[\"\$\",/.test(data)) { // ["$",
                console.log('Test Case is ["$",');
                type = 1;
            } else if (/^\[\\"\$\\",/.test(data)) { // ["$",
                console.log('Test Case is ["$",');
                type = 2;
            } else if (/^[A-Za-z]+,/.test(data)) { // ,null
                console.log('Test Case is ,null');
                type = 3;
            }


            // Start
            if (type == 0) {
                data = data.replace(/^\d+:\[\[/, "[[");
            } else if (type == 1 || type == 2) {
                data = data.replace(/^\[/, "[[], [");
            } else if (type == 3) {
                data = data.replace(/^[A-Za-z]+,/, '[[], ["", "", null,');
            }


            // De-Escape
            if (type == 0) {
                data = data.replace(/:"{/g, ":{");
                data = data.replace(/}"}/g, "}}");

                data = data.replace(/:\\"\{/g, ":{");
                data = data.replace(/}\\"\}/g, "}}");
            }

            data = data.replace(/\\"/g, '"');
            data = data.replace(/\\"/g, '"');
            data = data.replace(/\\"/g, '"');

            if (type == 0) {
                data = data.replace(/\"\"/g, '"');
                data = data.replaceAll('":",', '":"",');
            }


            // End
            data = data.replace(/\"\]\)$/, "");
            data = data.replace(/\n/g, "");


            // Parse JSON
            try {
                const dataBefore = data;
                data = parseJSON(data);

                if (typeof (data) != "object") {
                    console.log("----------");
                    console.error("JSON is not a JSON");
                    console.log("Data Initial\n", dataIntial);
                    console.log("Data Before\n", dataBefore);
                    console.log("Data After\n", data);
                    return;
                }
            } catch (e) {
                console.log("----------");
                console.error("Unable to parse JSON");
                console.error(e);
                console.log("Data Initial\n", dataIntial);
                console.log("Data Before\n", data);
                return;
            }

            data = data[1][3].post.mediaSources;
        }

        data = data.filter(item => (item.url.endsWith(".webm") || item.url.endsWith(".mp4")) && !item.url.endsWith("_thumb."));
        data = data.map(item => item.url);

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

        for (const src of data) {
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
