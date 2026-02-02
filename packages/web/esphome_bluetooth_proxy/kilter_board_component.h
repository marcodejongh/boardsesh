// kilter_board_component.h
#pragma once

#include "esphome.h"
#include "esphome/core/component.h"
#include "esphome/components/esp32_ble_tracker/esp32_ble_tracker.h"
#include <sstream>
#include <vector>

using namespace esphome;

enum class HoldCode {
    START_42 = 42,
    HAND_43 = 43,
    FINISH_44 = 44,
    FOOT_45 = 45,
    START_12 = 12,
    HAND_13 = 13,
    FINISH_14 = 14,
    FOOT_15 = 15
};

static const char* SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
static const char* CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

static const uint8_t PACKET_MIDDLE = 81;
static const uint8_t PACKET_FIRST = 82;
static const uint8_t PACKET_LAST = 83;
static const uint8_t PACKET_ONLY = 84;
static const uint8_t MESSAGE_BODY_MAX_LENGTH = 255;
static const uint8_t MAX_BLUETOOTH_MESSAGE_SIZE = 20;

class KilterBoardComponent : public Component, public esp32_ble_tracker::ESPBTDeviceListener {
 public:
  bool parse_device(const esp32_ble_tracker::ESPBTDevice &device) override {
    ESP_LOGI("KilterBoard", "Scanning device: %s", device.address_str().c_str());
    for (auto uuid : device.get_service_uuids()) {
      ESP_LOGI("KilterBoard", "  Checking UUID: %s", uuid.to_string().c_str());
      if (uuid.to_string() == SERVICE_UUID) {
        ESP_LOGI("KilterBoard", "Found KilterBoard: %s", device.address_str().c_str());
        auto addr = device.address_uint64();
        if (!connected_) {
          connect_to_device(addr);
        }
        return true;
      }
    }
    return false;
  }
  KilterBoardComponent() {
    ESP_LOGI("KilterBoard", "Constructor called");
    climb_name_ = "Initializing...";
    difficulty_ = "None";
    connected_ = false;
  }

  void setup() override {
    ESP_LOGI("KilterBoard", "Setting up KilterBoard component...");
    climb_name_ = "Setup Complete";
    difficulty_ = "Ready";
  }

  float get_setup_priority() const override { 
    return setup_priority::LATE; 
  }

  void loop() override {
    static uint32_t last_log = 0;
    if (millis() - last_log > 5000) {
      ESP_LOGI("KilterBoard", "Component Status - Connected: %s, Climb: %s, Difficulty: %s",
               YESNO(connected_), climb_name_.c_str(), difficulty_.c_str());
      last_log = millis();
    }
  }

  void dump_config() override {
    ESP_LOGCONFIG("KilterBoard", "KilterBoard Component:");
    ESP_LOGCONFIG("KilterBoard", "  Connected: %s", YESNO(connected_));
    ESP_LOGCONFIG("KilterBoard", "  Current Climb: %s", climb_name_.c_str());
    ESP_LOGCONFIG("KilterBoard", "  Difficulty: %s", difficulty_.c_str());
  }

  void update_climb(std::string climb_name, std::string difficulty, std::string frames) {
    climb_name_ = climb_name;
    difficulty_ = difficulty;
    frames_ = frames;
    
    if (connected_) {
      send_frames_to_board();
    } else {
      ESP_LOGW("KilterBoard", "Not connected to board, cannot send frames");
    }
  }

  bool is_connected() const { return connected_; }
  std::string get_climb_name() const { return climb_name_; }
  std::string get_difficulty() const { return difficulty_; }

 protected:
  void connect_to_device(uint64_t address) {
    ESP_LOGI("KilterBoard", "Attempting to connect to device...");
    connected_ = true;  // Temporary for testing
  }

  void send_frames_to_board() {
    auto all_packets = parse_frames(frames_);
    for (const auto& packet : all_packets) {
      auto messages = split_messages(packet);
      for (const auto& message : messages) {
        if (!write_characteristic(message)) {
          ESP_LOGE("KilterBoard", "Failed to write characteristic");
          return;
        }
        delay(20);
      }
    }
  }

  bool write_characteristic(const std::vector<uint8_t>& data) {
    ESP_LOGI("KilterBoard", "Would write %d bytes", data.size());
    return true;
  }

  std::string get_color_for_role(uint16_t role) {
    switch (static_cast<HoldCode>(role)) {
        case HoldCode::START_42:
        case HoldCode::START_12:
            return "00DD00";  // Starting hold - Green
            
        case HoldCode::HAND_43:
        case HoldCode::HAND_13:
            return "00FFFF";  // Hand hold - Cyan
            
        case HoldCode::FINISH_44:
        case HoldCode::FINISH_14:
            return "FF00FF";  // Finish hold - Magenta
            
        case HoldCode::FOOT_45:
        case HoldCode::FOOT_15:
            return "FFAA00";  // Foot hold - Orange
            
        default:
            ESP_LOGW("KilterBoard", "Unknown hold role: %d", role);
            return "FFFFFF";  // Default to white if unknown role
    }
  }

  uint8_t calculate_checksum(const std::vector<uint8_t>& data) {
    uint8_t sum = 0;
    for (uint8_t value : data) {
      sum = (sum + value) & 0xFF;
    }
    return sum ^ 0xFF;
  }

  std::vector<uint8_t> wrap_bytes(const std::vector<uint8_t>& data) {
    if (data.size() > MESSAGE_BODY_MAX_LENGTH) {
      return std::vector<uint8_t>();
    }
    
    std::vector<uint8_t> wrapped;
    wrapped.push_back(1);
    wrapped.push_back(data.size());
    wrapped.push_back(calculate_checksum(data));
    wrapped.push_back(2);
    wrapped.insert(wrapped.end(), data.begin(), data.end());
    wrapped.push_back(3);
    
    return wrapped;
  }

  std::vector<uint8_t> encode_position(uint16_t position) {
    return {static_cast<uint8_t>(position & 0xFF), 
            static_cast<uint8_t>((position >> 8) & 0xFF)};
  }

  uint8_t encode_color(const std::string& hex_color) {
    uint8_t r = std::stoi(hex_color.substr(0, 2), nullptr, 16);
    uint8_t g = std::stoi(hex_color.substr(2, 2), nullptr, 16);
    uint8_t b = std::stoi(hex_color.substr(4, 2), nullptr, 16);
    
    uint8_t encoded = ((r / 32) << 5) | ((g / 32) << 2) | (b / 64);
    return encoded;
  }

  std::vector<uint8_t> encode_position_and_color(uint16_t position, const std::string& color) {
    auto pos = encode_position(position);
    pos.push_back(encode_color(color));
    return pos;
  }

  std::vector<std::vector<uint8_t>> parse_frames(const std::string& frames) {
    std::vector<std::vector<uint8_t>> result;
    std::vector<uint8_t> current_packet = {PACKET_MIDDLE};
    
    std::istringstream stream(frames);
    std::string frame;
    
    while (std::getline(stream, frame, 'p')) {
      if (frame.empty()) continue;
      
      size_t role_pos = frame.find('r');
      if (role_pos == std::string::npos) continue;
      
      uint16_t placement = std::stoi(frame.substr(0, role_pos));
      uint16_t role = std::stoi(frame.substr(role_pos + 1));
      
      std::string color = get_color_for_role(role);
      auto encoded_frame = encode_position_and_color(placement, color);
      
      if (current_packet.size() + encoded_frame.size() > MESSAGE_BODY_MAX_LENGTH) {
        result.push_back(current_packet);
        current_packet = {PACKET_MIDDLE};
      }
      
      current_packet.insert(current_packet.end(), encoded_frame.begin(), encoded_frame.end());
    }
    
    if (!current_packet.empty()) {
      result.push_back(current_packet);
    }
    
    if (result.size() == 1) {
      result[0][0] = PACKET_ONLY;
    } else if (result.size() > 1) {
      result[0][0] = PACKET_FIRST;
      result[result.size() - 1][0] = PACKET_LAST;
    }
    
    for (size_t i = 0; i < result.size(); i++) {
      result[i] = wrap_bytes(result[i]);
    }
    
    return result;
  }

  std::vector<std::vector<uint8_t>> split_messages(const std::vector<uint8_t>& buffer) {
    std::vector<std::vector<uint8_t>> messages;
    for (size_t i = 0; i < buffer.size(); i += MAX_BLUETOOTH_MESSAGE_SIZE) {
      std::vector<uint8_t> message(
        buffer.begin() + i,
        buffer.begin() + std::min(i + MAX_BLUETOOTH_MESSAGE_SIZE, buffer.size())
      );
      messages.push_back(message);
    }
    return messages;
  }

 private:
  std::string climb_name_;
  std::string difficulty_;
  std::string frames_;
  bool connected_{false};
};