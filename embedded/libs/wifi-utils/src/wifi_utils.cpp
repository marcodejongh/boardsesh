#include "wifi_utils.h"

WiFiUtils WiFiMgr;

const char* WiFiUtils::KEY_SSID = "wifi_ssid";
const char* WiFiUtils::KEY_PASSWORD = "wifi_pass";

WiFiUtils::WiFiUtils()
    : state(WiFiConnectionState::DISCONNECTED)
    , stateCallback(nullptr)
    , connectStartTime(0)
    , lastReconnectAttempt(0)
    , apModeActive(false) {}

void WiFiUtils::begin() {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
}

void WiFiUtils::loop() {
    checkConnection();
}

bool WiFiUtils::connect(const char* ssid, const char* password, bool save) {
    currentSSID = ssid;
    currentPassword = password;

    if (save) {
        Config.setString(KEY_SSID, ssid);
        Config.setString(KEY_PASSWORD, password);
    }

    WiFi.begin(ssid, password);
    connectStartTime = millis();
    setState(WiFiConnectionState::CONNECTING);

    return true;
}

bool WiFiUtils::connectSaved() {
    String ssid = Config.getString(KEY_SSID);
    String password = Config.getString(KEY_PASSWORD);

    if (ssid.length() == 0) {
        return false;
    }

    return connect(ssid.c_str(), password.c_str(), false);
}

void WiFiUtils::disconnect() {
    WiFi.disconnect();
    setState(WiFiConnectionState::DISCONNECTED);
}

bool WiFiUtils::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

WiFiConnectionState WiFiUtils::getState() {
    return state;
}

String WiFiUtils::getSSID() {
    return WiFi.SSID();
}

String WiFiUtils::getIP() {
    return WiFi.localIP().toString();
}

int8_t WiFiUtils::getRSSI() {
    return WiFi.RSSI();
}

void WiFiUtils::setStateCallback(WiFiStateCallback callback) {
    stateCallback = callback;
}

bool WiFiUtils::startAP(const char* apName, const char* password) {
    // Stop any existing connection
    WiFi.disconnect();

    // Configure AP mode
    WiFi.mode(WIFI_AP_STA);  // AP + STA mode allows web server while also trying to connect

    bool success;
    if (password && strlen(password) >= 8) {
        success = WiFi.softAP(apName, password);
    } else {
        success = WiFi.softAP(apName);
    }

    if (success) {
        apModeActive = true;
        setState(WiFiConnectionState::AP_MODE);
    }

    return success;
}

void WiFiUtils::stopAP() {
    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);
    apModeActive = false;

    // Return to disconnected state
    if (state == WiFiConnectionState::AP_MODE) {
        setState(WiFiConnectionState::DISCONNECTED);
    }
}

bool WiFiUtils::isAPMode() {
    return apModeActive;
}

String WiFiUtils::getAPIP() {
    return WiFi.softAPIP().toString();
}

void WiFiUtils::setState(WiFiConnectionState newState) {
    if (state != newState) {
        state = newState;
        if (stateCallback) {
            stateCallback(state);
        }
    }
}

void WiFiUtils::checkConnection() {
    // Skip connection checks if in AP mode only
    if (apModeActive && state == WiFiConnectionState::AP_MODE) {
        // Check if we've connected to a network while in AP mode
        if (WiFi.status() == WL_CONNECTED) {
            // Successfully connected - exit AP mode
            apModeActive = false;
            WiFi.softAPdisconnect(true);
            WiFi.mode(WIFI_STA);
            setState(WiFiConnectionState::CONNECTED);
        }
        return;
    }

    bool connected = WiFi.status() == WL_CONNECTED;

    switch (state) {
        case WiFiConnectionState::CONNECTING:
            if (connected) {
                setState(WiFiConnectionState::CONNECTED);
            } else if (millis() - connectStartTime > WIFI_CONNECT_TIMEOUT_MS) {
                setState(WiFiConnectionState::CONNECTION_FAILED);
            }
            break;

        case WiFiConnectionState::CONNECTED:
            if (!connected) {
                setState(WiFiConnectionState::DISCONNECTED);
                lastReconnectAttempt = millis();
            }
            break;

        case WiFiConnectionState::DISCONNECTED:
        case WiFiConnectionState::CONNECTION_FAILED:
            if (connected) {
                setState(WiFiConnectionState::CONNECTED);
            } else if (currentSSID.length() > 0 &&
                       millis() - lastReconnectAttempt > WIFI_RECONNECT_INTERVAL_MS) {
                connect(currentSSID.c_str(), currentPassword.c_str(), false);
            }
            break;

        case WiFiConnectionState::AP_MODE:
            // Handled above
            break;
    }
}
