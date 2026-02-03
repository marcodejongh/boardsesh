#include "ble_proxy.h"
#include <log_buffer.h>
#include <config_manager.h>

BLEProxy Proxy;

// Static instance pointer for callbacks
static BLEProxy* proxyInstance = nullptr;

// Static callback wrappers
static void onBoardConnectedStatic(bool connected) {
    if (proxyInstance) {
        proxyInstance->handleBoardConnected(connected);
    }
}

static void onBoardDataStatic(const uint8_t* data, size_t len) {
    if (proxyInstance) {
        proxyInstance->handleBoardData(data, len);
    }
}

static void onScanCompleteStatic(const std::vector<DiscoveredBoard>& boards) {
    if (proxyInstance) {
        proxyInstance->handleScanComplete(boards);
    }
}

BLEProxy::BLEProxy()
    : state(BLEProxyState::PROXY_DISABLED)
    , enabled(false)
    , scanStartTime(0)
    , reconnectDelay(5000)
    , stateCallback(nullptr)
    , dataCallback(nullptr)
    , sendToAppCallback(nullptr) {
    proxyInstance = this;
}

void BLEProxy::begin(const String& mac) {
    targetMac = mac;

    // Load enabled state from config
    enabled = Config.getBool("proxy_en", false);

    if (enabled) {
        Logger.logln("BLEProxy: Proxy mode enabled");
        setState(BLEProxyState::IDLE);

        // Set up callbacks for the board client
        BoardClient.setConnectCallback(onBoardConnectedStatic);
        BoardClient.setDataCallback(onBoardDataStatic);
    } else {
        Logger.logln("BLEProxy: Proxy mode disabled");
        setState(BLEProxyState::PROXY_DISABLED);
    }
}

void BLEProxy::setEnabled(bool enable) {
    if (enabled == enable) return;

    enabled = enable;
    Config.setBool("proxy_en", enable);

    if (enable) {
        Logger.logln("BLEProxy: Enabling proxy mode");
        setState(BLEProxyState::IDLE);

        BoardClient.setConnectCallback(onBoardConnectedStatic);
        BoardClient.setDataCallback(onBoardDataStatic);
    } else {
        Logger.logln("BLEProxy: Disabling proxy mode");
        BoardClient.disconnect();
        Scanner.stopScan();
        setState(BLEProxyState::PROXY_DISABLED);
    }
}

bool BLEProxy::isEnabled() const {
    return enabled;
}

void BLEProxy::loop() {
    if (!enabled) return;

    switch (state) {
        case BLEProxyState::IDLE:
            // Start scanning for boards
            startScan();
            break;

        case BLEProxyState::SCANNING:
            // Handled by scanner callbacks
            break;

        case BLEProxyState::CONNECTING:
            // Handled by client callbacks
            break;

        case BLEProxyState::CONNECTED:
            BoardClient.loop();
            break;

        case BLEProxyState::RECONNECTING:
            BoardClient.loop();
            break;

        default:
            break;
    }
}

BLEProxyState BLEProxy::getState() const {
    return state;
}

bool BLEProxy::isConnectedToBoard() const {
    return state == BLEProxyState::CONNECTED && BoardClient.isConnected();
}

String BLEProxy::getConnectedBoardAddress() const {
    return BoardClient.getConnectedAddress();
}

void BLEProxy::setStateCallback(ProxyStateCallback callback) {
    stateCallback = callback;
}

void BLEProxy::setDataCallback(ProxyDataCallback callback) {
    dataCallback = callback;
}

void BLEProxy::setSendToAppCallback(ProxySendToAppCallback callback) {
    sendToAppCallback = callback;
}

bool BLEProxy::forwardToBoard(const uint8_t* data, size_t len) {
    if (!isConnectedToBoard()) {
        return false;
    }

    if (dataCallback) {
        dataCallback(data, len, true);  // fromApp = true
    }

    return BoardClient.send(data, len);
}

void BLEProxy::forwardToApp(const uint8_t* data, size_t len) {
    if (dataCallback) {
        dataCallback(data, len, false);  // fromApp = false
    }

    // Forward to connected app via BLE server
    if (sendToAppCallback) {
        sendToAppCallback(data, len);
    }
}

void BLEProxy::setState(BLEProxyState newState) {
    if (state != newState) {
        Logger.logln("BLEProxy: State %d -> %d", (int)state, (int)newState);
        state = newState;
        if (stateCallback) {
            stateCallback(state);
        }
    }
}

void BLEProxy::startScan() {
    setState(BLEProxyState::SCANNING);
    scanStartTime = millis();

    Scanner.startScan(nullptr, onScanCompleteStatic, 30);
}

void BLEProxy::handleScanComplete(const std::vector<DiscoveredBoard>& boards) {
    if (boards.empty()) {
        Logger.logln("BLEProxy: No boards found, will retry");
        setState(BLEProxyState::IDLE);
        return;
    }

    const DiscoveredBoard* target = nullptr;

    // If we have a target MAC, find it
    if (targetMac.length() > 0) {
        target = Scanner.findByAddress(targetMac);
        if (!target) {
            Logger.logln("BLEProxy: Target MAC %s not found", targetMac.c_str());
        }
    }

    // Otherwise, use the strongest signal
    if (!target) {
        target = Scanner.getBestBoard();
    }

    if (target) {
        Logger.logln("BLEProxy: Connecting to %s (%s)",
                      target->name.c_str(), target->address.toString().c_str());
        setState(BLEProxyState::CONNECTING);
        BoardClient.connect(target->address);
    } else {
        setState(BLEProxyState::IDLE);
    }
}

void BLEProxy::handleBoardConnected(bool connected) {
    if (connected) {
        Logger.logln("BLEProxy: Connected to board");
        setState(BLEProxyState::CONNECTED);
    } else {
        Logger.logln("BLEProxy: Board disconnected");
        setState(BLEProxyState::RECONNECTING);
    }
}

void BLEProxy::handleBoardData(const uint8_t* data, size_t len) {
    // Forward data from board to app
    forwardToApp(data, len);
}
