class ColorManager {
    constructor() {
        this.colorInput = document.getElementById('color-input');
        this.colorHex = document.getElementById('color-hex');
        this.colorSlider = document.getElementById('color-slider');
        this.presetColors = document.querySelectorAll('.color');
        
        this.selectedColor = '#000000';
        this.baseHSL = { h: 0, s: 0, l: 50 };
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.colorInput.addEventListener('input', (e) => this.updateSelectedColor(e.target.value));
        this.colorHex.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                this.updateSelectedColor(e.target.value);
            }
        });
        
        this.presetColors.forEach(colorDiv => {
            colorDiv.addEventListener('click', () => {
                this.updateSelectedColor(colorDiv.getAttribute('data-color'));
                document.querySelector('.color.selected')?.classList.remove('selected');
                colorDiv.classList.add('selected');
            });
        });
        
        this.colorSlider.addEventListener('input', () => this.applyBrightness());
    }

    updateSelectedColor(color) {
        this.selectedColor = color;
        this.baseHSL = this.hexToHSL(color);
        this.applyBrightness();
        this.colorInput.value = color;
        this.colorHex.value = color.toUpperCase();
        document.querySelector('.color.selected')?.classList.remove('selected');
    }

    applyBrightness() {
        const newColor = this.hslToHex(this.baseHSL.h, this.baseHSL.s, this.colorSlider.value);
        this.colorInput.value = newColor;
        this.colorHex.value = newColor.toUpperCase();
        this.selectedColor = newColor;
    }

    hexToHSL(hex) {
        let r = parseInt(hex.substring(1, 3), 16) / 255;
        let g = parseInt(hex.substring(3, 5), 16) / 255;
        let b = parseInt(hex.substring(5, 7), 16) / 255;

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            let d = max - min;
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
        let c = (1 - Math.abs(2 * l - 1)) * s;
        let x = c * (1 - Math.abs((h / 60) % 2 - 1));
        let m = l - c / 2;
        let r, g, b;

        if (0 <= h && h < 60) { r = c; g = x; b = 0; }
        else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
        else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
        else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
        else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }

        return `#${((1 << 24) + ((Math.round((r + m) * 255) << 16)) + ((Math.round((g + m) * 255) << 8)) + Math.round((b + m) * 255)).toString(16).slice(1).toUpperCase()}`;
    }

    getSelectedColor() {
        return this.selectedColor;
    }
}

// Exporta la clase
window.ColorManager = ColorManager; 