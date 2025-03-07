document.addEventListener('DOMContentLoaded', function () {
    // Referencias al DOM
    const canvas = document.getElementById('pixel-canvas');
    const ctx = canvas.getContext('2d');
    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const resetViewButton = document.getElementById('reset-view');
    const loadingScreen = document.getElementById('loading');
    const colorInput = document.getElementById("color-input");
    const colorHex = document.getElementById("color-hex");
    const colorSlider = document.getElementById("color-slider");
    const presetColors = document.querySelectorAll(".color");
    const colorPaletteDiv = document.getElementById('color-palette');
    const paletteHandle = document.getElementById('palette-handle');
    const userPanel = document.getElementById('user-panel');
    const balanceAmount = document.getElementById('balance-amount');
    const purchaseModal = document.getElementById('purchase-modal');
    const confirmPurchaseBtn = document.getElementById('confirm-purchase');
    const cancelPurchaseBtn = document.getElementById('cancel-purchase');
    const pixelCoordsSpan = document.getElementById('pixel-coords');

    // Constantes
    const CANVAS_SIZE = 10000;
    const PIXEL_SIZE = 5;
    const MAX_INDEX = CANVAS_SIZE / PIXEL_SIZE;
    const PIXEL_PRICE = 10;
    const maxZoom = 10;

    // Variables de estado
    let zoomLevel = 1;
    let offsetX = 0;
    let offsetY = 0;
    let minZoom = 0.1;
    let isMouseDown = false;
    let mouseMoved = false;
    let lastMouseX = 0, lastMouseY = 0;
    let isShiftPressed = false;
    let selectionStart = null;
    let selectionEnd = null;
    let isDragging = false;
    let selectedRegion = null;
    let userBalance = 1000;
    let baseHSL = { h: 0, s: 0, l: 50 };
    let selectedColor = "#000000";

    // Estructuras de datos
    let pixels = {};
    let purchasedRegions = [];

    // Inicialización del canvas
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    // Funciones de utilidad
    function calcMinZoom() {
        const ratioW = window.innerWidth / CANVAS_SIZE;
        const ratioH = window.innerHeight / CANVAS_SIZE;
        return Math.min(ratioW, ratioH);
    }

    function centerCanvas() {
        const visibleWidth = CANVAS_SIZE * zoomLevel;
        const visibleHeight = CANVAS_SIZE * zoomLevel;
        offsetX = (window.innerWidth - visibleWidth) / 2;
        offsetY = (window.innerHeight - visibleHeight) / 2;
    }

    function drawGrid() {
        ctx.strokeStyle = "#ddd";
        for (let x = 0; x < CANVAS_SIZE; x += PIXEL_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_SIZE);
            ctx.stroke();
        }
        for (let y = 0; y < CANVAS_SIZE; y += PIXEL_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_SIZE, y);
            ctx.stroke();
        }
    }

    function updateCanvas() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoomLevel, zoomLevel);
        drawGrid();

        // Dibujar regiones compradas
        purchasedRegions.forEach(region => {
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                region.minX * PIXEL_SIZE,
                region.minY * PIXEL_SIZE,
                (region.maxX - region.minX + 1) * PIXEL_SIZE,
                (region.maxY - region.minY + 1) * PIXEL_SIZE
            );
        });

        // Dibujar píxeles
        for (const key in pixels) {
            const [px, py] = key.split(',').map(Number);
            ctx.fillStyle = pixels[key];
            ctx.fillRect(px * PIXEL_SIZE, py * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
        }

        // Dibujar selección actual
        if (isShiftPressed && selectionStart) {
            drawSelection();
        }
    }

    function drawSelection() {
        if (selectionStart && selectionEnd) {
            const [startX, startY] = selectionStart;
            const [endX, endY] = selectionEnd;
            
            const minX = Math.min(startX, endX);
            const maxX = Math.max(startX, endX);
            const minY = Math.min(startY, endY);
            const maxY = Math.max(startY, endY);
            
            ctx.save();
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            ctx.strokeRect(
                minX * PIXEL_SIZE,
                minY * PIXEL_SIZE,
                (maxX - minX + 1) * PIXEL_SIZE,
                (maxY - minY + 1) * PIXEL_SIZE
            );
            
            ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            ctx.fillRect(
                minX * PIXEL_SIZE,
                minY * PIXEL_SIZE,
                (maxX - minX + 1) * PIXEL_SIZE,
                (maxY - minY + 1) * PIXEL_SIZE
            );
            
            ctx.restore();
        }
    }

    function isInPurchasedRegion(x, y) {
        return purchasedRegions.some(region => {
            return x >= region.minX && x <= region.maxX &&
                   y >= region.minY && y <= region.maxY;
        });
    }

    function doesRegionOverlap(minX, minY, maxX, maxY) {
        return purchasedRegions.some(region => {
            return !(maxX < region.minX || minX > region.maxX ||
                    maxY < region.minY || minY > region.maxY);
        });
    }

    function calculateRegionPrice(minX, minY, maxX, maxY) {
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        return width * height * PIXEL_PRICE;
    }

    function updateBalance() {
        balanceAmount.textContent = userBalance;
    }

    function paintPixel(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left - offsetX) / (zoomLevel * PIXEL_SIZE));
        const y = Math.floor((e.clientY - rect.top - offsetY) / (zoomLevel * PIXEL_SIZE));

        if (x < 0 || x >= MAX_INDEX || y < 0 || y >= MAX_INDEX) return;

        if (!isInPurchasedRegion(x, y)) {
            alert('Solo puedes dibujar en regiones que hayas comprado');
            return;
        }

        const key = `${x},${y}`;
        pixels[key] = selectedColor;
        updateCanvas();
    }

    // Event Listeners
    canvas.addEventListener("mousedown", function (e) {
        if (e.button === 0) {
            isMouseDown = true;
            mouseMoved = false;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            
            if (isShiftPressed) {
                const rect = canvas.getBoundingClientRect();
                const x = Math.floor((e.clientX - rect.left - offsetX) / (zoomLevel * PIXEL_SIZE));
                const y = Math.floor((e.clientY - rect.top - offsetY) / (zoomLevel * PIXEL_SIZE));
                selectionStart = [x, y];
                selectionEnd = [x, y];
            } else {
                canvas.style.cursor = "grabbing";
                isDragging = true;
            }
        }
    });

    canvas.addEventListener("mousemove", function (e) {
        if (!isMouseDown) return;

        if (isShiftPressed && selectionStart) {
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left - offsetX) / (zoomLevel * PIXEL_SIZE));
            const y = Math.floor((e.clientY - rect.top - offsetY) / (zoomLevel * PIXEL_SIZE));
            selectionEnd = [x, y];
            updateCanvas();
        } else if (isDragging) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                mouseMoved = true;
            }

            offsetX += dx;
            offsetY += dy;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            updateCanvas();
        }
    });

    canvas.addEventListener("mouseup", function (e) {
        if (e.button === 0) {
            if (!isShiftPressed && !mouseMoved) {
                paintPixel(e);
            }
            isMouseDown = false;
            isDragging = false;
            canvas.style.cursor = isShiftPressed ? "crosshair" : "default";
        }
    });

    canvas.addEventListener("mouseleave", function () {
        isMouseDown = false;
        canvas.style.cursor = "default";
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Shift') {
            isShiftPressed = true;
            canvas.style.cursor = 'crosshair';
        }
    });

    document.addEventListener('keyup', function(e) {
        if (e.key === 'Shift' && selectionStart && selectionEnd) {
            isShiftPressed = false;
            canvas.style.cursor = 'default';

            const [startX, startY] = selectionStart;
            const [endX, endY] = selectionEnd;
            
            const minX = Math.min(startX, endX);
            const maxX = Math.max(startX, endX);
            const minY = Math.min(startY, endY);
            const maxY = Math.max(startY, endY);

            if (doesRegionOverlap(minX, minY, maxX, maxY)) {
                alert('Esta región se superpone con una región ya comprada');
                selectionStart = null;
                selectionEnd = null;
                updateCanvas();
                return;
            }

            const price = calculateRegionPrice(minX, minY, maxX, maxY);
            
            if (userBalance >= price) {
                if (confirm(`¿Deseas comprar esta región por $${price}?`)) {
                    userBalance -= price;
                    purchasedRegions.push({ minX, minY, maxX, maxY });
                    updateBalance();
                }
            } else {
                alert('No tienes suficiente saldo para comprar esta región');
            }

            selectionStart = null;
            selectionEnd = null;
            updateCanvas();
        }
    });

    // Color management
    function updateSelectedColor(color) {
        selectedColor = color;
        colorInput.value = color;
        colorHex.value = color.toUpperCase();
        document.querySelector(".color.selected")?.classList.remove("selected");
    }

    colorInput.addEventListener("input", (e) => updateSelectedColor(e.target.value));
    colorHex.addEventListener("input", (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            updateSelectedColor(e.target.value);
        }
    });

    presetColors.forEach(colorDiv => {
        colorDiv.addEventListener("click", () => {
            updateSelectedColor(colorDiv.getAttribute("data-color"));
            colorDiv.classList.add("selected");
        });
    });

    // Zoom controls
    zoomInButton.addEventListener("click", function () {
        zoomLevel = Math.min(zoomLevel * 1.2, maxZoom);
        updateCanvas();
    });

    zoomOutButton.addEventListener("click", function () {
        zoomLevel = Math.max(zoomLevel / 1.2, minZoom);
        updateCanvas();
    });

    resetViewButton.addEventListener("click", function () {
        zoomLevel = minZoom;
        centerCanvas();
        updateCanvas();
    });

    canvas.addEventListener("wheel", function (event) {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        const canvasX = (mouseX - offsetX) / zoomLevel;
        const canvasY = (mouseY - offsetY) / zoomLevel;
        let newZoom = zoomLevel * (event.deltaY < 0 ? 1.1 : 0.9);
        newZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
        offsetX = mouseX - canvasX * newZoom;
        offsetY = mouseY - canvasY * newZoom;
        zoomLevel = newZoom;
        updateCanvas();
    });

    // Palette handle
    paletteHandle.addEventListener("click", function () {
        colorPaletteDiv.classList.toggle('hidden');
    });

    // Initialization
    setTimeout(() => {
        loadingScreen.style.display = "none";
        minZoom = calcMinZoom();
        zoomLevel = minZoom;
        centerCanvas();
        updateCanvas();
    }, 1000);
}); 