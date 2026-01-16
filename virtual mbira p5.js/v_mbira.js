let keys = [];

function setup() {
  createCanvas(720, 650);
  userStartAudio(); // required for sound

  //position of top left keys
  let base1X = 180; //horizontal
  let base1Y = 80; //vertical
  //position of bottom left keys
  let baseX = 210;
  let baseY = 80;
  //position of top right keys
  let base2X = 590;
  let base2Y = 80;

  
  // Nyamaropa-style
  //top left
  let notes1 = [
    261.63, // C4
    293.66, // D4
    81, // A4
    349.23, // F4
    392.00, // G4
    440.00, // A4
    493.88, // B4
  ];
  
  //bottom left
  let notes2 = [
    261.63, // C4
    69, // A3
    329.63, // E4
    349.23, // F4
    392.00, // G4
    440.00, // A4
    493.88, // B4
  ];
  
  //right keys
  let notes = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    349.23, // F4
    392.00, // G4
    440.00, // A4
    493.88, // B4
  ];

  // Create metal keys
  //top left keys (notes 1)
  for (let i = 0; i < notes1.length; i++) {
    let x = base1X + (notes1.length/2 - i) * 60;
    let y = base1Y;
    let length = 290 - i * 10;

    keys.push(new MbiraKey(x, y, 25, length, notes1[i]));
  }
  
  //bottom left keys (notes 2)
  for (let i = 0; i < notes2.length; i++) {
    let x = baseX + (notes2.length/2 -i) * 60;
    let y = baseY;
    let length = 370 - i * 10;

    keys.push(new MbiraKey(x, y, 25, length, notes2[i]));
  }
  
  //right keys (notes)
  for (let i = 0; i < notes.length; i++) {
    let x = base2X + (i - notes.length/2) * 30;
    let y = base2Y;
    let length = 250 - i * 10;

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
  for (let i = keys.length - 1; i >= 0; i--) {
    if (keys[i].isClicked(mouseX, mouseY)) {
      keys[i].play();
      break;
    }
  }
}

//function drawmbira
function drawMbiraKey(x, y, topWidth, bottomWidth, height) {
  beginShape();
  
  // top left
  vertex(x - topWidth / 2, y);
  // top right
  vertex(x + topWidth / 2, y);

  // bottom right
  vertex(x + bottomWidth / 2, y + height);

  // bottom left
  vertex(x - bottomWidth / 2, y + height);

  endShape(CLOSE);
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

  drawMbiraKey(
    this.x + this.w / 2,  // center X
    this.y,              // top anchor
    this.w * 0.5,        // narrow top
    this.w * 1.4,        // wider bottom
    this.h               // length
  );
}


  isClicked(mx, my) {
  return (
    mx > this.x &&
    mx < this.x + this.w &&
    my > this.y &&
    my < this.y + this.h
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
  rect(10, 50, 695, 580, 5);
  
  //interior rectangle
  noStroke();
  fill(120, 70, 30);
  rect(20, 50, 675, 520, 20);

  // Sound hole
  fill(0);
  ellipse(590, 490, 70);
  
  fill(180);
stroke(220);
drawMbiraKey(300, 450, 14, 30, 220);

}
