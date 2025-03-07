class InteractionManager {
    constructor(canvasManager, colorManager) {
        this.canvasManager = canvasManager;
        this.colorManager = colorManager;
        this.canvas = canvasManager.canvas;
        
        this.isDragging = false;
        this.isSelecting = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.selectionStart = null;
        this.selectionEnd = null;
        
        this.coordinatesElement = document.getElementById('coordinates');
        this.notificationsElement = document.getElementById('notifications');
        this.purchaseModal = document.getElementById('purchase-modal');
        this.pixelPriceElement = document.getElementById('pixel-price');
        this.balanceElement = document.getElementById('balance-amount');
        
        // Establecer precio fijo por píxel
        this.pixelPriceElement.textContent = this.canvasManager.PIXEL_PRICE;
        
        this.initializeEventListeners();
        this.setupKeyboardShortcuts();
    }

    initializeEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());
        
        // Button controls
        document.getElementById('zoom-in').addEventListener('click', () => this.handleZoomIn());
        document.getElementById('zoom-out').addEventListener('click', () => this.handleZoomOut());
        document.getElementById('reset-view').addEventListener('click', () => this.handleReset());
        
        // Mouse coordinate tracking
        this.canvas.addEventListener('mousemove', (e) => this.updateCoordinates(e));

        // Modal events
        if (this.purchaseModal) {
            document.getElementById('confirm-purchase').addEventListener('click', () => this.handlePurchaseConfirm());
            document.getElementById('cancel-purchase').addEventListener('click', () => this.handlePurchaseCancel());
        }

        // Añadir evento de click para dibujar
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '=':
                    case '+':
                        e.preventDefault();
                        this.handleZoomIn();
                        break;
                    case '-':
                        e.preventDefault();
                        this.handleZoomOut();
                        break;
                    case '0':
                        e.preventDefault();
                        this.handleReset();
                        break;
                }
            }
        });
    }

    handleMouseDown(event) {
        if (event.button === 0) { // Left click
            if (event.shiftKey) {
                this.isSelecting = true;
                const rect = this.canvas.getBoundingClientRect();
                this.selectionStart = {
                    x: Math.floor((event.clientX - rect.left - this.canvasManager.offsetX) / 
                        (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE)),
                    y: Math.floor((event.clientY - rect.top - this.canvasManager.offsetY) / 
                        (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE))
                };
                this.selectionEnd = { ...this.selectionStart }; // Inicializar end igual que start
                this.canvas.style.cursor = 'crosshair';
                
                // Mostrar las coordenadas iniciales de selección
                this.showSelectionInfo();
            } else {
                this.isDragging = true;
                this.canvas.style.cursor = 'grabbing';
            }
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        }
    }

    handleMouseMove(event) {
        if (this.isDragging && !this.isSelecting) {
            const dx = event.clientX - this.lastMouseX;
            const dy = event.clientY - this.lastMouseY;
            this.canvasManager.pan(dx, dy);
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        } else if (this.isSelecting && this.selectionStart) {
            const rect = this.canvas.getBoundingClientRect();
            this.selectionEnd = {
                x: Math.floor((event.clientX - rect.left - this.canvasManager.offsetX) / 
                    (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE)),
                y: Math.floor((event.clientY - rect.top - this.canvasManager.offsetY) / 
                    (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE))
            };
            this.drawSelection();
            this.showSelectionInfo();
        }
    }

    handleMouseUp() {
        if (this.isSelecting && this.selectionStart && this.selectionEnd) {
            this.showPurchaseModal();
        }
        this.isDragging = false;
        this.isSelecting = false;
        this.canvas.style.cursor = 'default';
        
        // Limpiar la selección después de mostrar el modal
        if (!this.purchaseModal.classList.contains('active')) {
            this.clearSelection();
        }
    }

    handleMouseLeave() {
        this.isDragging = false;
        this.isSelecting = false;
        this.clearSelection();
    }

    handleWheel(event) {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const newZoom = this.canvasManager.zoomLevel * (event.deltaY < 0 ? 1.1 : 0.9);
        this.canvasManager.setZoom(newZoom, mouseX, mouseY);
    }

    handleTouchStart(event) {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.lastMouseX = touch.clientX;
            this.lastMouseY = touch.clientY;
            this.drawPixel(touch);
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            if (event.touches.length === 1) {
                const dx = touch.clientX - this.lastMouseX;
                const dy = touch.clientY - this.lastMouseY;
                this.canvasManager.pan(dx, dy);
                this.lastMouseX = touch.clientX;
                this.lastMouseY = touch.clientY;
            }
        }
    }

    handleTouchEnd() {
        this.lastDrawX = -1;
        this.lastDrawY = -1;
    }

    drawPixel(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left - this.canvasManager.offsetX) / 
            (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE));
        const y = Math.floor((event.clientY - rect.top - this.canvasManager.offsetY) / 
            (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE));

        if (x === this.lastDrawX && y === this.lastDrawY) return;
        
        if (this.canvasManager.setPixel(x, y, this.colorManager.getSelectedColor())) {
            this.lastDrawX = x;
            this.lastDrawY = y;
        }
    }

    handleZoomIn() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.canvasManager.setZoom(this.canvasManager.zoomLevel * 1.2, centerX, centerY);
    }

    handleZoomOut() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.canvasManager.setZoom(this.canvasManager.zoomLevel / 1.2, centerX, centerY);
    }

    handleReset() {
        // Centrar en el canvas y aplicar zoom mínimo
        const centerX = this.canvasManager.CANVAS_SIZE / 2;
        const centerY = this.canvasManager.CANVAS_SIZE / 2;
        this.canvasManager.zoomLevel = 0.1; // Zoom mínimo
        
        // Calcular offset para centrar
        const viewportWidth = this.canvas.clientWidth;
        const viewportHeight = this.canvas.clientHeight;
        this.canvasManager.offsetX = (viewportWidth / 2) - (centerX * this.canvasManager.zoomLevel);
        this.canvasManager.offsetY = (viewportHeight / 2) - (centerY * this.canvasManager.zoomLevel);
        
        this.canvasManager.updateCanvas();
    }

    updateCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left - this.canvasManager.offsetX) / 
            (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE));
        const y = Math.floor((event.clientY - rect.top - this.canvasManager.offsetY) / 
            (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE));
        
        this.coordinatesElement.textContent = `X: ${x}, Y: ${y}`;
    }

    showNotification(message, duration = 3000) {
        this.notificationsElement.textContent = message;
        this.notificationsElement.classList.add('show');
        setTimeout(() => {
            this.notificationsElement.classList.remove('show');
        }, duration);
    }

    clearSelection() {
        this.selectionStart = null;
        this.selectionEnd = null;
        this.canvasManager.updateCanvas();
    }

    showSelectionInfo() {
        if (!this.selectionStart || !this.selectionEnd) return;

        const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);
        
        const width = endX - startX + 1;
        const height = endY - startY + 1;
        const price = width * height * this.canvasManager.PIXEL_PRICE;

        this.showNotification(
            `Selección: (${startX}, ${startY}) - (${endX}, ${endY})\n` +
            `Tamaño: ${width}x${height} píxeles\n` +
            `Precio: $${price}`
        );
    }

    drawSelection() {
        if (!this.isSelecting || !this.selectionStart || !this.selectionEnd) return;
        
        const ctx = this.canvas.getContext('2d');
        this.canvasManager.updateCanvas();

        const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);

        const width = (endX - startX + 1) * this.canvasManager.PIXEL_SIZE;
        const height = (endY - startY + 1) * this.canvasManager.PIXEL_SIZE;

        // Verificar si alguna parte del área está comprada
        let areaDisponible = true;
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (this.canvasManager.isAreaPurchased(x, y)) {
                    areaDisponible = false;
                    break;
                }
            }
            if (!areaDisponible) break;
        }

        ctx.save();
        ctx.translate(this.canvasManager.offsetX, this.canvasManager.offsetY);
        ctx.scale(this.canvasManager.zoomLevel, this.canvasManager.zoomLevel);

        // Color según disponibilidad
        const color = areaDisponible ? 'rgba(0, 255, 0, ' : 'rgba(255, 0, 0, ';
        
        // Dibujar área seleccionada
        ctx.fillStyle = color + '0.2)';
        ctx.fillRect(
            startX * this.canvasManager.PIXEL_SIZE,
            startY * this.canvasManager.PIXEL_SIZE,
            width,
            height
        );

        // Dibujar borde
        ctx.strokeStyle = color + '0.8)';
        ctx.lineWidth = 2 / this.canvasManager.zoomLevel;
        ctx.strokeRect(
            startX * this.canvasManager.PIXEL_SIZE,
            startY * this.canvasManager.PIXEL_SIZE,
            width,
            height
        );

        // Mostrar información en la selección
        const price = (endX - startX + 1) * (endY - startY + 1) * this.canvasManager.PIXEL_PRICE;
        ctx.fillStyle = 'black';
        ctx.font = `${14 / this.canvasManager.zoomLevel}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(
            `${endX - startX + 1}x${endY - startY + 1} píxeles`,
            (startX * this.canvasManager.PIXEL_SIZE) + (width / 2),
            (startY * this.canvasManager.PIXEL_SIZE) + (height / 2) - (10 / this.canvasManager.zoomLevel)
        );
        ctx.fillText(
            `$${price}`,
            (startX * this.canvasManager.PIXEL_SIZE) + (width / 2),
            (startY * this.canvasManager.PIXEL_SIZE) + (height / 2) + (10 / this.canvasManager.zoomLevel)
        );

        ctx.restore();
    }

    showPurchaseModal() {
        if (!this.purchaseModal || !this.selectionStart || !this.selectionEnd) return;

        const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
        const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
        const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
        const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);

        // Verificar si el área está disponible
        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                if (this.canvasManager.isAreaPurchased(x, y)) {
                    this.showNotification('Esta área ya está comprada');
                    this.clearSelection();
                    return;
                }
            }
        }

        const width = endX - startX + 1;
        const height = endY - startY + 1;
        const totalPrice = width * height * this.canvasManager.PIXEL_PRICE;

        document.getElementById('purchase-price').textContent = totalPrice;
        document.getElementById('pixel-coords').textContent = 
            `(${startX}, ${startY}) - (${endX}, ${endY})`;

        this.purchaseModal.classList.add('active');
    }

    handlePurchaseConfirm() {
        const balance = parseInt(this.balanceElement.textContent);
        const price = parseInt(document.getElementById('purchase-price').textContent);
        const [startCoord, endCoord] = document.getElementById('pixel-coords').textContent.split(' - ');
        const [startX, startY] = startCoord.slice(1, -1).split(', ').map(Number);
        const [endX, endY] = endCoord.slice(1, -1).split(', ').map(Number);

        if (balance >= price) {
            if (this.canvasManager.purchaseArea(startX, startY, endX, endY, 'current')) {
                this.balanceElement.textContent = balance - price;
                this.showNotification('¡Compra realizada con éxito! Ahora puedes dibujar en esta área');
            } else {
                this.showNotification('Esta área ya no está disponible');
            }
        } else {
            this.showNotification('Saldo insuficiente');
        }

        this.purchaseModal.classList.remove('active');
        this.clearSelection();
    }

    handlePurchaseCancel() {
        this.purchaseModal.classList.remove('active');
        this.clearSelection();
    }

    handleClick(event) {
        if (this.isDragging || this.isSelecting) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left - this.canvasManager.offsetX) / 
            (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE));
        const y = Math.floor((event.clientY - rect.top - this.canvasManager.offsetY) / 
            (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE));

        // Verificar si el píxel está dentro de un área comprada por el usuario actual
        const areaInfo = this.canvasManager.getAreaOwner(x, y);
        if (!areaInfo) {
            this.showNotification('Debes comprar esta área antes de dibujar');
            return;
        }
        if (areaInfo.owner !== 'current') {
            this.showNotification('No puedes dibujar en áreas compradas por otros usuarios');
            return;
        }

        // Si el área es del usuario actual, permitir dibujar
        if (this.canvasManager.setPixel(x, y, this.colorManager.getSelectedColor())) {
            this.canvasManager.updateCanvas();
        }
    }
}

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading');
    
    // Inicializar managers
    const canvasManager = new CanvasManager();
    const colorManager = new ColorManager();
    const interactionManager = new InteractionManager(canvasManager, colorManager);
    
    // Ocultar pantalla de carga y resetear vista
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        interactionManager.handleReset(); // Aplicar reset inicial
        interactionManager.showNotification('¡Bienvenido al Canvas Colaborativo!');
    }, 1000);
}); 