// ============================================================
//  Water Level Monitor — v7 (API + Buttons + LCD + GSM SMS)
//  Hardware : ESP32 DevKit V1 + JSN-SR04T + SIM900A
//             LEDs on GPIO 2/4/16/32/33, Buzzer on GPIO 17
//             Silence GPIO39, LCD I2C GPIO21/22
//             GSM TX->GPIO25(RX2), GSM RX->GPIO26(TX2)
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

LiquidCrystal_I2C lcd(0x27, 16, 2);

const char* ssid        = "WNFTTHHONEYTAN-2.4G";
const char* password    = "scarlette*07";
const char* apiUrl      = "http://192.168.1.10:8000/api";
const char* deviceCode  = "DEV-001";
const char* bearerToken = "12|dL3jiKe5N9mqpA350d7GAJKMuoxNYZI3urURBYDf80cf0df7";

String smsTargetNumber = "+639972387323";

const int TRIG_PIN    = 5;
const int ECHO_PIN    = 18;
const int GREEN_LED   = 2;
const int YELLOW_LED  = 4;
const int RED_LED     = 16;
const int BUZZER      = 17;
const int POWER_LED   = 32;
const int WIFI_LED    = 33;
const int BTN_SILENCE = 39;
const int GSM_RX_PIN  = 25;
const int GSM_TX_PIN  = 26;

const float MIN_VALID_DISTANCE = 20.0;
const float MAX_VALID_DISTANCE = 350.0;
const float MAX_JUMP           = 40.0;

float sensorHeightCm  = 300.0;
float warningLevelCm  = 200.0;
float criticalLevelCm = 250.0;
bool  apiBuzzerEnabled = true;

const int BEEP_ON_MS  = 1000;  // 1 second long beep
const int BEEP_OFF_MS = 500;   // 0.5 second pause
const int BEEP_COUNT  = 3;

const unsigned long DEBOUNCE_MS = 200;
unsigned long lastSilenceTime   = 0;
unsigned long lastResetTime     = 0;

const int REQUIRED_READINGS = 3;

float         lastValidDistance = -1;
unsigned long lastReadTime      = 0;
unsigned long lastBuzzerTime    = 0;
unsigned long lastSettingsSync  = 0;
int           buzzerBeepsDone   = 0;
bool          buzzerOn          = false;
bool          buzzerSilenced    = false;
int           stableCounter     = 0;
bool          smsSentForCritical = false;
bool          gsmReady           = false;
bool          pendingRestart     = false;

enum Status { SAFE, WARNING, CRITICAL };
Status currentStatus = SAFE;
Status pendingStatus = SAFE;

// ============================================================
//  lcdPrint
// ============================================================
void lcdPrint(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

// ============================================================
//  sendATCommand (Helper)
// ============================================================
String sendATCommand(String command, const int timeout, boolean printDebug) {
  String response = "";
  Serial2.println(command);
  long int time = millis();
  
  while ((time + timeout) > millis()) {
    while (Serial2.available()) {
      char c = Serial2.read();
      response += c;
    }
  }
  if (printDebug) {
    Serial.print(response);
  }
  return response;
}

// ============================================================
//  initGSM
// ============================================================
void initGSM() {
  Serial2.begin(9600, SERIAL_8N1, GSM_RX_PIN, GSM_TX_PIN);
  delay(3000);

  Serial.println("[GSM] Initializing SIM900A...");
  lcdCentered("GSM Module", "Starting...");

  Serial.println("--- AT TEST ---");
  String res = sendATCommand("AT", 2000, true);
  if (res.indexOf("OK") != -1) {
    Serial.println("[GSM] Module responded OK");
  } else {
    Serial.println("[GSM] No response from module");
    lcdCentered("GSM Module", "No Response!");
    delay(2000);
    gsmReady = false;
    return;
  }

  Serial.println("--- SET TEXT MODE ---");
  sendATCommand("AT+CMGF=1", 1000, true);

  Serial.println("--- SET ENCODING ---");
  sendATCommand("AT+CSCS=\"GSM\"", 1000, true);

  gsmReady = true;
  Serial.println("[GSM] Ready!");
  lcdCentered("GSM Ready!", "");
  delay(1000);
}

// ============================================================
//  sendGsmSms
// ============================================================
void sendGsmSms(String message) {
  if (!gsmReady) {
    Serial.println("[GSM] Not ready, skipping SMS");
    return;
  }

  Serial.println("[GSM] Sending SMS to " + smsTargetNumber);
  lcdPrint("Sending SMS...", "");

  // Clear serial buffer
  while(Serial2.available()) Serial2.read();

  Serial.println("--- INITIATING SMS ---");
  String res1 = sendATCommand("AT+CMGS=\"" + smsTargetNumber + "\"", 2000, true);
  
  // Wait for the '>' prompt
  if (res1.indexOf(">") != -1) {
    Serial.println("--- SENDING MESSAGE BODY ---");
    Serial2.print(message);
    delay(100);
    Serial2.write(26); // Ctrl+Z
    
    // SMS sending can take up to 10 seconds on the network
    String res2 = sendATCommand("", 10000, true); 
    
    if (res2.indexOf("+CMGS:") != -1 || res2.indexOf("OK") != -1) {
      Serial.println("[GSM] SMS sent successfully!");
      lcdPrint("SMS Sent!", "Alert delivered");
    } else {
      Serial.println("[GSM] SMS failed (Network/SIM error)");
      lcdPrint("SMS Failed!", "Check SIM/Signal");
    }
  } else {
    Serial.println("[GSM] SMS failed (No prompt)");
    lcdPrint("SMS Failed!", "No prompt (>)");
  }
  
  delay(2000);
}

// ============================================================
//  lcdCentered
// ============================================================
void lcdCentered(String line1, String line2) {
  lcd.clear();

  int pad1 = (16 - line1.length()) / 2;
  lcd.setCursor(pad1, 0);
  lcd.print(line1);

  int pad2 = (16 - line2.length()) / 2;
  lcd.setCursor(pad2, 1);
  lcd.print(line2);
}

// ============================================================
//  updateBuzzerSettingAPI
// ============================================================
void updateBuzzerSettingAPI(bool enabled) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(apiUrl) + "/buzzer-toggle";
  http.begin(url);
  http.addHeader("Content-Type",  "application/json");
  http.addHeader("Accept",        "application/json");
  http.addHeader("Authorization", "Bearer " + String(bearerToken));

  String payload = "{\"buzzer_enabled\":" + String(enabled ? "true" : "false") + "}";

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.printf("[API] PUT Settings (HTTP %d)\n", httpCode);
  } else {
    Serial.printf("[API] PUT Settings Error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ============================================================
//  checkButtons
// ============================================================
void checkButtons() {
  unsigned long now = millis();

  if (digitalRead(BTN_SILENCE) == HIGH && now - lastSilenceTime > DEBOUNCE_MS) {
    lastSilenceTime = now;

    apiBuzzerEnabled = !apiBuzzerEnabled;
    updateBuzzerSettingAPI(apiBuzzerEnabled);

    if (!apiBuzzerEnabled) {
      noTone(BUZZER);
      buzzerBeepsDone = 0;
      buzzerOn        = false;
      Serial.println("[BTN] Buzzer disabled via API");
      lcdPrint("Buzzer Disabled", "Saved to Web");
      delay(1500);
    } else {
      Serial.println("[BTN] Buzzer enabled via API");
      lcdPrint("Buzzer Enabled", "Saved to Web");
      delay(1500);
    }
  }
}

// ============================================================
//  connectToWiFi
// ============================================================
void connectToWiFi() {
  Serial.print("[WIFI] Connecting to ");
  Serial.println(ssid);

  lcdCentered("Connecting to", "WiFi...");

  delay(1000);
  WiFi.setTxPower(WIFI_POWER_5dBm);
  WiFi.mode(WIFI_STA);
  delay(500);

  WiFi.begin(ssid, password);
  digitalWrite(WIFI_LED, LOW);

  int dots = 0;
  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED) {
    digitalWrite(WIFI_LED, HIGH);
    delay(250);
    digitalWrite(WIFI_LED, LOW);
    delay(250);
    Serial.print(".");
    attempts++;

    dots++;
    if (dots > 3) dots = 0;

    String line2 = "WiFi";
    for (int i = 0; i < dots; i++) {
      line2 += ".";
    }

    int pad = (16 - line2.length()) / 2;
    lcd.setCursor(0, 1);
    for (int i = 0; i < pad; i++) lcd.print(" ");
    lcd.print(line2);
    for (int i = pad + line2.length(); i < 16; i++) lcd.print(" ");

    if (attempts > 40) {
      Serial.println("\n[WIFI] Failed — restarting");
      lcdCentered("WiFi Failed", "Restarting...");
      delay(2000);
      ESP.restart();
    }
  }

  digitalWrite(WIFI_LED, HIGH);
  Serial.println("\n[WIFI] Connected! IP: " + WiFi.localIP().toString());

  lcdCentered("WiFi Connected!", WiFi.localIP().toString());
  delay(2000);
}

// ============================================================
//  fetchSettings
// ============================================================
void fetchSettings() {
  if (WiFi.status() != WL_CONNECTED) return;

  lcdCentered("Syncing", "Settings...");

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
      sensorHeightCm   = doc["settings"]["sensor_height_cm"];
      warningLevelCm   = doc["settings"]["warning_level_cm"];
      criticalLevelCm  = doc["settings"]["critical_level_cm"];
      apiBuzzerEnabled = doc["settings"]["buzzer_enabled"];

      // Check for updated SMS number
      if (doc["settings"].containsKey("sms_target_number") && !doc["settings"]["sms_target_number"].isNull()) {
        String newNumber = doc["settings"]["sms_target_number"].as<String>();
        if (newNumber.length() > 0 && newNumber != smsTargetNumber) {
          smsTargetNumber = newNumber;
          Serial.println("[API] SMS number updated to: " + smsTargetNumber);
        }
      }

      Serial.println("\n--- API Settings Applied ---");
      Serial.printf("Sensor Height  : %.1f cm\n", sensorHeightCm);
      Serial.printf("Warning Level  : >= %.1f cm\n", warningLevelCm);
      Serial.printf("Critical Level : >= %.1f cm\n", criticalLevelCm);
      Serial.printf("Buzzer Enabled : %s\n", apiBuzzerEnabled ? "Yes" : "No");
      Serial.println("SMS Number     : " + smsTargetNumber);
      Serial.println("WiFi SSID      : " + String(ssid));
      Serial.println("----------------------------\n");

      lcdCentered("Settings OK!", "");
      delay(1000);
    }
  } else {
    lcdCentered("Settings", "Failed!");
    delay(1000);
  }
  http.end();
}

// ============================================================
//  postReading
// ============================================================
void postReading(float distance) {
  if (WiFi.status() != WL_CONNECTED) return;

  float waterLevelPercent = ((sensorHeightCm - distance) / sensorHeightCm) * 100.0;
  if (waterLevelPercent < 0)   waterLevelPercent = 0;
  if (waterLevelPercent > 100) waterLevelPercent = 100;

  HTTPClient http;
  String url = String(apiUrl) + "/sensor-readings";
  http.begin(url);
  http.addHeader("Content-Type",  "application/json");
  http.addHeader("Accept",        "application/json");
  http.addHeader("Authorization", "Bearer " + String(bearerToken));

  String payload = "{\"device_code\":\"" + String(deviceCode) + "\"," +
                   "\"distance_cm\":"         + String(distance, 1)         + "," +
                   "\"water_level_percent\":" + String(waterLevelPercent, 1) + "}";

  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    String response = http.getString();
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, response);
    if (!error) {
      if (doc.containsKey("buzzer_enabled")) {
        apiBuzzerEnabled = doc["buzzer_enabled"];
      }
      
      // Check for pending announcements from the web dashboard
      if (doc.containsKey("pending_sms") && !doc["pending_sms"].isNull()) {
        String pendingMsg = doc["pending_sms"].as<String>();
        Serial.println("\n[API] Received Manual Announcement to broadcast via SMS!");
        sendGsmSms(pendingMsg);
      }

      // Check if admin requested a restart from saving settings
      if (doc.containsKey("restart_esp32") && doc["restart_esp32"].as<bool>() == true) {
        pendingRestart = true;
      }
    }
  } else {
    Serial.printf("[API] POST Error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ============================================================
//  readDistance
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
//  startupTest
// ============================================================
void startupTest() {
  Serial.println("[TEST] Running hardware test...");

  lcdCentered("FloodWatch", "Monitoring");
  delay(2000);

  lcdCentered("System", "Starting...");
  delay(1000);

  int leds[] = { GREEN_LED, YELLOW_LED, RED_LED };
  for (int i = 0; i < 3; i++) {
    digitalWrite(leds[i], HIGH);
    delay(300);
    digitalWrite(leds[i], LOW);
  }

  tone(BUZZER, 1000);
  delay(200);
  noTone(BUZZER);

  Serial.println("[TEST] Startup test done.");
}

// ============================================================
//  updateLCD
// ============================================================
void updateLCD(float waterLevel) {
  String line1 = "Level: ";
  line1 += String(waterLevel, 1);
  line1 += " cm";

  String line2 = "Status: ";
  switch (currentStatus) {
    case SAFE:     line2 += "SAFE";     break;
    case WARNING:  line2 += "WARNING";  break;
    case CRITICAL: line2 += "CRITICAL"; break;
  }

  if (buzzerSilenced) line2 += " (S)";

  lcdPrint(line1, line2);
}

// ============================================================
//  applyStatus
// ============================================================
void applyStatus(Status status) {
  digitalWrite(GREEN_LED,  LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED,    LOW);
  noTone(BUZZER);

  lastBuzzerTime  = 0;
  buzzerBeepsDone = 0;
  buzzerOn        = false;
  buzzerSilenced  = false;

  switch (status) {
    case SAFE:
      digitalWrite(GREEN_LED, HIGH);
      Serial.println(">>> Status Changed: SAFE");
      break;
    case WARNING:
      digitalWrite(YELLOW_LED, HIGH);
      Serial.println(">>> Status Changed: WARNING");
      break;
    case CRITICAL:
      digitalWrite(RED_LED, HIGH);
      Serial.println(">>> Status Changed: CRITICAL");
      break;
  }
}

// ============================================================
//  updateBuzzer
// ============================================================
void updateBuzzer() {
  if (currentStatus != CRITICAL || !apiBuzzerEnabled || buzzerSilenced) {
    noTone(BUZZER);
    return;
  }

  unsigned long now = millis();

  if (buzzerOn) {
    if (now - lastBuzzerTime >= BEEP_ON_MS) {
      noTone(BUZZER);
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
        tone(BUZZER, 1000);
        buzzerOn       = true;
        lastBuzzerTime = now;
      }
    }
  }
}

// ============================================================
//  setup
// ============================================================
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  delay(2000);
  Serial.begin(115200);
  delay(500);

  lcd.init();
  lcd.backlight();

  pinMode(TRIG_PIN,    OUTPUT);
  pinMode(ECHO_PIN,    INPUT);
  pinMode(GREEN_LED,   OUTPUT);
  pinMode(YELLOW_LED,  OUTPUT);
  pinMode(RED_LED,     OUTPUT);
  pinMode(BUZZER,      OUTPUT);
  pinMode(POWER_LED,   OUTPUT);
  pinMode(WIFI_LED,    OUTPUT);
  pinMode(BTN_SILENCE, INPUT);

  digitalWrite(TRIG_PIN,  LOW);
  digitalWrite(POWER_LED, HIGH);

  Serial.println("============================================");
  Serial.println("  FloodWatch Node v7 (API + LCD + GSM)");
  Serial.println("  GPIO2=Green  GPIO4=Yellow  GPIO16=Red");
  Serial.println("  GPIO17=Buzz  GPIO32=Power  GPIO33=WiFi");
  Serial.println("  GPIO25=GSM_RX  GPIO26=GSM_TX");
  Serial.println("  GPIO39=Silence");
  Serial.println("  GPIO21=SDA  GPIO22=SCL");
  Serial.println("============================================");

  startupTest();

  Serial.println("[WIFI] Fixed SSID: " + String(ssid));
  Serial.println("[API] Fallback SMS Number: " + smsTargetNumber);

  initGSM();
  connectToWiFi();
  fetchSettings();
  applyStatus(SAFE);
}

// ============================================================
//  loop
// ============================================================
void loop() {
  checkButtons();

  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(WIFI_LED, LOW);
    lcdCentered("WiFi Lost!", "Reconnecting...");
    connectToWiFi();
  }

  if (millis() - lastSettingsSync > 60000) {
    fetchSettings();
    lastSettingsSync = millis();
  }

  updateBuzzer();

  if (millis() - lastReadTime < 1000) return;
  lastReadTime = millis();

  float distance = readDistance();

  if (distance < 0) {
    Serial.println("[SENSOR] No echo — keeping previous reading");
    return;
  }
  if (distance < MIN_VALID_DISTANCE) {
    Serial.printf("[SENSOR] Too close (%.1f cm) — in blind zone, ignored\n", distance);
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

  float waterLevelCm = sensorHeightCm - distance;
  if (waterLevelCm < 0) waterLevelCm = 0;

  Status newStatus;
  if (waterLevelCm >= criticalLevelCm)
    newStatus = CRITICAL;
  else if (waterLevelCm >= warningLevelCm)
    newStatus = WARNING;
  else
    newStatus = SAFE;

  if (newStatus == pendingStatus) {
    if (stableCounter < REQUIRED_READINGS) stableCounter++;
  } else {
    pendingStatus = newStatus;
    stableCounter = 1;
  }

  if (stableCounter >= REQUIRED_READINGS && currentStatus != pendingStatus) {
    currentStatus = pendingStatus;
    applyStatus(currentStatus);

    if (currentStatus == CRITICAL && !smsSentForCritical) {
      float waterLevelM = waterLevelCm / 100.0;
      String smsMsg = "FLOOD ALERT! Water level at " + String(waterLevelM, 2) + "m (" + String(waterLevelCm, 1) + "cm). Evacuate low-lying areas immediately!";
      sendGsmSms(smsMsg);
      smsSentForCritical = true;
    }

    if (currentStatus != CRITICAL) {
      smsSentForCritical = false;
    }
  }

  postReading(distance);

  updateLCD(waterLevelCm);
  Serial.printf("[DATA] Water Level: %.1f cm | Distance: %.1f cm | Status: ", waterLevelCm, distance);
  switch (currentStatus) {
    case SAFE:     Serial.print("SAFE");     break;
    case WARNING:  Serial.print("WARNING");  break;
    case CRITICAL: Serial.print("CRITICAL"); break;
  }
  Serial.printf(" | Stable: %d/%d\n", stableCounter, REQUIRED_READINGS);
  Serial.println("----------------------------------------");

  // Handle pending restart safely outside of active HTTP connections
  if (pendingRestart) {
    pendingRestart = false;
    Serial.println("\n[API] Admin requested ESP32 Restart via Settings Save!");
    
    // Fetch and save the new settings (like WiFi credentials) to NVS BEFORE restarting
    fetchSettings();

    lcdCentered("Settings Saved", "Restarting...");
    delay(2000);
    ESP.restart();
  }
}