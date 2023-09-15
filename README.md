# num-panel

Control HA Alarmo with a physical numpad.

## TODO

- [x] Implement led feedback over mqtt
- [ ] Try to add capabilies to write to /sys/class/leds and avoid using privileged mode
- [ ] Enable custom layouts

## Test

```bash
    source .env && sudo -E npx ts-node src/index.ts
```
