#include "web_server.h"

// Global instance
BoardWebServer boardWebServer;

BoardWebServer::BoardWebServer() : server(WEB_SERVER_PORT) {}

bool BoardWebServer::begin() {
    Serial.println("[Web] Starting web server...");

    // Set up routes
    server.on("/", HTTP_GET, [this]() { handleRoot(); });
    server.on("/api/status", HTTP_GET, [this]() { handleGetStatus(); });
    server.on("/api/config", HTTP_POST, [this]() { handlePostConfig(); });
    server.on("/api/test-led", HTTP_POST, [this]() { handleTestLed(); });
    server.on("/api/reset", HTTP_POST, [this]() { handleReset(); });
    server.onNotFound([this]() { handleNotFound(); });

    server.begin();
    Serial.printf("[Web] Web server started on port %d\n", WEB_SERVER_PORT);

    return true;
}

void BoardWebServer::handleClient() {
    server.handleClient();
}

void BoardWebServer::handleRoot() {
    server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    server.sendHeader("Pragma", "no-cache");
    server.sendHeader("Expires", "0");
    server.send(200, "text/html", getConfigPageHtml());
}

void BoardWebServer::handleGetStatus() {
    server.send(200, "application/json", getStatusJson());
}

void BoardWebServer::handlePostConfig() {
    if (!server.hasArg("plain")) {
        server.send(400, "application/json", "{\"error\":\"No body\"}");
        return;
    }

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, server.arg("plain"));

    if (error) {
        server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
        return;
    }

    // Update configuration
    bool needsReconnect = false;

    if (doc.containsKey("apiKey")) {
        String apiKey = doc["apiKey"].as<String>();
        if (apiKey.length() > 0) {
            configManager.setApiKey(apiKey);
            needsReconnect = true;
        }
    }

    if (doc.containsKey("sessionId")) {
        String sessionId = doc["sessionId"].as<String>();
        configManager.setSessionId(sessionId);
        wsClient.setSessionId(sessionId);
        needsReconnect = true;
    }

    if (doc.containsKey("backendUrl")) {
        String url = doc["backendUrl"].as<String>();
        if (url.length() > 0) {
            configManager.setBackendUrl(url);
            needsReconnect = true;
        }
    }

    if (doc.containsKey("ledPin")) {
        int pin = doc["ledPin"].as<int>();
        ledController.updateConfig(pin, -1);
    }

    if (doc.containsKey("ledCount")) {
        int count = doc["ledCount"].as<int>();
        ledController.updateConfig(-1, count);
    }

    if (doc.containsKey("brightness")) {
        int brightness = doc["brightness"].as<int>();
        ledController.setBrightness(brightness);
    }

    if (doc.containsKey("analyticsEnabled")) {
        bool enabled = doc["analyticsEnabled"].as<bool>();
        configManager.setAnalyticsEnabled(enabled);
    }

    // Start or reconnect WebSocket if needed
    if (needsReconnect) {
        if (wsClient.isConnected()) {
            wsClient.reconnect();
        } else if (configManager.hasApiKey() && configManager.getSessionId().length() > 0) {
            // First time connection after config
            Serial.println("[Web] Starting WebSocket connection with new config...");
            wsClient.begin();
        }
    }

    server.send(200, "application/json", "{\"success\":true}");
}

void BoardWebServer::handleTestLed() {
    ledController.testPattern();
    server.send(200, "application/json", "{\"success\":true}");
}

void BoardWebServer::handleReset() {
    server.send(200, "application/json", "{\"success\":true,\"message\":\"Resetting...\"}");
    delay(100);

    // Clear all settings
    configManager.factoryReset();
    boardWiFiManager.resetSettings();

    // Restart
    ESP.restart();
}

void BoardWebServer::handleNotFound() {
    server.send(404, "text/plain", "Not Found");
}

String BoardWebServer::getStatusJson() {
    JsonDocument doc;

    // WiFi status
    doc["wifi"]["connected"] = boardWiFiManager.isConnected();
    doc["wifi"]["ssid"] = WiFi.SSID();
    doc["wifi"]["ip"] = boardWiFiManager.getIPAddress();
    doc["wifi"]["rssi"] = boardWiFiManager.getSignalStrength();

    // WebSocket status
    doc["websocket"]["connected"] = wsClient.isConnected();
    doc["websocket"]["subscribed"] = wsClient.isSubscribed();
    doc["websocket"]["sessionId"] = wsClient.getSessionId();

    // BLE status
    doc["bluetooth"]["deviceConnected"] = bleServer.isConnected();

    // LED status
    doc["led"]["pin"] = ledController.getLedPin();
    doc["led"]["count"] = ledController.getLedCount();
    doc["led"]["brightness"] = ledController.getBrightness();
    doc["led"]["initialized"] = ledController.isInitialized();

    // Config status
    doc["config"]["hasApiKey"] = configManager.hasApiKey();
    doc["config"]["backendUrl"] = configManager.getBackendUrl();
    doc["config"]["analyticsEnabled"] = configManager.isAnalyticsEnabled();

    String output;
    serializeJson(doc, output);
    return output;
}

String BoardWebServer::getConfigPageHtml() {
    String html = R"html(
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BoardSesh Controller</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            color: #eee;
            padding: 20px;
            max-width: 600px;
            margin: 0 auto;
        }
        h1 { color: #00d9ff; margin-bottom: 20px; }
        h2 { color: #00d9ff; margin: 20px 0 10px; font-size: 1.1em; }
        .card {
            background: #16213e;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .status-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #0f3460;
        }
        .status-row:last-child { border-bottom: none; }
        .status-label { color: #888; }
        .status-value { font-weight: 500; }
        .status-ok { color: #4ade80; }
        .status-error { color: #f87171; }
        label { display: block; margin-bottom: 5px; color: #888; font-size: 0.9em; }
        input, select {
            width: 100%;
            padding: 10px;
            border: 1px solid #0f3460;
            border-radius: 4px;
            background: #0f3460;
            color: #eee;
            margin-bottom: 15px;
            font-size: 16px;
        }
        input:focus { outline: none; border-color: #00d9ff; }
        .checkbox-row {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
        }
        .checkbox-row input[type="checkbox"] {
            width: auto;
            margin-right: 10px;
            margin-bottom: 0;
        }
        .checkbox-row label {
            margin-bottom: 0;
            color: #eee;
        }
        button {
            background: #00d9ff;
            color: #1a1a2e;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            font-size: 16px;
            width: 100%;
            margin-bottom: 10px;
        }
        button:hover { background: #00b8d9; }
        button.secondary {
            background: #0f3460;
            color: #eee;
        }
        button.danger {
            background: #dc2626;
            color: #fff;
        }
        .info { font-size: 0.85em; color: #666; margin-top: -10px; margin-bottom: 15px; }
        .message {
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 15px;
            display: none;
        }
        .message.success { background: #166534; display: block; }
        .message.error { background: #991b1b; display: block; }
    </style>
</head>
<body>
    <h1>BoardSesh Controller</h1>

    <div id="message" class="message"></div>

    <div class="card">
        <h2>Status</h2>
        <div id="status">Loading...</div>
    </div>

    <div class="card">
        <h2>Configuration</h2>
        <form id="configForm">
            <label for="apiKey">API Key</label>
            <input type="password" id="apiKey" name="apiKey" placeholder="Enter your BoardSesh API key">
            <p class="info">Get your API key from BoardSesh settings</p>

            <label for="sessionId">Session ID</label>
            <input type="text" id="sessionId" name="sessionId" placeholder="Enter session ID to connect to">

            <label for="backendUrl">Backend URL</label>
            <input type="text" id="backendUrl" name="backendUrl" value=")html";
    html += DEFAULT_BACKEND_URL;
    html += R"html(">

            <label for="ledCount">LED Count</label>
            <input type="number" id="ledCount" name="ledCount" min="1" max="500" value=")html";
    html += String(configManager.getLedCount());
    html += R"html(">

            <label for="brightness">Brightness (0-255)</label>
            <input type="number" id="brightness" name="brightness" min="0" max="255" value=")html";
    html += String(configManager.getBrightness());
    html += R"html(">

            <div class="checkbox-row">
                <input type="checkbox" id="analyticsEnabled" name="analyticsEnabled")html";
    if (configManager.isAnalyticsEnabled()) {
        html += " checked";
    }
    html += R"html(>
                <label for="analyticsEnabled">Send diagnostic logs to BoardSesh</label>
            </div>
            <p class="info">Helps improve the controller by sending anonymous usage data</p>

            <button type="submit">Save Configuration</button>
        </form>
    </div>

    <div class="card">
        <h2>Actions</h2>
        <button class="secondary" onclick="testLeds()">Test LEDs</button>
        <button class="danger" onclick="factoryReset()">Factory Reset</button>
    </div>

    <script>
        let initialLoadDone = false;

        async function loadStatus() {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                const statusHtml = `
                    <div class="status-row">
                        <span class="status-label">WiFi</span>
                        <span class="status-value ${data.wifi.connected ? 'status-ok' : 'status-error'}">
                            ${data.wifi.connected ? 'Connected (' + data.wifi.ip + ')' : 'Disconnected'}
                        </span>
                    </div>
                    <div class="status-row">
                        <span class="status-label">WebSocket</span>
                        <span class="status-value ${data.websocket.subscribed ? 'status-ok' : 'status-error'}">
                            ${data.websocket.subscribed ? 'Subscribed' : data.websocket.connected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                    <div class="status-row">
                        <span class="status-label">Bluetooth</span>
                        <span class="status-value ${data.bluetooth.deviceConnected ? 'status-ok' : ''}">
                            ${data.bluetooth.deviceConnected ? 'Device Connected' : 'Waiting for connection'}
                        </span>
                    </div>
                    <div class="status-row">
                        <span class="status-label">LEDs</span>
                        <span class="status-value">${data.led.count} @ pin ${data.led.pin}</span>
                    </div>
                    <div class="status-row">
                        <span class="status-label">API Key</span>
                        <span class="status-value ${data.config.hasApiKey ? 'status-ok' : 'status-error'}">
                            ${data.config.hasApiKey ? 'Configured' : 'Not Set'}
                        </span>
                    </div>
                `;
                document.getElementById('status').innerHTML = statusHtml;

                // Only update form fields on initial load to avoid overwriting user input
                if (!initialLoadDone) {
                    if (data.websocket.sessionId) {
                        document.getElementById('sessionId').value = data.websocket.sessionId;
                    }
                    if (data.config.backendUrl) {
                        document.getElementById('backendUrl').value = data.config.backendUrl;
                    }
                    document.getElementById('ledCount').value = data.led.count;
                    document.getElementById('brightness').value = data.led.brightness;
                    document.getElementById('analyticsEnabled').checked = data.config.analyticsEnabled;
                    initialLoadDone = true;
                }
            } catch (e) {
                document.getElementById('status').innerHTML = '<span class="status-error">Failed to load status</span>';
            }
        }

        function showMessage(text, isError = false) {
            const msg = document.getElementById('message');
            msg.textContent = text;
            msg.className = 'message ' + (isError ? 'error' : 'success');
            setTimeout(() => msg.className = 'message', 3000);
        }

        document.getElementById('configForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {};
            formData.forEach((v, k) => { if (v) data[k] = v; });
            // Handle checkbox explicitly (not included in FormData when unchecked)
            data.analyticsEnabled = document.getElementById('analyticsEnabled').checked;

            try {
                const res = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    showMessage('Configuration saved!');
                    initialLoadDone = false;  // Allow form fields to update with saved values
                    loadStatus();
                } else {
                    showMessage('Failed to save', true);
                }
            } catch (e) {
                showMessage('Error: ' + e.message, true);
            }
        });

        async function testLeds() {
            try {
                await fetch('/api/test-led', { method: 'POST' });
                showMessage('Running LED test...');
            } catch (e) {
                showMessage('Error: ' + e.message, true);
            }
        }

        async function factoryReset() {
            if (!confirm('This will erase all settings and restart the controller. Continue?')) return;
            try {
                await fetch('/api/reset', { method: 'POST' });
                showMessage('Resetting... Device will restart.');
            } catch (e) {
                showMessage('Error: ' + e.message, true);
            }
        }

        // Load status on page load and refresh every 5 seconds
        loadStatus();
        setInterval(loadStatus, 5000);
    </script>
</body>
</html>
)html";

    return html;
}
