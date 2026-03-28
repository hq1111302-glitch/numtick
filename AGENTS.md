# AGENTS.md

## Cursor Cloud specific instructions

### Overview

NumTick is a zero-dependency, zero-build, static HTML5 Canvas game (vanilla JS/CSS). There is no package manager, no bundler, no backend, no database, and no environment variables.

### Running the application

Serve the project root with any static HTTP server:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080` in a browser. The game loads from `index.html` and all JS files are included via `<script>` tags (no ES modules).

### Linting / Testing / Building

There are no linters, test frameworks, or build steps configured. The project is pure vanilla HTML/CSS/JS with no tooling.

### Important notes

- The game is entirely client-side; there are no services to start beyond a static file server.
- All game logic lives in `/js/*.js` files loaded in order by `index.html`.
- The README is in Korean. Key gameplay: WASD to move, auto-attack nearest enemy, survive waves, pick skills on level-up.
