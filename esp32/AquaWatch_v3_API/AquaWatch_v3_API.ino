// ============================================================
//  Water Level Monitor — v3 (API Integrated)
//  Hardware : ESP32 DevKit V1 + JSN-SR04T
//             LEDs on GPIO25/26/27, Buzzer on GPIO14
//             (via BC547 transistor)
//  Changes  : Integrated with Laravel API for dynamic 
//             thresholds and real-time dashboard updates!
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ---- NETWORK CONFIG ----------------------------------------
const char* ssid = "WNFTTHHONEYTAN-2.4G";
const char* password = "scarlette*07";
const char* apiUrl = "http://192.168.1.22:8000/api";  // UPDATE THIS to your PC's IP
const char* deviceCode = "DEV-001"; // Update to match your DB
const char* bearerToken = "17|ERphFehQNKONuOVAobxSLOrt7xSdlTpcsS2judYyc7f72f56";

// ---- PINS --------------------------------------------------
const int TRIG_PIN   = 5;
const int ECHO_PIN   = 18;
const int GREEN_LED  = 25;
const int YELLOW_LED = 26;
const int RED_LED    = 27;
const int BUZZER     = 14;

// ---- SENSOR CONFIG -----------------------------------------
const float MAX_VALID_DISTANCE = 350.0;
const float MAX_JUMP           = 40.0;

// ---- DYNAMIC THRESHOLDS (Loaded from API) ------------------
float sensorHeightCm = 300.0;
float safeDistance = 105.0;     // (calculated from warning level %)
float warningDistance = 45.0;   // (calculated from critical level %)
bool apiBuzzerEnabled = true;

// ---- DEBOUNCE ----------------------------------------------
const int REQUIRED_READINGS = 3;

// ---- BUZZER PATTERN ----------------------------------------
const int BEEP_ON_MS  = 200;
const int BEEP_OFF_MS = 300;
const int BEEP_COUNT  = 3;

// ---- ADAPTIVE POLLING --------------------------------------
const unsigned long INTERVAL_SAFE     = 5000;
const unsigned long INTERVAL_WARNING  = 3000;
const unsigned long INTERVAL_CRITICAL = 1000;

// ---- GLOBALS -----------------------------------------------
float         lastValidDistance = -1;
unsigned long lastReadTime      = 0;
unsigned long lastBuzzerTime    = 0;
unsigned long lastSettingsSync  = 0;
int           buzzerBeepsDone   = 0;
bool          buzzerOn          = false;
int           stableCounter     = 0;

enum Status { SAFE, WARNING, CRITICAL };
Status currentStatus = SAFE;
Status pendingStatus = SAFE;

// ============================================================
//  API FUNCTIONS
// ============================================================
void connectToWiFi() {
  Serial.print("[WIFI] Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WIFI] Connected! IP: " + WiFi.localIP().toString());
}

void fetchSettings() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(apiUrl) + "/settings";
  http.begin(url);
  http.addHeader("Accept", "application/json");
  
  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      sensorHeightCm = doc["settings"]["sensor_height_cm"];
      float warnPct = doc["settings"]["warning_level_percent"];
      float critPct = doc["settings"]["critical_level_percent"];
      apiBuzzerEnabled = doc["settings"]["buzzer_enabled"];
      
      // Calculate threshold distances (Distance from sensor to water)
      // e.g. Height 300cm, Warn 65% -> Water is 195cm deep -> Distance is 105cm
      safeDistance = sensorHeightCm - (sensorHeightCm * (warnPct / 100.0));
      warningDistance = sensorHeightCm - (sensorHeightCm * (critPct / 100.0));

      Serial.println("\n--- API Settings Applied ---");
      Serial.printf("Sensor Height: %.1f cm\n", sensorHeightCm);
      Serial.printf("Warning threshold distance: < %.1f cm (%.0f%%)\n", safeDistance, warnPct);
      Serial.printf("Critical threshold distance: < %.1f cm (%.0f%%)\n", warningDistance, critPct);
      Serial.printf("Buzzer Enabled: %s\n", apiBuzzerEnabled ? "Yes" : "No");
      Serial.println("----------------------------\n");
    }
  }
  http.end();
}

void postReading(float distance) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  // Calculate water level % (clamped 0-100)
  float waterLevelPercent = ((sensorHeightCm - distance) / sensorHeightCm) * 100.0;
  if (waterLevelPercent < 0) waterLevelPercent = 0;
  if (waterLevelPercent > 100) waterLevelPercent = 100;

  HTTPClient http;
  String url = String(apiUrl) + "/sensor-readings";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  http.addHeader("Authorization", "Bearer " + String(bearerToken));

  // Build JSON payload manually
  String payload = "{\"device_code\":\"" + String(deviceCode) + "\"," +
                   "\"distance_cm\":" + String(distance, 1) + "," +
                   "\"water_level_percent\":" + String(waterLevelPercent, 1) + "}";

  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    Serial.printf("[API] Posted data successfully (HTTP %d)\n", httpCode);
  } else {
    Serial.printf("[API] POST Error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

// ============================================================
//  READ DISTANCE — median of 5 samples
// ============================================================
float readDistance() {
  float readings[5];
  int   validCount = 0;

  for (int i = 0; i < 5; i++) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 40000);

    if (duration == 0) {
      delay(20);
      continue;
    }

    readings[validCount] = duration * 0.0343 / 2.0;
    validCount++;
    delay(20);
  }

  if (validCount < 3) return -1;

  for (int i = 0; i < validCount - 1; i++) {
    for (int j = i + 1; j < validCount; j++) {
      if (readings[j] < readings[i]) {
        float tmp   = readings[i];
        readings[i] = readings[j];
        readings[j] = tmp;
      }
    }
  }

  return readings[validCount / 2];
}

// ============================================================
//  STARTUP TEST
// ============================================================
void startupTest() {
  Serial.println("[TEST] Running hardware test...");

  int leds[] = { GREEN_LED, YELLOW_LED, RED_LED };
  for (int i = 0; i < 3; i++) {
    digitalWrite(leds[i], HIGH);
    delay(300);
    digitalWrite(leds[i], LOW);
  }

  digitalWrite(BUZZER, HIGH);
  delay(200);
  digitalWrite(BUZZER, LOW);

  Serial.println("[TEST] Startup test done.");
}

// ============================================================
//  APPLY STATUS
// ============================================================
void applyStatus(Status status) {
  digitalWrite(GREEN_LED,  LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED,    LOW);
  digitalWrite(BUZZER,     LOW);

  lastBuzzerTime  = 0;
  buzzerBeepsDone = 0;
  buzzerOn        = false;

  switch (status) {
    case SAFE:
      digitalWrite(GREEN_LED, HIGH);
      Serial.println(">>> Local Status Changed: SAFE");
      break;
    case WARNING:
      digitalWrite(YELLOW_LED, HIGH);
      Serial.println(">>> Local Status Changed: WARNING");
      break;
    case CRITICAL:
      digitalWrite(RED_LED, HIGH);
      Serial.println(">>> Local Status Changed: CRITICAL");
      break;
  }
}

// ============================================================
//  UPDATE BUZZER — non-blocking beep pattern
// ============================================================
void updateBuzzer() {
  if (currentStatus != CRITICAL || !apiBuzzerEnabled) {
    digitalWrite(BUZZER, LOW);
    return;
  }

  unsigned long now = millis();

  if (buzzerOn) {
    if (now - lastBuzzerTime >= BEEP_ON_MS) {
      digitalWrite(BUZZER, LOW);
      buzzerOn = false;
      buzzerBeepsDone++;
      lastBuzzerTime = now;
    }
  } else {
    if (buzzerBeepsDone >= BEEP_COUNT) {
      if (now - lastBuzzerTime >= 1500) {
        buzzerBeepsDone = 0;
        lastBuzzerTime  = now;
      }
    } else {
      if (now - lastBuzzerTime >= BEEP_OFF_MS) {
        digitalWrite(BUZZER, HIGH);
        buzzerOn       = true;
        lastBuzzerTime = now;
      }
    }
  }
}

// ============================================================
//  GET CURRENT INTERVAL based on status
// ============================================================
unsigned long getInterval() {
  switch (currentStatus) {
    case WARNING:  return INTERVAL_WARNING;
    case CRITICAL: return INTERVAL_CRITICAL;
    default:       return INTERVAL_SAFE;
  }
}

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(TRIG_PIN,   OUTPUT);
  pinMode(ECHO_PIN,   INPUT);
  pinMode(GREEN_LED,  OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED,    OUTPUT);
  pinMode(BUZZER,     OUTPUT);

  digitalWrite(TRIG_PIN, LOW);

  Serial.println("============================================");
  Serial.println("  AquaWatch Node v3 (API Connected)");
  Serial.println("============================================");

  startupTest();
  connectToWiFi();
  
  // Pull thresholds from Laravel DB on boot
  fetchSettings();
  
  applyStatus(SAFE);
}

// ============================================================
//  MAIN LOOP
// ============================================================
void loop() {
  // 1. Maintain WiFi Connection
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  // 2. Sync settings from API every 60 seconds
  if (millis() - lastSettingsSync > 60000) {
    fetchSettings();
    lastSettingsSync = millis();
  }

  // 3. Buzzer runs every loop — non-blocking
  updateBuzzer();

  // 4. Adaptive interval check — only read when due
  if (millis() - lastReadTime < getInterval()) return;
  lastReadTime = millis();

  // 5. Read distance
  float distance = readDistance();

  if (distance < 0) {
    Serial.println("[SENSOR] No echo — keeping previous reading");
    return;
  }
  if (distance > MAX_VALID_DISTANCE) {
    Serial.println("[SENSOR] Out of range — ignored");
    return;
  }
  if (lastValidDistance > 0 && abs(distance - lastValidDistance) > MAX_JUMP) {
    Serial.printf("[SENSOR] Jump ignored: %.1f cm\n", distance);
    return;
  }
  lastValidDistance = distance;

  // 6. Determine Local Status based on API Thresholds
  Status newStatus;
  if (distance > safeDistance)
    newStatus = SAFE;
  else if (distance > warningDistance)
    newStatus = WARNING;
  else
    newStatus = CRITICAL;

  // 7. Debounce Status Changes
  if (newStatus == pendingStatus) {
    if (stableCounter < REQUIRED_READINGS) stableCounter++;
  } else {
    pendingStatus = newStatus;
    stableCounter = 1;
  }

  if (stableCounter >= REQUIRED_READINGS && currentStatus != pendingStatus) {
    currentStatus = pendingStatus;
    applyStatus(currentStatus);
  }

  // 8. Post to Laravel Dashboard
  postReading(distance);

  // Serial output
  Serial.printf("[DATA] Distance: %.1f cm | Status: ", distance);
  switch (currentStatus) {
    case SAFE:     Serial.print("SAFE");     break;
    case WARNING:  Serial.print("WARNING");  break;
    case CRITICAL: Serial.print("CRITICAL"); break;
  }
  Serial.printf(" | Stable: %d/%d | Next read in: %lu s\n", 
    stableCounter, REQUIRED_READINGS, getInterval() / 1000);
  Serial.println("----------------------------------------");
}
