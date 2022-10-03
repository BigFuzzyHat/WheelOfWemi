(function() {
function drawWheel (ctx, wheel, deltaT) {
    // duplicate a single element to avoid back-to-back instances of the same colour
    const elements = (wheel.elements.length % wheel.colours.length !== 1 ?
        wheel.elements :
        wheel.elements.concat(wheel.elements[wheel.elements.length / 2 | 0])).map(e => {
            return e.length < 25 ? e : e.substring(0, 22) + "...";
        });


    const arc = 2 / elements.length * Math.PI;
    const spinnerSide = wheel.radius * 0.4;
    const textX = wheel.radius * 0.95;
    const textWidth = (textX - spinnerSide / 2) * 0.95;
    const fontSize = (wheel.radius / 7)|0;
    const selectedElement = elements[Math.floor((2 * Math.PI - (wheel.rotation % (2 * Math.PI))) / arc) % elements.length];

    ctx.save();
    ctx.strokeStyle = "#ddd8da"; //HoroHoro grey
    ctx.translate(wheel.x, wheel.y);
    ctx.rotate(wheel.rotation);
    ctx.font = fontSize + "px serif";
    ctx.lineWidth = 3;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    elements.forEach((element, i) => {
        ctx.save();
        ctx.rotate(arc * i);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, wheel.radius, 0, arc);
        ctx.lineTo(0, 0);
        ctx.fillStyle = wheel.colours[i % wheel.colours.length];
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = wheel.colours[(i + 1) % wheel.colours.length];
        ctx.rotate(arc / 2);
        ctx.strokeText(element, textX, 0, textWidth);
        ctx.fillText(element, textX, 0, textWidth);
        ctx.restore();
    });
    ctx.drawImage(wheel.spinnerImage, -(spinnerSide / 2), -(spinnerSide / 2), spinnerSide, spinnerSide);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wheel.x + (wheel.radius * 0.97), wheel.y);
    ctx.lineTo(wheel.x + (wheel.radius * 1.1), wheel.y * 1.1);
    ctx.lineTo(wheel.x + (wheel.radius * 1.1), wheel.y * 0.9);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = (ctx.canvas.height - (wheel.y + wheel.radius)) + "px serif";
    ctx.fillStyle = "red";
    ctx.fillText(selectedElement, wheel.x, wheel.y + wheel.radius);
    ctx.strokeText(selectedElement, wheel.x, wheel.y + wheel.radius);
    ctx.restore();

    if (state.status === Status.Waiting || state.status === Status.Spun) {
        ctx.save();
        drawPrompt(ctx, wheel, {
            text: state.status === Status.Waiting ? WaitingPrompt : selectedElement,
            deltaT: deltaT
        });
        ctx.restore();
    }
}

function drawPrompt(ctx, wheel, prompt) {
    const fontSize = (wheel.radius / 3 + (10 * Math.cos(prompt.deltaT / 1500 * 2 * Math.PI)))|0;
    const fontMax = (wheel.radius / 3 + 10)|0;
    const rrRadius = fontMax * 0.45;
    ctx.save();
    ctx.font = fontSize + "px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "black";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(wheel.x - wheel.radius + fontMax * 0.55, wheel.y, fontMax/2, Math.PI/2, Math.PI * 1.5);
    ctx.arc(wheel.x + wheel.radius - fontMax * 0.55, wheel.y, fontMax/2, Math.PI * 1.5, Math.PI/2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillText(prompt.text, wheel.x, wheel.y, 1.9 * wheel.radius);
    ctx.strokeText(prompt.text, wheel.x, wheel.y, 1.9 * wheel.radius);
    ctx.restore();
}

function draw (t) {
    const canvas = document.getElementById("wemiCanvas");
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        const ratio = window.devicePixelRatio;
        canvas.width = window.innerWidth * ratio;
        canvas.height = window.innerHeight * ratio;
        canvas.style.width = window.innerWidth + "px";
        canvas.style.height = window.innerHeight + "px";
    }

    if (!state.t0) {
        state.t0 = t;
        state.r0 = state.rotation % (2* Math.PI); // there's no way anyone would sit and spin the wheel long enough to cause floating point rounding errors... but cap this value just in case
        state.spinLength = (9 + Math.random() * 12) * Math.PI + Math.random() * 2 * Math.PI; // add between 3 and 6 full spins in of half spin increments and then select a random point on the spin following that
        state.target = state.r0 + state.spinLength;
    }
    const deltaT = Math.max(t - state.t0, 1);

    if (state.status === Status.Spinning) {
        state.rotation = state.r0 + state.spinLength * Math.log(deltaT) / LogBase;
        // after the initial spin transition from a log curve to a parabola for a more natural slowdown
        if (deltaT > SpinTime * 0.6) {
            state.status = Status.Slowing;
            state.slowQuad = {
                h: SpinTime,
                k: state.target,
                a: (state.rotation - state.target) / Math.pow(deltaT - SpinTime, 2)
            };
        }
    }
    if (state.status === Status.Slowing) {
        let x = deltaT;
        let a = state.slowQuad.a;
        let h = state.slowQuad.h;
        let k = state.slowQuad.k;
        state.rotation = a * Math.pow(x - h, 2) + k; // vertex-form of a quadratic formula
        if (state.rotation > state.target) {
            state.rotation = state.target;
        }
        if (deltaT > SpinTime) {
            state.rotation = state.target;
            state.status = Status.Spun;
        }
    }
    const boundingSize = Math.min(canvas.width, canvas.height);

    const wheel = {
        x: boundingSize * 0.5,
        y: boundingSize * 0.48,
        radius: boundingSize * 0.45,
        rotation: state.rotation,
        elements: state.elements,
        colours: state.colours,
        spinnerImage: document.getElementById("spinner")
    };

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!state.hideBackground) {
        ctx.drawImage(BackgroundImg, 0, 0, boundingSize, boundingSize)
    }
    ctx.save();
    drawWheel(ctx, wheel, deltaT);
    ctx.restore();

    requestAnimationFrame(draw);
}

const WaitingPrompt = "Click to spin";
const BackgroundImg = document.getElementById("bg");
const SpinTime = 5000;
const LogBase = Math.log(SpinTime);
const LogScale = Math.abs(Math.log(Number.MIN_VALUE)/LogBase);

const Status = {
    Waiting: "WAITING",
    Spinning: "SPINNING",
    Slowing: "SLOWING",
    Spun: "SPUN"
};

const state = (function () {
    let state = {
        status: Status.Waiting,
        rotation: 0
    };
    let bindings = {};

    function bindInput(inputId, prop, opts = {}) {
        const defaultOpts = {
            transform: null,
            inputProp: "value"
        }
        let input = document.getElementById(inputId);
        bindings[prop] = Object.assign({}, { input }, defaultOpts, opts);
        input.addEventListener("input", function (e) {
            let inputProp = bindings[prop].inputProp;
            let value = opts.transform ? opts.transform(e.target[inputProp]) : e.target[inputProp];
            set(state, prop, value);
        });
        try {
            let storedValue = JSON.parse(localStorage.getItem(prop));
            if (storedValue !== null && storedValue !== "") {
                set(state, prop, storedValue);
            }
        } catch (e) {
            console.debug(`Error loading stored param ${prop}: ${e}`);
        }
    }
    function get(obj, prop) {
        if (prop === "bindInput") {
            return bindInput;
        }
        return obj[prop];
    }
    function set(obj, prop, value) {
        obj[prop] = value;
        if (bindings[prop]) {
            let inputProp = bindings[prop].inputProp;
            bindings[prop].input[inputProp] = bindings[prop].transform ?
                bindings[prop].transform(value, true) :
                value;
        }
        localStorage.setItem(prop, JSON.stringify(value));
    }

    return new Proxy(state, {get, set});
})();

function bindTextArea (value, reverse) {
    if (reverse && Array.isArray(value)) {
        return value.join("\n");
    }
    return value.split("\n");
}
state.bindInput("wheelElements", "elements", { transform: bindTextArea });
state.bindInput("wheelColours", "colours", { transform: bindTextArea });
state.bindInput("hideBackground", "hideBackground", { inputProp: "checked" });

const defaults = {
    elements: [ // default list pulled from 2022-09-29 study stream
    "Drink water",
    "Eat fruit",
    "Read chat's lines",
    "Timetable time",
    "Speak different language",
    "Try pilk",
    "Chat writes a tweet",
    "ABC backwards",
    "Tongue twisters",
    "Math problems",
    "5 squats",
    "5 pushups"
    ],
    colours: [
        "#d1233c", //Hue of red used in Remi's bows
        "black"
    ],
    hideBackground: false
};

document.getElementById("wemiCanvas").onclick = function () {
    if (state.status === Status.Waiting || state.status === Status.Spun) {
        state.status = Status.Spinning;
        state.t0 = null;
    }
};

document.getElementById("btnDefaults").onclick = function () {
    Object.keys(defaults).forEach(k => state[k] = defaults[k]);
};

(function () {
    Object.keys(defaults).forEach(k => {
        if (!(k in state)) {
            state[k] = defaults[k];
        }
    });
    requestAnimationFrame(draw);
})();
})();