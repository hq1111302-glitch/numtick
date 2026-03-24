const Utils = {
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    circleCollision(x1, y1, r1, x2, y2, r2) {
        return this.distance(x1, y1, x2, y2) < r1 + r2;
    },

    randomPointOnCircle(cx, cy, radius) {
        const angle = Math.random() * Math.PI * 2;
        return {
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius
        };
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    hslToString(h, s, l, a = 1) {
        return `hsla(${h}, ${s}%, ${l}%, ${a})`;
    },

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    },

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },

    pickWeighted(items) {
        const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
        let r = Math.random() * total;
        for (const item of items) {
            r -= item.weight || 1;
            if (r <= 0) return item;
        }
        return items[items.length - 1];
    }
};
