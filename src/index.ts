import * as fs from 'fs';
import * as mqtt from "mqtt"
let client = mqtt.connect(process.env['MQTT_URL']!, { username: process.env['MQTT_USERNAME'], password: process.env['MQTT_PASSWORD'] })
client.on('connect', () => {
    console.log("Connected to MQTT");
})

const ExclusiveKeyboard = require('exclusive-keyboard');

const keyboard = new ExclusiveKeyboard('event0', false);
const inputLed = fs.readdirSync('/sys/class/leds').filter((file: string) => {
    return file.startsWith('input');
})[0].split('::')[0];

blinkLED("numlock", 3, 50)

var keyBuffer = "";
var bufferTimmer: NodeJS.Timeout = setTimeout(() => { }, 0);

keyboard.on('keypress', (e: any) => {
    // console.log(e.keyId);
    if (!e.keyId.startsWith('KEY_KP')) {
        console.log("Ingoring key: " + e.keyId);
        return;
    }
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
                console.log("Key not assigned: " + e.keyId);
                break;
        }
        keyBuffer = "";
    }
    else {
        console.log("Key: " + num);
        keyBuffer += num;
        bufferTimmer = setTimeout(() => {
            keyBuffer = "";
            cancel();
        }, 5000);
    }
});

console.log("Running...");

function cancel() {
    console.log("Canceling...");
    blinkLED("numlock", 5, 100);
}

function unArm(code: string) {
    console.log("Unarming with code: " + code);
    client.publish('alarmo/command', JSON.stringify(
        {
            command: "disarm",
            code: code
        }
    ))
    blinkLED("numlock", 1, 100);
}

function arm(mode: "home" | "away") {
    console.log("Arming " + mode);
    client.publish('alarmo/command', mode == "home" ? "ARM_HOME" : "ARM_AWAY")
    blinkLED("numlock", 2, 100);
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
});
