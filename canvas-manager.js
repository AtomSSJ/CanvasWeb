class CanvasManager {
    constructor() {
        this.canvas = document.getElementById('pixel-canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.CANVAS_SIZE = 5000;
        this.PIXEL_SIZE = 10;
        this.MAX_INDEX = this.CANVAS_SIZE / this.PIXEL_SIZE;
        this.CHUNK_SIZE = 100;
        this.PIXEL_PRICE = 10;
        
        this.zoomLevel = 0.1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.pixels = new Map();
        this.purchasedAreas = new Map();
        
        this.setupCanvas();

        // Añadir algunas áreas de prueba
        this.purchaseArea(10, 10, 20, 20, 'current');
        this.purchaseArea(30, 30, 40, 40, 'other');
    }

    setupCanvas() {
        this.canvas.width = this.CANVAS_SIZE;
        this.canvas.height = this.CANVAS_SIZE;
        this.ctx.imageSmoothingEnabled = false;
        
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    updateCanvas() {
        // Limpiar el canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Aplicar transformaciones
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.zoomLevel, this.zoomLevel);

        // 1. Dibujar áreas compradas
        this.drawPurchasedAreas();

        // 2. Dibujar la cuadrícula
        this.drawGrid();

        // 3. Dibujar los píxeles
        this.drawPixels();
    }

    drawPixels() {
        for (const [key, color] of this.pixels) {
            const [x, y] = key.split(',').map(Number);
            this.ctx.fillStyle = color;
            this.ctx.fillRect(
                x * this.PIXEL_SIZE,
                y * this.PIXEL_SIZE,
                this.PIXEL_SIZE,
                this.PIXEL_SIZE
            );
        }
    }

    drawPurchasedAreas() {
        for (const [key, area] of this.purchasedAreas) {
            const [startX, startY, endX, endY] = key.split(',').map(Number);
            const width = (endX - startX + 1) * this.PIXEL_SIZE;
            const height = (endY - startY + 1) * this.PIXEL_SIZE;
            
            // Dibujar fondo del área
            this.ctx.fillStyle = area.owner === 'current' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)';
            this.ctx.fillRect(
                startX * this.PIXEL_SIZE,
                startY * this.PIXEL_SIZE,
                width,
                height
            );
            
            // Dibujar borde
            this.ctx.strokeStyle = area.owner === 'current' ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
            this.ctx.lineWidth = 2 / this.zoomLevel;
            this.ctx.strokeRect(
                startX * this.PIXEL_SIZE,
                startY * this.PIXEL_SIZE,
                width,
                height
            );

            // Añadir etiqueta
            this.ctx.fillStyle = area.owner === 'current' ? 'rgba(0, 100, 0, 0.8)' : 'rgba(150, 0, 0, 0.8)';
            this.ctx.font = `${12 / this.zoomLevel}px Arial`;
            this.ctx.fillText(
                area.owner === 'current' ? 'Tu área' : 'Área comprada',
                (startX * this.PIXEL_SIZE) + 5,
                (startY * this.PIXEL_SIZE) + (20 / this.zoomLevel)
            );
        }
    }

    drawGrid() {
        if (this.zoomLevel < 0.5) return;

        const gridSize = this.PIXEL_SIZE;
        const viewportLeft = Math.floor(-this.offsetX / this.zoomLevel / gridSize) * gridSize;
        const viewportTop = Math.floor(-this.offsetY / this.zoomLevel / gridSize) * gridSize;
        const viewportRight = viewportLeft + Math.ceil(this.canvas.width / this.zoomLevel / gridSize) * gridSize;
        const viewportBottom = viewportTop + Math.ceil(this.canvas.height / this.zoomLevel / gridSize) * gridSize;

        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        this.ctx.lineWidth = 1 / this.zoomLevel;

        for (let x = viewportLeft; x <= viewportRight; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, viewportTop);
            this.ctx.lineTo(x, viewportBottom);
            this.ctx.stroke();
        }

        for (let y = viewportTop; y <= viewportBottom; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(viewportLeft, y);
            this.ctx.lineTo(viewportRight, y);
            this.ctx.stroke();
        }
    }

    getAreaOwner(x, y) {
        for (const [key, area] of this.purchasedAreas) {
            const [startX, startY, endX, endY] = key.split(',').map(Number);
            if (x >= startX && x <= endX && y >= startY && y <= endY) {
                return area;
            }
        }
        return null;
    }

    isAreaPurchased(x, y) {
        return this.getAreaOwner(x, y) !== null;
    }

    purchaseArea(startX, startY, endX, endY, owner = 'current') {
        // Verificar si alguna parte del área ya está comprada
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (this.isAreaPurchased(x, y)) {
                    return false;
                }
            }
        }

        // Marcar área como comprada
        this.purchasedAreas.set(`${startX},${startY},${endX},${endY}`, {
            owner: owner,
            timestamp: Date.now()
        });

        this.updateCanvas();
        return true;
    }

    setPixel(x, y, color) {
        if (x < 0 || x >= this.MAX_INDEX || y < 0 || y >= this.MAX_INDEX) return false;
        
        // Verificar si el píxel está en un área comprada por el usuario actual
        const areaInfo = this.getAreaOwner(x, y);
        if (!areaInfo || areaInfo.owner !== 'current') return false;
        
        const key = `${x},${y}`;
        this.pixels.set(key, color);
        this.updateCanvas();
        return true;
    }

    calculatePurchasePrice(startX, startY, endX, endY) {
        const width = Math.abs(endX - startX + 1);
        const height = Math.abs(endY - startY + 1);
        return width * height * this.PIXEL_PRICE;
    }

    setZoom(newZoom, centerX, centerY) {
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.max(0.1, Math.min(10, newZoom));
        this.offsetX += centerX - (centerX * (this.zoomLevel / oldZoom));
        this.offsetY += centerY - (centerY * (this.zoomLevel / oldZoom));
        this.updateCanvas();
    }

    pan(dx, dy) {
        this.offsetX += dx;
        this.offsetY += dy;
        this.updateCanvas();
    }

    reset() {
        this.zoomLevel = 0.1;
        
        // Centrar en el canvas
        const viewportWidth = this.canvas.clientWidth;
        const viewportHeight = this.canvas.clientHeight;
        const centerX = this.CANVAS_SIZE / 2;
        const centerY = this.CANVAS_SIZE / 2;
        
        this.offsetX = (viewportWidth / 2) - (centerX * this.zoomLevel);
        this.offsetY = (viewportHeight / 2) - (centerY * this.zoomLevel);
        
        this.updateCanvas();
    }
}

window.CanvasManager = CanvasManager; 