import * as fs from 'fs';
import * as mqtt from "mqtt"
const ExclusiveKeyboard = require('exclusive-keyboard');

console.log("Connecting to MQTT...");
let client = mqtt.connect(process.env['MQTT_URL']!, { username: process.env['MQTT_USERNAME'], password: process.env['MQTT_PASSWORD'] })
client.on('error', (err) => {
    console.log(err);
    process.exit(1);
})

client.on('connect', () => {
    console.log("Connected to MQTT");
})

var keyBuffer = "";
var bufferTimmer: NodeJS.Timeout = setTimeout(() => { }, 0);


const keyboard = new ExclusiveKeyboard(process.env['EVENT_DEVICE'] ?? 'event0', true);
const inputLed = fs.readdirSync('/sys/class/leds').filter((file: string) => {
    return file.startsWith('input');
})[0].split('::')[0];

blinkLED("numlock", 3, 50)

console.log("Running...");

keyboard.on('keypress', (e: any) => {
    blinkLED("numlock", 1, 50)
    var num = e.keyId.replace('KEY_KP', '');
    clearTimeout(bufferTimmer);
    if (isNaN(num)) {
        clearInterval(bufferTimmer);
        switch (e.keyId) {
            case "KEY_KPENTER":
                if (keyBuffer.length == 0)
                    cancel();
                else
                    unArm(keyBuffer);
                break;
            case "KEY_KPDOT":
                cancel();
                break;
            case "KEY_KPPLUS":
                arm("away");
                break;
            case "KEY_KPMINUS":
                arm("home");
                break;
            // case "KEY_KPASTERISK":
            //     break;
            // case "KEY_KPSLASH":
            //     break;
            // case "KEY_NUMLOCK":
            //     break;
            default:
                client.publish('num-panel/key', e.keyId);
                console.log("Sending key: " + e.keyId);
                break;
        }
        keyBuffer = "";
    }
    else {
        keyBuffer += num;
        bufferTimmer = setTimeout(() => cancel(), 5000);
    }
});

client.subscribe('alarmo/event', (err) => {
    if (err) console.log(err);
})

client.on('message', (topic, message) => {
    if (topic == 'alarmo/event') {
        const payload = JSON.parse(message.toString());
        switch (payload.event) {
            case "ARM_AWAY":
                blinkLED("numlock", 1, 100);
                break;
            case "ARM_HOME":
                blinkLED("numlock", 2, 100);
                break;
            case "DISARM":
                blinkLED("numlock", 3, 50);
                break;
            case "INVALID_CODE_PROVIDED":
                blinkLED("numlock", 5, 50);
                break;
        }
    }
})

function cancel() {
    console.log("Cancel");
    keyBuffer = "";
    blinkLED("numlock", 5, 50)
}

function unArm(code: string) {
    console.log("Unarming");
    client.publish('alarmo/command', JSON.stringify(
        {
            command: "disarm",
            code: code
        }
    ))
}

function arm(mode: "home" | "away") {
    console.log("Arming " + mode);
    client.publish('alarmo/command', mode == "home" ? "ARM_HOME" : "ARM_AWAY")
}

function blinkLED(led: "numlock" | "capslock" | "scrolllock", times: number, interval: number) {
    var counter = 0;
    var ledPath = "/sys/class/leds/" + inputLed + "::" + led + '/brightness';
    var blinker = setInterval(() => {
        counter++;
        fs.writeFileSync(ledPath, '1');
        setTimeout(() => {
            fs.writeFileSync(ledPath, '0');
        }, interval);
        if (counter >= times) {
            clearInterval(blinker);
        }
    }, interval * 2);
}

process.on('SIGINT', function () {
    keyboard.close();
    client.end();
});
