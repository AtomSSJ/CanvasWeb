class InteractionManager {
    constructor(canvasManager, colorManager) {
        this.canvasManager = canvasManager;
        this.colorManager = colorManager;
        this.drawingLayer = document.getElementById('drawing-layer');
        
        this.state = {
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0,
            lastDrawX: -1,
            lastDrawY: -1
        };

        this.setupElements();
        this.initializeEventListeners();
        this.setupKeyboardShortcuts();
    }

    setupElements() {
        this.coordinatesElement = document.getElementById('coordinates');
        this.notificationsElement = document.getElementById('notifications');
        this.zoomInButton = document.getElementById('zoom-in');
        this.zoomOutButton = document.getElementById('zoom-out');
        this.resetViewButton = document.getElementById('reset-view');
    }

    initializeEventListeners() {
        // Mouse events con throttling
        this.drawingLayer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.drawingLayer.addEventListener('mousemove', this.throttle(this.handleMouseMove.bind(this), 16));
        this.drawingLayer.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.drawingLayer.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.drawingLayer.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Touch events
        this.drawingLayer.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.drawingLayer.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.drawingLayer.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Button controls
        this.zoomInButton.addEventListener('click', () => this.handleZoomIn());
        this.zoomOutButton.addEventListener('click', () => this.handleZoomOut());
        this.resetViewButton.addEventListener('click', () => this.handleReset());
        
        // Mouse coordinate tracking con debounce
        this.drawingLayer.addEventListener('mousemove', 
            this.debounce(this.updateCoordinates.bind(this), 100)
        );

        // Click para dibujar con debounce
        this.drawingLayer.addEventListener('click', 
            this.debounce(this.handleClick.bind(this), 50)
        );
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

    // Event Handlers optimizados
    handleMouseDown(event) {
        if (event.button === 0) {
            this.state.isDragging = true;
            this.state.lastMouseX = event.clientX;
            this.state.lastMouseY = event.clientY;
            this.drawingLayer.style.cursor = 'grabbing';
        }
    }

    handleMouseMove(event) {
        if (this.state.isDragging) {
            const dx = event.clientX - this.state.lastMouseX;
            const dy = event.clientY - this.state.lastMouseY;
            
            this.canvasManager.pan(dx, dy);
            
            this.state.lastMouseX = event.clientX;
            this.state.lastMouseY = event.clientY;
        }
    }

    handleMouseUp() {
        this.state.isDragging = false;
        this.drawingLayer.style.cursor = 'default';
    }

    handleMouseLeave() {
        this.state.isDragging = false;
        this.drawingLayer.style.cursor = 'default';
    }

    handleWheel(event) {
        event.preventDefault();
        
        const rect = this.drawingLayer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const newZoom = this.canvasManager.zoomLevel * (event.deltaY < 0 ? 1.1 : 0.9);
        this.canvasManager.setZoom(newZoom, mouseX, mouseY);
    }

    handleClick(event) {
        if (this.state.isDragging) return;

        const rect = this.drawingLayer.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left - this.canvasManager.offsetX) / 
            (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE));
        const y = Math.floor((event.clientY - rect.top - this.canvasManager.offsetY) / 
            (this.canvasManager.zoomLevel * this.canvasManager.PIXEL_SIZE));

        if (this.canvasManager.setPixel(x, y, this.colorManager.getSelectedColor())) {
            this.state.lastDrawX = x;
            this.state.lastDrawY = y;
        }
    }

    // Touch Events
    handleTouchStart(event) {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.state.lastMouseX = touch.clientX;
            this.state.lastMouseY = touch.clientY;
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            const dx = touch.clientX - this.state.lastMouseX;
            const dy = touch.clientY - this.state.lastMouseY;
            
            this.canvasManager.pan(dx, dy);
            
            this.state.lastMouseX = touch.clientX;
            this.state.lastMouseY = touch.clientY;
        }
    }

    handleTouchEnd() {
        this.state.lastDrawX = -1;
        this.state.lastDrawY = -1;
    }

    // UI Controls
    handleZoomIn() {
        const centerX = this.drawingLayer.width / 2;
        const centerY = this.drawingLayer.height / 2;
        this.canvasManager.setZoom(this.canvasManager.zoomLevel * 1.2, centerX, centerY);
    }

    handleZoomOut() {
        const centerX = this.drawingLayer.width / 2;
        const centerY = this.drawingLayer.height / 2;
        this.canvasManager.setZoom(this.canvasManager.zoomLevel / 1.2, centerX, centerY);
    }

    handleReset() {
        this.canvasManager.reset();
    }

    // Utilidades
    updateCoordinates(event) {
        const rect = this.drawingLayer.getBoundingClientRect();
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

    // Optimización de rendimiento
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        }
    }
} 