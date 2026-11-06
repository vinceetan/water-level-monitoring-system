// ============================================================
//  AquaWatch hardware test (offline)
//  No WiFi, no API, no settings sync.
//  Uses the same GPIOs as AquaWatch_v3_API.ino
//
//  Ultrasonic JSN-SR04T : TRIG GPIO5, ECHO GPIO18
//  LCD I2C              : SDA GPIO21, SCL GPIO22
//  LEDs                 : Green 2, Yellow 4, Red 16, Power 32
//  Buzzer               : GPIO17
//  Silence button       : GPIO39
//  Float switch         : GPIO27 to GND (INPUT_PULLUP)
// ============================================================

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

const int TRIG_PIN         = 5;
const int ECHO_PIN         = 18;
const int GREEN_LED        = 2;
const int YELLOW_LED       = 4;
const int RED_LED          = 16;
const int BUZZER           = 17;
const int POWER_LED        = 32;
const int BTN_SILENCE      = 39;
const int FLOAT_SWITCH_PIN = 27;

// Closed contact to GND = activated. Set true if dry/trip are reversed.
const bool FLOAT_SWITCH_INVERT = false;

// Local test thresholds only (cm of water). Not loaded from the website.
const float SENSOR_HEIGHT_CM  = 300.0;
const float WARNING_LEVEL_CM  = 200.0;
const float CRITICAL_LEVEL_CM = 250.0;

const float MIN_VALID_DISTANCE = 20.0;
const float MAX_VALID_DISTANCE = 350.0;

const unsigned long FLOAT_DEBOUNCE_MS = 50;
const int FLOAT_STABLE_COUNT          = 4;
const unsigned long READ_INTERVAL_MS  = 500;
const unsigned long DEBOUNCE_MS       = 200;

const int BEEP_ON_MS  = 1000;
const int BEEP_OFF_MS = 500;
const int BEEP_COUNT  = 3;

enum Status { SAFE, WARNING, CRITICAL, NO_SENSOR };
Status measurementStatus = NO_SENSOR;
Status overallStatus     = NO_SENSOR;

enum FloatSwitchState { FLOAT_INACTIVE, FLOAT_ACTIVATED };
FloatSwitchState floatSwitchState = FLOAT_INACTIVE;
int rawFloatSample = HIGH;
int floatStableCount = 0;
unsigned long lastFloatSampleTime = 0;

unsigned long lastReadTime    = 0;
unsigned long lastSilenceTime = 0;
unsigned long lastBuzzerTime  = 0;
int  buzzerBeepsDone = 0;
bool buzzerOn        = false;
bool buzzerSilenced  = false;

void lcdPrint(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}

void lcdCentered(String line1, String line2) {
  lcd.clear();
  int pad1 = (16 - (int)line1.length()) / 2;
  if (pad1 < 0) pad1 = 0;
  lcd.setCursor(pad1, 0);
  lcd.print(line1.substring(0, 16));
  int pad2 = (16 - (int)line2.length()) / 2;
  if (pad2 < 0) pad2 = 0;
  lcd.setCursor(pad2, 1);
  lcd.print(line2.substring(0, 16));
}

float readDistance() {
  float readings[5];
  int validCount = 0;

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
        float tmp = readings[i];
        readings[i] = readings[j];
        readings[j] = tmp;
      }
    }
  }

  return readings[validCount / 2];
}

void updateFloatSwitch() {
  unsigned long now = millis();
  if (now - lastFloatSampleTime < FLOAT_DEBOUNCE_MS) return;
  lastFloatSampleTime = now;

  int sample = digitalRead(FLOAT_SWITCH_PIN);
  if (sample == rawFloatSample) {
    if (floatStableCount < FLOAT_STABLE_COUNT) floatStableCount++;
  } else {
    rawFloatSample = sample;
    floatStableCount = 1;
  }

  if (floatStableCount < FLOAT_STABLE_COUNT) return;

  bool closed = (rawFloatSample == LOW);
  if (FLOAT_SWITCH_INVERT) closed = !closed;
  floatSwitchState = closed ? FLOAT_ACTIVATED : FLOAT_INACTIVE;
}

void applyLeds(Status status) {
  digitalWrite(GREEN_LED,  LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED,    LOW);

  switch (status) {
    case SAFE:
      digitalWrite(GREEN_LED, HIGH);
      break;
    case WARNING:
      digitalWrite(YELLOW_LED, HIGH);
      break;
    case CRITICAL:
      digitalWrite(RED_LED, HIGH);
      break;
    default:
      break;
  }
}

void updateBuzzer() {
  if (overallStatus != CRITICAL || buzzerSilenced) {
    noTone(BUZZER);
    buzzerOn = false;
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
  } else if (buzzerBeepsDone >= BEEP_COUNT) {
    if (now - lastBuzzerTime >= 1500) {
      buzzerBeepsDone = 0;
      lastBuzzerTime = now;
    }
  } else if (now - lastBuzzerTime >= BEEP_OFF_MS) {
    tone(BUZZER, 1000);
    buzzerOn = true;
    lastBuzzerTime = now;
  }
}

void checkSilenceButton() {
  unsigned long now = millis();
  if (digitalRead(BTN_SILENCE) == HIGH && now - lastSilenceTime > DEBOUNCE_MS) {
    lastSilenceTime = now;
    buzzerSilenced = !buzzerSilenced;
    if (buzzerSilenced) {
      noTone(BUZZER);
      buzzerOn = false;
    }
    Serial.println(buzzerSilenced ? "[BTN] Buzzer silenced" : "[BTN] Buzzer enabled");
  }
}

const char* statusName(Status status) {
  switch (status) {
    case SAFE:     return "SAFE";
    case WARNING:  return "WARN";
    case CRITICAL: return "CRIT";
    default:       return "NONE";
  }
}

void updateLcd(float waterLevelCm, float distanceCm, bool distanceValid) {
  String line1;
  if (distanceValid) {
    line1 = "L:";
    line1 += String(waterLevelCm, 1);
    line1 += "cm D:";
    line1 += String(distanceCm, 0);
  } else {
    line1 = "Sensor: no echo";
  }

  String line2 = statusName(overallStatus);
  line2 += floatSwitchState == FLOAT_ACTIVATED ? " F:ACT" : " F:OFF";
  if (buzzerSilenced) line2 += " S";

  lcdPrint(line1, line2);
}

void setup() {
  Serial.begin(115200);
  delay(300);

  lcd.init();
  lcd.backlight();

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(POWER_LED, OUTPUT);
  pinMode(BTN_SILENCE, INPUT);
  pinMode(FLOAT_SWITCH_PIN, INPUT_PULLUP);

  digitalWrite(TRIG_PIN, LOW);
  digitalWrite(POWER_LED, HIGH);

  lcdCentered("Hardware Test", "No WiFi / API");
  delay(1000);

  digitalWrite(GREEN_LED, HIGH);
  delay(250);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, HIGH);
  delay(250);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, HIGH);
  delay(250);
  digitalWrite(RED_LED, LOW);

  tone(BUZZER, 1000);
  delay(200);
  noTone(BUZZER);

  lcdCentered("Ready", "GPIO27=Float");
  delay(800);

  Serial.println("AquaWatch hardware test started");
  Serial.println("GPIO27 float switch, GPIO5/18 ultrasonic");
  Serial.println("Silence button GPIO39 mutes buzzer");
}

void loop() {
  checkSilenceButton();
  updateFloatSwitch();
  updateBuzzer();

  if (millis() - lastReadTime < READ_INTERVAL_MS) return;
  lastReadTime = millis();

  float distance = readDistance();
  bool distanceValid = (distance >= MIN_VALID_DISTANCE && distance <= MAX_VALID_DISTANCE);

  float waterLevelCm = 0;
  if (distanceValid) {
    waterLevelCm = SENSOR_HEIGHT_CM - distance;
    if (waterLevelCm < 0) waterLevelCm = 0;

    if (waterLevelCm >= CRITICAL_LEVEL_CM) measurementStatus = CRITICAL;
    else if (waterLevelCm >= WARNING_LEVEL_CM) measurementStatus = WARNING;
    else measurementStatus = SAFE;
  } else {
    measurementStatus = NO_SENSOR;
  }

  overallStatus = (floatSwitchState == FLOAT_ACTIVATED) ? CRITICAL : measurementStatus;
  applyLeds(overallStatus);

  updateLcd(waterLevelCm, distance, distanceValid);

  Serial.print("[TEST] Dist=");
  if (distanceValid) Serial.printf("%.1f cm", distance);
  else Serial.print("invalid");
  Serial.printf(" | Level=%.1f cm | Measure=%s | Float=%s | Overall=%s\n",
                waterLevelCm,
                statusName(measurementStatus),
                floatSwitchState == FLOAT_ACTIVATED ? "ACT" : "OFF",
                statusName(overallStatus));
}
