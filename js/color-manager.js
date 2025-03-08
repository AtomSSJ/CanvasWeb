class ColorManager {
    constructor() {
        this.selectedColor = '#000000';
        this.baseHSL = { h: 0, s: 0, l: 50 };
        this.presetColors = [
            '#000000', '#FF0000', '#00FF00', '#0000FF',
            '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
        ];

        this.setupElements();
        this.initializeEventListeners();
        this.createPresetColors();
    }

    setupElements() {
        this.colorInput = document.getElementById('color-input');
        this.colorHex = document.getElementById('color-hex');
        this.colorSlider = document.getElementById('color-slider');
        this.presetContainer = document.getElementById('preset-colors');
    }

    initializeEventListeners() {
        this.colorInput.addEventListener('input', (e) => this.updateSelectedColor(e.target.value));
        this.colorHex.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                this.updateSelectedColor(e.target.value);
            }
        });
        this.colorSlider.addEventListener('input', () => this.applyBrightness());
    }

    createPresetColors() {
        this.presetContainer.innerHTML = '';
        this.presetColors.forEach(color => {
            const colorDiv = document.createElement('div');
            colorDiv.className = 'color';
            colorDiv.style.backgroundColor = color;
            colorDiv.dataset.color = color;
            colorDiv.addEventListener('click', () => {
                this.updateSelectedColor(color);
                document.querySelector('.color.selected')?.classList.remove('selected');
                colorDiv.classList.add('selected');
            });
            this.presetContainer.appendChild(colorDiv);
        });
    }

    updateSelectedColor(color) {
        this.selectedColor = color;
        this.baseHSL = this.hexToHSL(color);
        this.applyBrightness();
        this.colorInput.value = color;
        this.colorHex.value = color.toUpperCase();
    }

    applyBrightness() {
        const newColor = this.hslToHex(
            this.baseHSL.h,
            this.baseHSL.s,
            this.colorSlider.value
        );
        this.colorInput.value = newColor;
        this.colorHex.value = newColor.toUpperCase();
        this.selectedColor = newColor;
    }

    getSelectedColor() {
        return this.selectedColor;
    }

    // Conversión de colores optimizada
    hexToHSL(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h = Math.round(h * 60);
        }

        return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    hslToHex(h, s, l) {
        s /= 100;
        l /= 100;
        
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        
        const rgb = [
            Math.round(255 * f(0)),
            Math.round(255 * f(8)),
            Math.round(255 * f(4))
        ];
        
        return '#' + rgb.map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    }
} 