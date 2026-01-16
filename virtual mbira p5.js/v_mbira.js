let keys = [];

function setup() {
  createCanvas(700, 600);
  userStartAudio(); // required for sound

  let base1X = 240;
  let base1Y = 100;
  let baseX = 265;
  let baseY = 300;
  let base2X = 560;
  let base2Y = 100;

  
  // Nyamaropa-style
  let notes = [
    261.63, // C4
    293.66, // D4
    81, // A4
    349.23, // F4
    392.00, // G4
    440.00, // A4
    493.88, // B4
    523.25  // C5
  ];
  
  let notes2 = [
    261.63, // C4
    69, // A3
    329.63, // E4
    349.23, // F4
    392.00, // G4
    440.00, // A4
    493.88, // B4
    523.25  // C5
  ];
  
  let notes3 = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    349.23, // F4
    392.00, // G4
    440.00, // A4
    493.88, // B4
    523.25  // C5
  ];

  // Create metal keys
  //top left keys
  for (let i = 0; i < notes.length; i++) {
    let x = base1X + (notes.length/2 - i) * 35;
    let y = base1Y;
    let length = 200 - i * 10;

    keys.push(new MbiraKey(x, y, 25, length, notes[i]));
  }
  
  //bottom left keys
  for (let i = 0; i < notes2.length; i++) {
    let x = baseX + (notes2.length/2 -i) * 35;
    let y = baseY;
    let length = 300 - i * 10;

    keys.push(new MbiraKey(x, y, 25, length, notes2[i]));
  }
  
  //right keys
  for (let i = 0; i < notes.length; i++) {
    let x = base2X + (i - notes.length/2) * 35;
    let y = base2Y;
    let length = 180 - i * 10;

    keys.push(new MbiraKey(x, y, 25, length, notes[i]));
  }
}

function draw() {
  background(30);

  drawSoundboard();

  for (let key of keys) {
    key.display();
  }
}

function mousePressed() {
  for (let key of keys) {
    if (key.isClicked(mouseX, mouseY)) {
      key.play();
    }
  }
}

// ---------------- CLASSES ----------------

class MbiraKey {
  constructor(x, y, w, h, freq) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.freq = freq;

    this.osc = new p5.Oscillator('sine');
    this.osc.freq(freq);
    this.osc.amp(0);
    this.osc.start();
  }

  display() {
    fill(180);
    stroke(220);
    rect(this.x, this.y, this.w, this.h, 8);
  }

  isClicked(mx, my) {
    return (
      mx > this.x &&
      mx < this.x + this.w &&
      my > this.y - this.h &&
      my < this.y
    );
  }

  play() {
    this.osc.amp(0.4, 0.01);
    this.osc.amp(0, 0.3);
  }
}

// ---------------- VISUALS ----------------

function drawSoundboard() {
  //exterior rectangle
  fill(218, 160, 109);
  rect(80, 50, 540, 520, 5);
  
  //interior rectangle
  noStroke();
  fill(120, 70, 30);
  rect(120, 50, 460, 460, 20);

  // Sound hole
  fill(0);
  ellipse(510, 450, 70);
}
