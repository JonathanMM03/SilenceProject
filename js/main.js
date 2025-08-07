function addDarkmodeWidget() {
    new Darkmode().showWidget();
}
window.addEventListener('load', addDarkmodeWidget);

var connectBtn = document.getElementById("connectBtn");
var pauseBtn = document.getElementById("pauseBtn");
var continueBtn = document.getElementById("continueBtn");
// Ensure initial states are correct for a disconnected state
connectBtn.disabled = false;
pauseBtn.disabled = true;
continueBtn.disabled = true;

// Declare 'ws' globally within this script so it can be accessed by connect and disconnect functions
let ws = null; // Initialize WebSocket instance to null

var worker = new Worker('/js/worker.js');
worker.addEventListener('message', function (e) {
    graphDataArray = graphDataArray.concat(e.data);
    graphDataArray.splice(0, 1);
    var data_update = { y: [graphDataArray] };
    Plotly.update('graph', data_update);
}, false);

const arrayLength = 100;
var graphDataArray = Array(arrayLength).fill(0);

var layout = {
    title: 'Streaming Data',
    paper_bgcolor: "#000",
    plot_bgcolor: "#000",
    xaxis: {
        domain: [0, 1],
        showticklabels: false,
        color: "#FFF",
    },
    yaxis: {
        domain: [0, 1],
        color: "#FFF",
        rangemode: "auto",
    },
};

Plotly.newPlot('graph', [{
    y: graphDataArray,
    mode: 'lines',
    line: { color: '#DF56F1' }
}], layout);

let player;

// Function to handle connection
window.connect = async function connect() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log("Existing WebSocket is open, closing before new connection.");
        ws.close();
    }

    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';

    try {
        const response = await fetch('/api/ip');
        const { ip, port } = await response.json();
        const WS_URL = `ws://${ip}:${port}/`;

        ws = new WebSocket(WS_URL);
        ws.binaryType = 'arraybuffer';

        ws.onopen = function() {
            console.log('WebSocket Connected');
            connectBtn.textContent = 'Connected';
            pauseBtn.disabled = false;
            continueBtn.disabled = false;
        };

        ws.onmessage = function (event) {
            if (!continueBtn.disabled) {
                player.feed(event.data);
                worker.postMessage(event.data);
            }
        };

        ws.onclose = function() {
            console.log('WebSocket Disconnected');
            connectBtn.disabled = false;
            connectBtn.textContent = 'Connect';
            pauseBtn.disabled = true;
            continueBtn.disabled = true;
            if (player) player.destroy();
            player = null;
            ws = null;
        };

        ws.onerror = function(error) {
            console.error('WebSocket Error:', error);
            if (ws) ws.close();
            alert('WebSocket connection failed.');
        };

        if (!player) {
            player = new PCMPlayer({ inputCodec: 'Int16', channels: 1, sampleRate: 44100 });
        }
    } catch (err) {
        console.error('Failed to fetch IP:', err);
        alert('No se pudo obtener la IP del servidor.');
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect';
    }
}

// Function to handle disconnection
window.disconnect = function disconnect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        console.log('Disconnecting WebSocket...');
        ws.close(); // This will trigger ws.onclose, which handles state cleanup
    } else {
        console.log('WebSocket is not connected.');
        // If for some reason ws.onclose wasn't triggered or states are off,
        // manually reset them here (though onclose should handle it)
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect';
        pauseBtn.disabled = true;
        continueBtn.disabled = true;
        if (player) {
            player.destroy();
            player = null;
        }
        ws = null;
    }
}


window.changeVolume = function changeVolume(e) {
    if (player) { // Only change volume if player exists
        player.volume(document.querySelector('#range').value);
    }
    // Update the CSS variable for track fill (Webkit only)
    const rangeInput = document.getElementById('range');
    const value = (rangeInput.value - rangeInput.min) / (rangeInput.max - rangeInput.min) * 100;
    rangeInput.style.setProperty('--thumb-position', `${value}%`);
}

// Initial update on load for the range input
window.addEventListener('load', () => {
    const rangeInput = document.getElementById('range');
    const value = (rangeInput.value - rangeInput.min) / (rangeInput.max - rangeInput.min) * 100;
    rangeInput.style.setProperty('--thumb-position', `${value}%`);
});

window.pause = async function pause() {
    if (player && ws && ws.readyState === WebSocket.OPEN) {
        pauseBtn.disabled = true;
        continueBtn.disabled = false;
        await player.pause();
        console.log('Playback paused.');
    } else {
        console.log('Cannot pause: Player not active or WebSocket not open.');
    }
}

window.continuePlay = function continuePlay() {
    if (player && ws && ws.readyState === WebSocket.OPEN) {
        player.continue();
        pauseBtn.disabled = false;
        continueBtn.disabled = true;
        console.log('Playback continued.');
    } else {
        console.log('Cannot continue: Player not active or WebSocket not open.');
    }
}
