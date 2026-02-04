#ifndef CONFIG_MANAGER_H
#define CONFIG_MANAGER_H

#include <Arduino.h>
#include <Preferences.h>

#define CONFIG_NAMESPACE "boardsesh"

class ConfigManager {
  public:
    ConfigManager();

    void begin();
    void end();

    // String values
    String getString(const char* key, const String& defaultValue = "");
    void setString(const char* key, const String& value);

    // Integer values
    int32_t getInt(const char* key, int32_t defaultValue = 0);
    void setInt(const char* key, int32_t value);

    // Boolean values
    bool getBool(const char* key, bool defaultValue = false);
    void setBool(const char* key, bool value);

    // Byte arrays
    size_t getBytes(const char* key, uint8_t* buffer, size_t maxLen);
    void setBytes(const char* key, const uint8_t* buffer, size_t len);

    // Clear all config
    void clear();

    // Check if key exists
    bool hasKey(const char* key);

    // Remove single key
    void remove(const char* key);

  private:
    Preferences prefs;
    bool opened;
};

extern ConfigManager Config;

#endif
