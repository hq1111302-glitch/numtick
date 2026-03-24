class VirtualJoystick {
    constructor(zone) {
        this.zone = zone;
        this.active = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.dx = 0;
        this.dy = 0;
        this.maxRadius = 50;
        this.touchId = null;

        this.outerEl = null;
        this.innerEl = null;

        this.isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

        if (this.isTouchDevice) {
            this._createElements();
            this._setupEvents();
            zone.style.display = 'block';
        }
    }

    _createElements() {
        this.outerEl = document.createElement('div');
        this.outerEl.className = 'joystick-outer';
        this.outerEl.style.display = 'none';

        this.innerEl = document.createElement('div');
        this.innerEl.className = 'joystick-inner';

        this.outerEl.appendChild(this.innerEl);
        this.zone.appendChild(this.outerEl);
    }

    _setupEvents() {
        this.zone.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
        window.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
        window.addEventListener('touchcancel', (e) => this._onTouchEnd(e), { passive: false });
    }

    _onTouchStart(e) {
        e.preventDefault();
        if (this.active) return;
        const touch = e.changedTouches[0];
        this.touchId = touch.identifier;
        this.active = true;
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.currentX = touch.clientX;
        this.currentY = touch.clientY;
        this.dx = 0;
        this.dy = 0;

        this.outerEl.style.display = 'flex';
        this.outerEl.style.left = `${this.startX - 60}px`;
        this.outerEl.style.top = `${this.startY - 60}px`;
        this.innerEl.style.transform = 'translate(0, 0)';
    }

    _onTouchMove(e) {
        if (!this.active) return;
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.touchId) {
                e.preventDefault();
                this.currentX = touch.clientX;
                this.currentY = touch.clientY;

                let rawDx = this.currentX - this.startX;
                let rawDy = this.currentY - this.startY;
                const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

                if (dist > this.maxRadius) {
                    rawDx = (rawDx / dist) * this.maxRadius;
                    rawDy = (rawDy / dist) * this.maxRadius;
                }

                this.dx = rawDx / this.maxRadius;
                this.dy = rawDy / this.maxRadius;

                this.innerEl.style.transform = `translate(${rawDx}px, ${rawDy}px)`;
                break;
            }
        }
    }

    _onTouchEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.touchId) {
                this.active = false;
                this.touchId = null;
                this.dx = 0;
                this.dy = 0;
                this.outerEl.style.display = 'none';
                break;
            }
        }
    }

    getDirection() {
        if (!this.active) return { x: 0, y: 0 };
        const len = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if (len < 0.15) return { x: 0, y: 0 };
        return { x: this.dx, y: this.dy };
    }
}
