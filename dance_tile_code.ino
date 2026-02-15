const int top = A0;
const int left = A1;
const int right = A3;
const int bottom = A5;

int top_tile;
int left_tile;
int right_tile;
int bottom_tile;
bool bottom_pressed = false;
bool top_pressed = false;
bool left_pressed = false;
bool right_pressed = false;
void setup() {
  // put your setup code here, to run once:
    pinMode(top, INPUT);
    pinMode(left, INPUT);
    pinMode(right, INPUT);
    pinMode(bottom, INPUT);
    Serial.begin(9600);
}

void loop() {
  // put your main code here, to run repeatedly:
    top_tile = analogRead(top);
    left_tile = analogRead(left);
    right_tile = analogRead(right);
    bottom_tile = analogRead(bottom);
    // Serial.println("Top tile:");
    // Serial.println(top_tile);
    if (top_tile < 60 && !top_pressed){
      top_pressed = true;
      Serial.println("TOP PRESSED");
    }
    else{
      top_pressed = false;
    }
    // Serial.println("Left tile:");
    // Serial.println(left_tile);
    if (left_tile < 40 && !left_pressed){
      left_pressed = true;
      Serial.println("LEFT PRESSED");
    }
    else{
      left_pressed = false;
    }
    // Serial.println("Right tile:");
    // Serial.println(right_tile);
    if (right_tile < 40 && !right_pressed){
      right_pressed = true;
      Serial.println("RIGHT PRESSED");
    }
    else{
      right_pressed = false;
    }
    // Serial.print("Bottom tile: ");
    // Serial.println(bottom_tile);
    if (bottom_tile < 55 && !bottom_pressed){
      bottom_pressed = true;
      Serial.println("BOTTOM PRESSED");
    }
    else{
      bottom_pressed = false;
    }
    delay(500);
}
