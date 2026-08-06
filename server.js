const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// Tipos MIME para el servidor de archivos estáticos
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg'
};

// Servidor HTTP
const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    // Normalizar la URL
    let filePath = req.url === '/' || req.url.startsWith('/?') ? '/index.html' : req.url;
    // Quitar query params para resolver el archivo físico
    filePath = filePath.split('?')[0];
    
    const absolutePath = path.join(__dirname, filePath);
    const ext = path.extname(absolutePath).toLowerCase();
    
    fs.readFile(absolutePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 - Archivo no encontrado');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(`500 - Error interno del servidor: ${err.code}`);
            }
        } else {
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content);
        }
    });
});

// Intentar cargar la librería 'ws' para la linterna inteligente
let wss = null;
try {
    const WebSocket = require('ws');
    wss = new WebSocket.Server({ server });
    
    // Mapeo de linternas conectadas (ej: las del guía o luces decorativas del mausoleo)
    const lanternClients = new Set();
    // Mapeo de visitantes/teléfonos conectados
    const visitorClients = new Set();

    // Colores asociados a las estaciones
    const stationColors = {
        'default': { name: 'Dorado Antiguo', color: '#c5a059' },
        'cabral': { name: 'Rojo Escarlata', color: '#ff3b30' },
        'pampin': { name: 'Azul Victoriano', color: '#007aff' },
        'madariaga': { name: 'Verde Militar', color: '#34c759' },
        'poeta': { name: 'Púrpura Místico', color: '#af52de' }
    };

    wss.on('connection', (ws) => {
        console.log('Nueva conexión WebSocket establecida.');
        visitorClients.add(ws);
        
        ws.on('message', (messageStr) => {
            try {
                const msg = JSON.parse(messageStr);
                console.log('Mensaje recibido:', msg);

                if (msg.type === 'STATION_ACTIVE') {
                    console.log(`Estación activa: ${msg.station}. Cambiando luces del guía.`);
                    // Obtener color configurado para esta estación o usar el provisto
                    const colorData = stationColors[msg.station] || { name: 'Sincronizado', color: msg.color || '#ffd700' };
                    
                    // Retransmitir a todos los clientes el cambio de color para la linterna
                    broadcast({
                        type: 'LANTERN_COLOR_CHANGED',
                        station: msg.station,
                        color: colorData.color,
                        name: colorData.name
                    });
                }
                
                if (msg.type === 'PHOTO_CAPTURED') {
                    console.log(`¡Foto capturada en estación ${msg.station}! Emitiendo destello en linternas.`);
                    
                    // Simulamos un destello rápido de cámara blanca (blanco y luego vuelve al color)
                    broadcast({
                        type: 'LANTERN_COLOR_CHANGED',
                        color: '#ffffff',
                        name: '¡Flash de Cámara!'
                    });
                    
                    // Volver al color de la estación después de 1 segundo
                    setTimeout(() => {
                        const colorData = stationColors[msg.station] || { name: 'Sincronizado', color: '#ffd700' };
                        broadcast({
                            type: 'LANTERN_COLOR_CHANGED',
                            station: msg.station,
                            color: colorData.color,
                            name: colorData.name
                        });
                    }, 1000);
                }
            } catch (e) {
                console.warn('Error al procesar mensaje JSON:', messageStr, e);
            }
        });

        ws.on('close', () => {
            console.log('Conexión WebSocket cerrada.');
            visitorClients.delete(ws);
        });
    });

    function broadcast(dataObj) {
        const msgToSend = JSON.stringify(dataObj);
        visitorClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msgToSend);
            }
        });
    }

    console.log('Soporte de WebSockets para Linterna 3D/Sincronizada activado con éxito.');
} catch (err) {
    console.warn('Librería "ws" no disponible. El servidor funcionará solo en modo HTTP estándar.');
    console.warn('Para habilitar WebSockets y la sincronización de linternas, ejecuta: npm install ws');
}

// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`============================================================`);
    console.log(`SERVIDOR DE DESARROLLO - CEMENTERIO NFC PWA`);
    console.log(`============================================================`);
    console.log(`Accede de forma local en tu computadora:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`Accede desde tu celular en la misma red Wi-Fi:`);
    console.log(`   http://[TU-IP-LOCAL]:${PORT}`);
    console.log(`============================================================`);
});
