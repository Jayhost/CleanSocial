// Twitch Ad Blocker Script
// Based on Video Ad-Block for Twitch

const TWITCH_ADBLOCK_SCRIPT = `
(function() {
    if (/(^|\\.)twitch\\.tv$/.test(document.location.hostname) === false) { return; }
    'use strict';
    const ourTwitchAdSolutionsVersion = 20;
    if (typeof window.twitchAdSolutionsVersion !== 'undefined' && window.twitchAdSolutionsVersion >= ourTwitchAdSolutionsVersion) {
        console.log("skipping vaft as there's another script active");
        return;
    }
    window.twitchAdSolutionsVersion = ourTwitchAdSolutionsVersion;

    function declareOptions(scope) {
        scope.AdSignifier = 'stitched';
        scope.ClientID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
        scope.BackupPlayerTypes = ['embed', 'popout', 'autoplay'];
        scope.FallbackPlayerType = 'embed';
        scope.ForceAccessTokenPlayerType = 'popout';
        scope.SkipPlayerReloadOnHevc = false;
        scope.AlwaysReloadPlayerOnAd = false;
        scope.ReloadPlayerAfterAd = true;
        scope.PlayerReloadMinimalRequestsTime = 1500;
        scope.PlayerReloadMinimalRequestsPlayerIndex = 2;
        scope.HasTriggeredPlayerReload = false;
        scope.StreamInfos = [];
        scope.StreamInfosByUrl = [];
        scope.GQLDeviceID = null;
        scope.ClientVersion = null;
        scope.ClientSession = null;
        scope.ClientIntegrityHeader = null;
        scope.AuthorizationHeader = undefined;
        scope.SimulatedAdsDepth = 0;
        scope.PlayerBufferingFix = true;
        scope.PlayerBufferingDelay = 500;
        scope.PlayerBufferingSameStateCount = 3;
        scope.PlayerBufferingDangerZone = 1;
        scope.PlayerBufferingDoPlayerReload = false;
        scope.PlayerBufferingMinRepeatDelay = 5000;
        scope.V2API = false;
        scope.IsAdStrippingEnabled = true;
        scope.AdSegmentCache = new Map();
        scope.AllSegmentsAreAdSegments = false;
    }

    let isActivelyStrippingAds = false;
    let localStorageHookFailed = false;
    const twitchWorkers = [];
    const workerStringConflicts = ['twitch', 'isVariantA'];
    const workerStringAllow = [];
    const workerStringReinsert = ['isVariantA', 'besuper/', '\${patch_url}'];

    function getCleanWorker(worker) {
        let root = null;
        let parent = null;
        let proto = worker;
        while (proto) {
            const workerString = proto.toString();
            if (workerStringConflicts.some((x) => workerString.includes(x)) && !workerStringAllow.some((x) => workerString.includes(x))) {
                if (parent !== null) {
                    Object.setPrototypeOf(parent, Object.getPrototypeOf(proto));
                }
            } else {
                if (root === null) {
                    root = proto;
                }
                parent = proto;
            }
            proto = Object.getPrototypeOf(proto);
        }
        return root;
    }

    function getWorkersForReinsert(worker) {
        const result = [];
        let proto = worker;
        while (proto) {
            const workerString = proto.toString();
            if (workerStringReinsert.some((x) => workerString.includes(x))) {
                result.push(proto);
            }
            proto = Object.getPrototypeOf(proto);
        }
        return result;
    }

    function reinsertWorkers(worker, reinsert) {
        let parent = worker;
        for (let i = 0; i < reinsert.length; i++) {
            Object.setPrototypeOf(reinsert[i], parent);
            parent = reinsert[i];
        }
        return parent;
    }

    function isValidWorker(worker) {
        const workerString = worker.toString();
        return !workerStringConflicts.some((x) => workerString.includes(x))
            || workerStringAllow.some((x) => workerString.includes(x))
            || workerStringReinsert.some((x) => workerString.includes(x));
    }

    function parseAttributes(str) {
        return Object.fromEntries(
            str.split(/(?:^|,)((?:[^=]*)=(?:"[^"]*"|[^,]*))/)
            .filter(Boolean)
            .map(x => {
                const idx = x.indexOf('=');
                const key = x.substring(0, idx);
                const value = x.substring(idx + 1);
                const num = Number(value);
                return [key, Number.isNaN(num) ? value.startsWith('"') ? JSON.parse(value) : value : num];
            }));
    }

    function stripAdSegments(textStr, stripAllSegments, streamInfo) {
        let hasStrippedAdSegments = false;
        const lines = textStr.replaceAll('\\r', '').split('\\n');
        const newAdUrl = 'https://twitch.tv';
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            line = line
                .replaceAll(/(X-TV-TWITCH-AD-URL=")(?:[^"]*)(")/g, '$1' + newAdUrl + '$2')
                .replaceAll(/(X-TV-TWITCH-AD-CLICK-TRACKING-URL=")(?:[^"]*)(")/g, '$1' + newAdUrl + '$2');
            
            if (i < lines.length - 1 && line.startsWith('#EXTINF') && (!line.includes(',live') || stripAllSegments || scope.AllSegmentsAreAdSegments)) {
                const segmentUrl = lines[i + 1];
                if (!scope.AdSegmentCache.has(segmentUrl)) {
                    streamInfo.NumStrippedAdSegments++;
                }
                scope.AdSegmentCache.set(segmentUrl, Date.now());
                hasStrippedAdSegments = true;
            }
            if (line.includes(scope.AdSignifier)) {
                hasStrippedAdSegments = true;
            }
        }
        
        if (hasStrippedAdSegments) {
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('#EXT-X-TWITCH-PREFETCH:')) {
                    lines[i] = '';
                }
            }
        } else {
            streamInfo.NumStrippedAdSegments = 0;
        }
        
        streamInfo.IsStrippingAdSegments = hasStrippedAdSegments;
        scope.AdSegmentCache.forEach((key, value, map) => {
            if (value < Date.now() - 120000) {
                map.delete(key);
            }
        });
        
        return lines.join('\\n');
    }

    function hookFetch() {
        const realFetch = window.fetch;
        window.realFetch = realFetch;
        window.fetch = function(url, init, ...args) {
            if (typeof url === 'string') {
                if (url.includes('gql')) {
                    let deviceId = init?.headers?.['X-Device-Id'];
                    if (typeof deviceId !== 'string') {
                        deviceId = init?.headers?.['Device-ID'];
                    }
                    if (typeof deviceId === 'string' && GQLDeviceID != deviceId) {
                        GQLDeviceID = deviceId;
                    }
                    if (init?.headers?.['Client-Version']) {
                        ClientVersion = init.headers['Client-Version'];
                    }
                    if (init?.headers?.['Client-Session-Id']) {
                        ClientSession = init.headers['Client-Session-Id'];
                    }
                    if (init?.headers?.['Client-Integrity']) {
                        ClientIntegrityHeader = init.headers['Client-Integrity'];
                    }
                    if (init?.headers?.['Authorization']) {
                        AuthorizationHeader = init.headers['Authorization'];
                    }
                }
            }
            return realFetch.apply(this, arguments);
        };
    }

    function getPlayerAndState() {
        function findReactNode(root, constraint) {
            if (root.stateNode && constraint(root.stateNode)) {
                return root.stateNode;
            }
            let node = root.child;
            while (node) {
                const result = findReactNode(node, constraint);
                if (result) {
                    return result;
                }
                node = node.sibling;
            }
            return null;
        }

        function findReactRootNode() {
            let reactRootNode = null;
            const rootNode = document.querySelector('#root');
            if (rootNode?._reactRootContainer?._internalRoot?.current) {
                reactRootNode = rootNode._reactRootContainer._internalRoot.current;
            }
            if (reactRootNode == null && rootNode != null) {
                const containerName = Object.keys(rootNode).find(x => x.startsWith('__reactContainer'));
                if (containerName != null) {
                    reactRootNode = rootNode[containerName];
                }
            }
            return reactRootNode;
        }

        const reactRootNode = findReactRootNode();
        if (!reactRootNode) {
            return null;
        }
        
        let player = findReactNode(reactRootNode, node => node.setPlayerActive && node.props?.mediaPlayerInstance);
        player = player?.props?.mediaPlayerInstance || null;
        const playerState = findReactNode(reactRootNode, node => node.setSrc && node.setInitialPlaybackSettings);
        
        return { player, state: playerState };
    }

    function doTwitchPlayerTask(isPausePlay, isReload) {
        const playerAndState = getPlayerAndState();
        if (!playerAndState) return;
        
        const player = playerAndState.player;
        const playerState = playerAndState.state;
        
        if (!player || !playerState) return;
        if (player.isPaused() || player.core?.paused) return;
        
        if (isPausePlay) {
            player.pause();
            player.play();
            return;
        }
        
        if (isReload) {
            console.log('Reloading Twitch player');
            playerState.setSrc({ isNewMediaPlayerInstance: true, refreshAccessToken: true });
            player.play();
        }
    }

    let playerForMonitoringBuffering = null;
    const playerBufferState = {
        position: 0,
        bufferedPosition: 0,
        bufferDuration: 0,
        numSame: 0,
        lastFixTime: 0,
        isLive: true
    };

    function monitorPlayerBuffering() {
        if (playerForMonitoringBuffering) {
            try {
                const player = playerForMonitoringBuffering.player;
                const state = playerForMonitoringBuffering.state;
                
                if (!player.core) {
                    playerForMonitoringBuffering = null;
                } else if (state.props?.content?.type === 'live' && !player.isPaused() && !player.getHTMLVideoElement()?.ended && playerBufferState.lastFixTime <= Date.now() - PlayerBufferingMinRepeatDelay && !isActivelyStrippingAds) {
                    const position = player.core?.state?.position;
                    const bufferedPosition = player.core?.state?.bufferedPosition;
                    const bufferDuration = player.getBufferDuration();
                    
                    if (position > 5 &&
                        (playerBufferState.position == position || bufferDuration < PlayerBufferingDangerZone) &&
                        playerBufferState.bufferedPosition == bufferedPosition &&
                        playerBufferState.bufferDuration >= bufferDuration &&
                        (position != 0 || bufferedPosition != 0 || bufferDuration != 0)) {
                        playerBufferState.numSame++;
                        if (playerBufferState.numSame == PlayerBufferingSameStateCount) {
                            console.log('Attempt to fix buffering');
                            doTwitchPlayerTask(!PlayerBufferingDoPlayerReload, PlayerBufferingDoPlayerReload);
                            playerBufferState.lastFixTime = Date.now();
                        }
                    } else {
                        playerBufferState.numSame = 0;
                    }
                    playerBufferState.position = position;
                    playerBufferState.bufferedPosition = bufferedPosition;
                    playerBufferState.bufferDuration = bufferDuration;
                }
            } catch (err) {
                playerForMonitoringBuffering = null;
            }
        }
        
        if (!playerForMonitoringBuffering) {
            const playerAndState = getPlayerAndState();
            if (playerAndState?.player && playerAndState?.state) {
                playerForMonitoringBuffering = playerAndState;
            }
        }
        
        setTimeout(monitorPlayerBuffering, PlayerBufferingDelay);
    }

    function updateAdblockBanner(data) {
        const playerRootDiv = document.querySelector('.video-player');
        if (playerRootDiv) {
            let adBlockDiv = playerRootDiv.querySelector('.adblock-overlay');
            if (!adBlockDiv) {
                adBlockDiv = document.createElement('div');
                adBlockDiv.className = 'adblock-overlay';
                adBlockDiv.innerHTML = '<div class="player-adblock-notice" style="color: white; background-color: rgba(0, 0, 0, 0.8); position: absolute; top: 0px; left: 0px; padding: 5px; z-index: 9999; border-radius: 4px;"><p></p></div>';
                adBlockDiv.style.display = 'none';
                adBlockDiv.P = adBlockDiv.querySelector('p');
                playerRootDiv.appendChild(adBlockDiv);
            }
            if (adBlockDiv) {
                isActivelyStrippingAds = data.isStrippingAdSegments;
                adBlockDiv.P.textContent = 'Blocking' + (data.isMidroll ? ' midroll' : '') + ' ads' + (data.isStrippingAdSegments ? ' (stripping)' : '');
                adBlockDiv.style.display = data.hasAds && playerBufferState.isLive ? 'block' : 'none';
            }
        }
    }

    function onContentLoaded() {
        try {
            Object.defineProperty(document, 'visibilityState', {
                get() { return 'visible'; }
            });
        } catch {}
        
        try {
            Object.defineProperty(document, 'hidden', {
                get() { return false; }
            });
        } catch {}
        
        const block = e => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        };
        
        document.addEventListener('visibilitychange', block, true);
        document.addEventListener('webkitvisibilitychange', block, true);
    }

    // Initialize
    declareOptions(window);
    hookFetch();
    
    if (PlayerBufferingFix) {
        monitorPlayerBuffering();
    }
    
    if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === "interactive") {
        onContentLoaded();
    } else {
        window.addEventListener("DOMContentLoaded", onContentLoaded);
    }
    
    console.log('🎮 Twitch Ad Blocker active');
})();
`;

module.exports = { TWITCH_ADBLOCK_SCRIPT };