#ifndef WIFI_UTILS_H
#define WIFI_UTILS_H

#include <Arduino.h>
#include <WiFi.h>
#include <config_manager.h>

#define WIFI_CONNECT_TIMEOUT_MS 30000
#define WIFI_RECONNECT_INTERVAL_MS 5000

enum class WiFiConnectionState {
    DISCONNECTED,
    CONNECTING,
    CONNECTED,
    CONNECTION_FAILED,
    AP_MODE
};

typedef void (*WiFiStateCallback)(WiFiConnectionState state);

class WiFiUtils {
public:
    WiFiUtils();

    void begin();
    void loop();

    bool connect(const char* ssid, const char* password, bool save = true);
    bool connectSaved();
    void disconnect();

    bool isConnected();
    WiFiConnectionState getState();

    String getSSID();
    String getIP();
    int8_t getRSSI();

    // AP mode for first-time setup
    bool startAP(const char* apName, const char* password = nullptr);
    void stopAP();
    bool isAPMode();
    String getAPIP();

    void setStateCallback(WiFiStateCallback callback);

    // Config keys
    static const char* KEY_SSID;
    static const char* KEY_PASSWORD;

private:
    WiFiConnectionState state;
    WiFiStateCallback stateCallback;
    unsigned long connectStartTime;
    unsigned long lastReconnectAttempt;
    String currentSSID;
    String currentPassword;
    bool apModeActive;

    void setState(WiFiConnectionState newState);
    void checkConnection();
};

extern WiFiUtils WiFiMgr;

#endif
