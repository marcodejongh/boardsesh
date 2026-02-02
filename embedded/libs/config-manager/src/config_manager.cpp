#include "config_manager.h"

ConfigManager Config;

ConfigManager::ConfigManager() : opened(false) {}

void ConfigManager::begin() {
    if (!opened) {
        prefs.begin(CONFIG_NAMESPACE, false);
        opened = true;
    }
}

void ConfigManager::end() {
    if (opened) {
        prefs.end();
        opened = false;
    }
}

String ConfigManager::getString(const char* key, const String& defaultValue) {
    begin();
    return prefs.getString(key, defaultValue);
}

void ConfigManager::setString(const char* key, const String& value) {
    begin();
    prefs.putString(key, value);
}

int32_t ConfigManager::getInt(const char* key, int32_t defaultValue) {
    begin();
    return prefs.getInt(key, defaultValue);
}

void ConfigManager::setInt(const char* key, int32_t value) {
    begin();
    prefs.putInt(key, value);
}

bool ConfigManager::getBool(const char* key, bool defaultValue) {
    begin();
    return prefs.getBool(key, defaultValue);
}

void ConfigManager::setBool(const char* key, bool value) {
    begin();
    prefs.putBool(key, value);
}

size_t ConfigManager::getBytes(const char* key, uint8_t* buffer, size_t maxLen) {
    begin();
    return prefs.getBytes(key, buffer, maxLen);
}

void ConfigManager::setBytes(const char* key, const uint8_t* buffer, size_t len) {
    begin();
    prefs.putBytes(key, buffer, len);
}

void ConfigManager::clear() {
    begin();
    prefs.clear();
}

bool ConfigManager::hasKey(const char* key) {
    begin();
    return prefs.isKey(key);
}

void ConfigManager::remove(const char* key) {
    begin();
    prefs.remove(key);
}
