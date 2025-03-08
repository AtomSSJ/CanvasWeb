class CanvasManager {
    constructor() {
        this.CANVAS_SIZE = 10000;
        this.PIXEL_SIZE = 5;
        this.MAX_INDEX = this.CANVAS_SIZE / this.PIXEL_SIZE;
        this.CHUNK_SIZE = 100; // Tamaño de chunk para optimización

        this.setupLayers();
        this.initializeState();
        this.setupOffscreenCanvas();
        this.setupPaletteToggle();
    }

    setupLayers() {
        // Configurar capas
        this.backgroundLayer = document.getElementById('background-layer');
        this.gridLayer = document.getElementById('grid-layer');
        this.drawingLayer = document.getElementById('drawing-layer');
        this.uiLayer = document.getElementById('ui-layer');

        // Configurar contextos
        this.backgroundCtx = this.backgroundLayer.getContext('2d');
        this.gridCtx = this.gridLayer.getContext('2d');
        this.drawingCtx = this.drawingLayer.getContext('2d');
        this.uiCtx = this.uiLayer.getContext('2d');

        // Configurar tamaños
        [this.backgroundLayer, this.gridLayer, this.drawingLayer, this.uiLayer].forEach(canvas => {
            canvas.width = this.CANVAS_SIZE;
            canvas.height = this.CANVAS_SIZE;
        });
    }

    initializeState() {
        this.zoomLevel = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.pixels = new Map();
        this.chunks = new Map();
        this.dirtyChunks = new Set();
    }

    setupOffscreenCanvas() {
        // Canvas offscreen para el grid
        this.gridOffscreen = new OffscreenCanvas(this.CANVAS_SIZE, this.CANVAS_SIZE);
        this.gridOffscreenCtx = this.gridOffscreen.getContext('2d');
        this.drawGrid(this.gridOffscreenCtx);
    }

    drawGrid(ctx) {
        ctx.strokeStyle = "#ddd";
        ctx.beginPath();
        
        // Dibujar líneas verticales
        for (let x = 0; x <= this.CANVAS_SIZE; x += this.PIXEL_SIZE) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.CANVAS_SIZE);
        }
        
        // Dibujar líneas horizontales
        for (let y = 0; y <= this.CANVAS_SIZE; y += this.PIXEL_SIZE) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.CANVAS_SIZE, y);
        }
        
        ctx.stroke();
    }

    getChunkKey(x, y) {
        const chunkX = Math.floor(x / this.CHUNK_SIZE);
        const chunkY = Math.floor(y / this.CHUNK_SIZE);
        return `${chunkX},${chunkY}`;
    }

    setPixel(x, y, color) {
        if (x < 0 || x >= this.MAX_INDEX || y < 0 || y >= this.MAX_INDEX) return false;

        const key = `${x},${y}`;
        this.pixels.set(key, color);
        
        // Marcar chunk como sucio
        const chunkKey = this.getChunkKey(x, y);
        this.dirtyChunks.add(chunkKey);
        
        // Actualizar solo el chunk afectado
        this.updateChunk(chunkKey);
        return true;
    }

    updateChunk(chunkKey) {
        const [chunkX, chunkY] = chunkKey.split(',').map(Number);
        const startX = chunkX * this.CHUNK_SIZE;
        const startY = chunkY * this.CHUNK_SIZE;
        
        // Limpiar área del chunk
        this.drawingCtx.clearRect(
            startX * this.PIXEL_SIZE,
            startY * this.PIXEL_SIZE,
            this.CHUNK_SIZE * this.PIXEL_SIZE,
            this.CHUNK_SIZE * this.PIXEL_SIZE
        );

        // Redibujar píxeles en el chunk
        for (let x = startX; x < startX + this.CHUNK_SIZE; x++) {
            for (let y = startY; y < startY + this.CHUNK_SIZE; y++) {
                const key = `${x},${y}`;
                const color = this.pixels.get(key);
                if (color) {
                    this.drawingCtx.fillStyle = color;
                    this.drawingCtx.fillRect(
                        x * this.PIXEL_SIZE,
                        y * this.PIXEL_SIZE,
                        this.PIXEL_SIZE,
                        this.PIXEL_SIZE
                    );
                }
            }
        }
    }

    updateCanvas() {
        // Limpiar capas
        [this.backgroundCtx, this.gridCtx, this.drawingCtx, this.uiCtx].forEach(ctx => {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, this.CANVAS_SIZE, this.CANVAS_SIZE);
        });

        // Aplicar transformaciones
        [this.backgroundCtx, this.gridCtx, this.drawingCtx, this.uiCtx].forEach(ctx => {
            ctx.setTransform(this.zoomLevel, 0, 0, this.zoomLevel, this.offsetX, this.offsetY);
        });

        // Dibujar grid
        this.gridCtx.drawImage(this.gridOffscreen, 0, 0);

        // Actualizar chunks sucios
        this.dirtyChunks.forEach(chunkKey => {
            this.updateChunk(chunkKey);
        });
        this.dirtyChunks.clear();
    }

    pan(dx, dy) {
        this.offsetX += dx;
        this.offsetY += dy;
        this.updateCanvas();
    }

    setZoom(newZoom, centerX, centerY) {
        const oldZoom = this.zoomLevel;
        this.zoomLevel = Math.max(0.1, Math.min(10, newZoom));

        // Ajustar offset para mantener el punto de zoom
        if (centerX !== undefined && centerY !== undefined) {
            const scale = this.zoomLevel / oldZoom;
            this.offsetX = centerX - (centerX - this.offsetX) * scale;
            this.offsetY = centerY - (centerY - this.offsetY) * scale;
        }

        this.updateCanvas();
    }

    reset() {
        this.zoomLevel = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.updateCanvas();
    }

    setupPaletteToggle() {
        const colorPaletteDiv = document.getElementById('color-palette');
        const paletteHandle = document.getElementById('palette-handle');
        
        if (paletteHandle) {
            paletteHandle.addEventListener("click", () => {
                colorPaletteDiv.classList.toggle('hidden');
            });
        }
    }
} 