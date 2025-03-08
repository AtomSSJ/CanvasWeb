document.addEventListener('DOMContentLoaded', () => {
    const loadingScreen = document.getElementById('loading');
    
    // Inicializar managers
    const canvasManager = new CanvasManager();
    const colorManager = new ColorManager();
    const interactionManager = new InteractionManager(canvasManager, colorManager);
    
    // Configurar Service Worker para PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registrado con éxito:', registration.scope);
            })
            .catch(error => {
                console.log('Error al registrar ServiceWorker:', error);
            });
    }

    // Sistema de caché para píxeles
    const pixelCache = new Map();
    const CACHE_LIMIT = 1000;

    function cachePixel(x, y, color) {
        const key = `${x},${y}`;
        pixelCache.set(key, {
            color,
            timestamp: Date.now()
        });

        // Limpiar caché si excede el límite
        if (pixelCache.size > CACHE_LIMIT) {
            const oldestKey = Array.from(pixelCache.entries())
                .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0][0];
            pixelCache.delete(oldestKey);
        }
    }

    // Optimización de memoria
    function cleanupUnusedResources() {
        pixelCache.forEach((value, key) => {
            if (Date.now() - value.timestamp > 300000) { // 5 minutos
                pixelCache.delete(key);
            }
        });
    }

    // Ejecutar limpieza cada 5 minutos
    setInterval(cleanupUnusedResources, 300000);

    // Sistema de métricas de rendimiento
    const metrics = {
        fps: 0,
        drawCalls: 0,
        lastFrameTime: performance.now()
    };

    function updateMetrics() {
        const now = performance.now();
        const delta = now - metrics.lastFrameTime;
        metrics.fps = Math.round(1000 / delta);
        metrics.lastFrameTime = now;
        metrics.drawCalls = 0;
    }

    // Monitorear rendimiento
    if (process.env.NODE_ENV === 'development') {
        setInterval(() => {
            console.log(`FPS: ${metrics.fps}, Draw Calls: ${metrics.drawCalls}`);
        }, 1000);
    }

    // Ocultar pantalla de carga y mostrar notificación de bienvenida
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        interactionManager.handleReset();
        interactionManager.showNotification('¡Bienvenido al Canvas Colaborativo!');
    }, 1000);
}); 