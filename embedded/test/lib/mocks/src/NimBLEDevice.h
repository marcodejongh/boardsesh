/**
 * NimBLE Mock Header for Native Unit Testing
 *
 * Provides a mock NimBLE library implementation to simulate BLE functionality
 * for testing Nordic UART BLE code.
 */

#ifndef NIMBLEDEVICE_MOCK_H
#define NIMBLEDEVICE_MOCK_H

#include "Arduino.h"

#include <cstdint>
#include <functional>
#include <string>
#include <vector>

// Power levels
#define ESP_PWR_LVL_P9 9

// Connection handle constant
#define BLE_HS_CONN_HANDLE_NONE 0xFFFF

// Characteristic properties - using namespace to match real NimBLE API
namespace NIMBLE_PROPERTY {
constexpr uint32_t READ = 0x02;
constexpr uint32_t WRITE_NR = 0x04;
constexpr uint32_t WRITE = 0x08;
constexpr uint32_t NOTIFY = 0x10;
constexpr uint32_t INDICATE = 0x20;
}  // namespace NIMBLE_PROPERTY

// Max connections config
#define CONFIG_BT_NIMBLE_MAX_CONNECTIONS 3

// BLE gap connection descriptor
struct ble_gap_conn_desc {
    uint16_t conn_handle;
    uint8_t peer_ota_addr[6];
    uint8_t peer_id_addr[6];
    uint8_t our_id_addr[6];
    uint8_t our_ota_addr[6];
    uint8_t role;
    uint8_t encrypted;
    uint8_t authenticated;
    uint8_t bonded;
    uint8_t key_size;
};

// Forward declarations
class NimBLEServer;
class NimBLEService;
class NimBLECharacteristic;
class NimBLEAdvertising;

// NimBLEAddress class
class NimBLEAddress {
  public:
    NimBLEAddress() : addr_{0} {}
    NimBLEAddress(const uint8_t* addr) {
        if (addr)
            memcpy(addr_, addr, 6);
    }

    std::string toString() const {
        char buf[18];
        snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X", addr_[5], addr_[4], addr_[3], addr_[2], addr_[1],
                 addr_[0]);
        return std::string(buf);
    }

  private:
    uint8_t addr_[6];
};

// Callbacks interfaces
class NimBLEServerCallbacks {
  public:
    virtual ~NimBLEServerCallbacks() {}
    virtual void onConnect(NimBLEServer* pServer, ble_gap_conn_desc* desc) {}
    virtual void onDisconnect(NimBLEServer* pServer, ble_gap_conn_desc* desc) {}
};

class NimBLECharacteristicCallbacks {
  public:
    virtual ~NimBLECharacteristicCallbacks() {}
    virtual void onWrite(NimBLECharacteristic* pCharacteristic) {}
    virtual void onRead(NimBLECharacteristic* pCharacteristic) {}
};

// NimBLECharacteristic
class NimBLECharacteristic {
  public:
    NimBLECharacteristic(const char* uuid, uint32_t properties)
        : uuid_(uuid ? uuid : ""), properties_(properties), callbacks_(nullptr) {}

    void setCallbacks(NimBLECharacteristicCallbacks* callbacks) { callbacks_ = callbacks; }

    void setValue(const uint8_t* data, size_t len) { value_.assign(data, data + len); }

    void setValue(const std::string& value) { value_.assign(value.begin(), value.end()); }

    std::string getValue() const { return std::string(value_.begin(), value_.end()); }

    void notify() { notifyCount_++; }

    // Test helpers
    const std::string& getUUID() const { return uuid_; }
    uint32_t getProperties() const { return properties_; }
    NimBLECharacteristicCallbacks* getCallbacks() const { return callbacks_; }
    int getNotifyCount() const { return notifyCount_; }
    void mockWrite(const std::string& data) {
        value_.assign(data.begin(), data.end());
        if (callbacks_)
            callbacks_->onWrite(this);
    }
    void mockWrite(const uint8_t* data, size_t len) {
        value_.assign(data, data + len);
        if (callbacks_)
            callbacks_->onWrite(this);
    }

  private:
    std::string uuid_;
    uint32_t properties_;
    NimBLECharacteristicCallbacks* callbacks_;
    std::vector<uint8_t> value_;
    int notifyCount_ = 0;
};

// NimBLEService
class NimBLEService {
  public:
    NimBLEService(const char* uuid) : uuid_(uuid ? uuid : "") {}

    NimBLECharacteristic* createCharacteristic(const char* uuid, uint32_t properties) {
        characteristics_.push_back(new NimBLECharacteristic(uuid, properties));
        return characteristics_.back();
    }

    void start() { started_ = true; }

    NimBLECharacteristic* getCharacteristic(const char* uuid) {
        for (auto* c : characteristics_) {
            if (c->getUUID() == uuid)
                return c;
        }
        return nullptr;
    }

    const std::string& getUUID() const { return uuid_; }
    bool isStarted() const { return started_; }

    ~NimBLEService() {
        for (auto* c : characteristics_)
            delete c;
    }

  private:
    std::string uuid_;
    std::vector<NimBLECharacteristic*> characteristics_;
    bool started_ = false;
};

// NimBLEAdvertising
class NimBLEAdvertising {
  public:
    void addServiceUUID(const char* uuid) { serviceUUIDs_.push_back(uuid ? uuid : ""); }

    void setScanResponse(bool enable) { scanResponse_ = enable; }

    void setMinPreferred(uint8_t minInterval) { minInterval_ = minInterval; }

    void setMaxPreferred(uint8_t maxInterval) { maxInterval_ = maxInterval; }

    void start() {
        advertising_ = true;
        startCount_++;
    }

    void stop() { advertising_ = false; }

    // Test helpers
    bool isAdvertising() const { return advertising_; }
    const std::vector<std::string>& getServiceUUIDs() const { return serviceUUIDs_; }
    int getStartCount() const { return startCount_; }
    void mockReset() {
        advertising_ = false;
        startCount_ = 0;
        serviceUUIDs_.clear();
    }

  private:
    bool advertising_ = false;
    bool scanResponse_ = false;
    uint8_t minInterval_ = 0;
    uint8_t maxInterval_ = 0;
    std::vector<std::string> serviceUUIDs_;
    int startCount_ = 0;
};

// NimBLEServer
class NimBLEServer {
  public:
    NimBLEServer() : callbacks_(nullptr), connectedCount_(0), started_(false) {}

    void setCallbacks(NimBLEServerCallbacks* callbacks) { callbacks_ = callbacks; }

    void start() { started_ = true; }

    NimBLEService* createService(const char* uuid) {
        services_.push_back(new NimBLEService(uuid));
        return services_.back();
    }

    NimBLEService* getServiceByUUID(const char* uuid) {
        for (auto* s : services_) {
            if (s->getUUID() == uuid)
                return s;
        }
        return nullptr;
    }

    int getConnectedCount() const { return connectedCount_; }

    void disconnect(uint16_t connHandle) {
        disconnectedHandle_ = connHandle;
        if (connectedCount_ > 0)
            connectedCount_--;
    }

    // Test helpers
    NimBLEServerCallbacks* getCallbacks() const { return callbacks_; }
    uint16_t getDisconnectedHandle() const { return disconnectedHandle_; }

    void mockConnect(ble_gap_conn_desc* desc) {
        connectedCount_++;
        if (callbacks_)
            callbacks_->onConnect(this, desc);
    }

    void mockDisconnect(ble_gap_conn_desc* desc) {
        if (connectedCount_ > 0)
            connectedCount_--;
        if (callbacks_)
            callbacks_->onDisconnect(this, desc);
    }

    ~NimBLEServer() {
        for (auto* s : services_)
            delete s;
    }

  private:
    NimBLEServerCallbacks* callbacks_;
    std::vector<NimBLEService*> services_;
    int connectedCount_;
    bool started_;
    uint16_t disconnectedHandle_ = BLE_HS_CONN_HANDLE_NONE;
};

// NimBLEDevice static class
class NimBLEDevice {
  public:
    static void init(const char* deviceName) {
        deviceName_ = deviceName ? deviceName : "";
        initialized_ = true;
    }

    static void deinit() {
        initialized_ = false;
        delete server_;
        server_ = nullptr;
    }

    static void setPower(int power) { power_ = power; }

    static NimBLEServer* createServer() {
        if (!server_)
            server_ = new NimBLEServer();
        return server_;
    }

    static NimBLEServer* getServer() { return server_; }

    static NimBLEAdvertising* getAdvertising() { return &advertising_; }

    // Test helpers
    static const std::string& getDeviceName() { return deviceName_; }
    static bool isInitialized() { return initialized_; }
    static int getPower() { return power_; }

    static void mockReset() {
        initialized_ = false;
        deviceName_ = "";
        power_ = 0;
        delete server_;
        server_ = nullptr;
        advertising_.mockReset();
    }

  private:
    static bool initialized_;
    static std::string deviceName_;
    static int power_;
    static NimBLEServer* server_;
    static NimBLEAdvertising advertising_;
};

// Static member definitions
inline bool NimBLEDevice::initialized_ = false;
inline std::string NimBLEDevice::deviceName_ = "";
inline int NimBLEDevice::power_ = 0;
inline NimBLEServer* NimBLEDevice::server_ = nullptr;
inline NimBLEAdvertising NimBLEDevice::advertising_;

#endif  // NIMBLEDEVICE_MOCK_H
