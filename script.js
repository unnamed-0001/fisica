const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const k = 8.99e9; // Constante de Coulomb (para cálculos relativos)

let charges = [];
let currentChargeType = 'point';
let currentChargeMagnitude = 5;
let currentRadius = 30;
let selectedChargeIndex = -1;
let lastFieldPoint = null;

// Redimensionar canvas al tamaño del contenedor
function resizeCanvas() {
    const container = document.querySelector('.canvas-container');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    
    ctx.scale(dpr, dpr);
    ctx.width = container.clientWidth;
    ctx.height = container.clientHeight;
    
    draw();
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function setChargeType(type) {
    currentChargeType = type;
    const buttons = document.querySelectorAll('.control-group button');
    buttons.forEach(btn => btn.className = 'btn-secondary');
    event.target.className = 'btn-primary';
}

function updateCharge() {
    currentChargeMagnitude = parseFloat(document.getElementById('chargeSlider').value);
    document.getElementById('chargeValue').textContent = currentChargeMagnitude.toFixed(1);
}

function updateRadius() {
    currentRadius = parseFloat(document.getElementById('radiusSlider').value);
    document.getElementById('radiusValue').textContent = currentRadius.toFixed(0);
}

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Validar que no haya singularidades (evitar cargas muy cercanas)
    const minDistance = 50;
    const tooClose = charges.some(charge => {
        const dx = charge.x - x;
        const dy = charge.y - y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
    });
    
    if (tooClose && charges.length > 0) {
        alert('⚠️ Demasiado cerca de otra carga. Mínimo 50 píxeles de distancia.');
        return;
    }
    
    const charge = {
        type: currentChargeType,
        x: x,
        y: y,
        q: currentChargeMagnitude,
        radius: currentRadius,
        id: Date.now()
    };
    
    charges.push(charge);
    updateChargeList();
    draw();
});

// Evento para detectar movimiento del mouse y mostrar campo en ese punto
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastFieldPoint = { x, y };
    draw();
});

function updateChargeList() {
    const list = document.getElementById('chargeList');
    list.innerHTML = '';
    charges.forEach((charge, index) => {
        const item = document.createElement('div');
        item.className = 'charge-item';
        const chargeLabel = getChargeTypeLabel(charge.type);
        const density = calculateDensity(charge);
        item.innerHTML = `
            <div style="flex: 1;">
                <span>${chargeLabel} (${charge.q > 0 ? '+' : ''}${charge.q.toFixed(1)} μC)</span>
                <br><small style="color: #999;">R: ${charge.radius.toFixed(0)}px | ${density}</small>
            </div>
            <button class="btn-danger" onclick="removeCharge(${index})">×</button>
        `;
        list.appendChild(item);
    });
}

function calculateDensity(charge) {
    if (charge.type === 'line') {
        const length = charge.radius * 2;
        const density = charge.q / length;
        return `λ = ${density.toFixed(2)} μC/px`;
    } else if (charge.type === 'ring') {
        const circumference = 2 * Math.PI * charge.radius;
        const density = charge.q / circumference;
        return `λ = ${density.toFixed(2)} μC/px`;
    } else if (charge.type === 'disk') {
        const area = Math.PI * charge.radius * charge.radius;
        const density = charge.q / area;
        return `σ = ${density.toFixed(4)} μC/px²`;
    }
    return '';
}

function getChargeTypeLabel(type) {
    const labels = {
        'point': '● Puntual',
        'line': '⊢ Línea',
        'ring': '◯ Anillo',
        'disk': '◉ Disco'
    };
    return labels[type] || type;
}

function removeCharge(index) {
    charges.splice(index, 1);
    updateChargeList();
    draw();
}

function clearCharges() {
    charges = [];
    updateChargeList();
    draw();
}

function getElectricField(x, y) {
    let Ex = 0;
    let Ey = 0;

    charges.forEach(charge => {
        if (charge.type === 'point') {
            const dx = x - charge.x;
            const dy = y - charge.y;
            const r2 = dx * dx + dy * dy;
            const r = Math.sqrt(r2);
            
            if (r > 5) {
                const E = charge.q / (r2 * 0.01);
                Ex += E * dx / r;
                Ey += E * dy / r;
            }
        } else if (charge.type === 'line') {
            const lineLength = charge.radius * 2;
            const segments = 30;
            for (let i = 0; i < segments; i++) {
                const py = charge.y - charge.radius + (lineLength * i / segments);
                const dx = x - charge.x;
                const dy = y - py;
                const r2 = dx * dx + dy * dy;
                const r = Math.sqrt(r2);
                
                if (r > 2) {
                    const dq = charge.q / segments;
                    const E = dq / (r2 * 0.01);
                    Ex += E * dx / r;
                    Ey += E * dy / r;
                }
            }
        } else if (charge.type === 'ring') {
            const segments = 32;
            for (let i = 0; i < segments; i++) {
                const angle = (2 * Math.PI * i) / segments;
                const px = charge.x + charge.radius * Math.cos(angle);
                const py = charge.y + charge.radius * Math.sin(angle);
                const dx = x - px;
                const dy = y - py;
                const r2 = dx * dx + dy * dy;
                const r = Math.sqrt(r2);
                
                if (r > 2) {
                    const dq = charge.q / segments;
                    const E = dq / (r2 * 0.01);
                    Ex += E * dx / r;
                    Ey += E * dy / r;
                }
            }
        } else if (charge.type === 'disk') {
            const rings = 6;
            const segmentsPerRing = 20;
            for (let ring = 1; ring <= rings; ring++) {
                const radius = (charge.radius * ring) / rings;
                for (let i = 0; i < segmentsPerRing; i++) {
                    const angle = (2 * Math.PI * i) / segmentsPerRing;
                    const px = charge.x + radius * Math.cos(angle);
                    const py = charge.y + radius * Math.sin(angle);
                    const dx = x - px;
                    const dy = y - py;
                    const r2 = dx * dx + dy * dy;
                    const r = Math.sqrt(r2);
                    
                    if (r > 2) {
                        const dq = charge.q / (rings * segmentsPerRing);
                        const E = dq / (r2 * 0.01);
                        Ex += E * dx / r;
                        Ey += E * dy / r;
                    }
                }
            }
        }
    });

    return { Ex, Ey };
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const showField = document.getElementById('showField').checked;
    const showLines = document.getElementById('showLines').checked;
    const showPotential = document.getElementById('showPotential').checked;

    // Dibujar potencial (fondo de color)
    if (showPotential && charges.length > 0) {
        const gridSize = 20;
        for (let x = 0; x < canvas.width; x += gridSize) {
            for (let y = 0; y < canvas.height; y += gridSize) {
                const field = getElectricField(x, y);
                const magnitude = Math.sqrt(field.Ex * field.Ex + field.Ey * field.Ey);
                const intensity = Math.min(magnitude * 5, 255);
                ctx.fillStyle = `rgba(100, 150, 255, ${intensity / 500})`;
                ctx.fillRect(x, y, gridSize, gridSize);
            }
        }
    }

    // Dibujar líneas de campo para cargas positivas Y negativas
    if (showLines && charges.length > 0) {
        charges.forEach(charge => {
            const numLines = Math.abs(charge.q) * 3;
            for (let i = 0; i < numLines; i++) {
                const angle = (2 * Math.PI * i) / numLines;
                drawFieldLine(charge.x, charge.y, angle, charge.q > 0);
            }
        });
    }

    // Dibujar vectores de campo
    if (showField) {
        const gridSize = 40;
        for (let x = gridSize; x < canvas.width; x += gridSize) {
            for (let y = gridSize; y < canvas.height; y += gridSize) {
                const field = getElectricField(x, y);
                const magnitude = Math.sqrt(field.Ex * field.Ex + field.Ey * field.Ey);
                
                if (magnitude > 0.5) {
                    const scale = Math.min(15 / magnitude, 15);
                    drawArrow(x, y, field.Ex * scale, field.Ey * scale);
                }
            }
        }
    }

    // Dibujar cargas
    charges.forEach(charge => {
        if (charge.type === 'point') {
            ctx.beginPath();
            ctx.arc(charge.x, charge.y, 15, 0, 2 * Math.PI);
            ctx.fillStyle = charge.q > 0 ? '#ff4757' : '#3742fa';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(charge.q > 0 ? '+' : '−', charge.x, charge.y);
        } else if (charge.type === 'line') {
            ctx.beginPath();
            ctx.moveTo(charge.x, charge.y - charge.radius);
            ctx.lineTo(charge.x, charge.y + charge.radius);
            ctx.strokeStyle = charge.q > 0 ? '#ff4757' : '#3742fa';
            ctx.lineWidth = 8;
            ctx.stroke();
            
            const numPoints = 8;
            for (let i = 0; i < numPoints; i++) {
                const py = charge.y - charge.radius + (2 * charge.radius * i / (numPoints - 1));
                ctx.beginPath();
                ctx.arc(charge.x, py, 4, 0, 2 * Math.PI);
                ctx.fillStyle = 'white';
                ctx.fill();
            }
        } else if (charge.type === 'ring') {
            ctx.beginPath();
            ctx.arc(charge.x, charge.y, charge.radius, 0, 2 * Math.PI);
            ctx.strokeStyle = charge.q > 0 ? '#ff4757' : '#3742fa';
            ctx.lineWidth = 8;
            ctx.stroke();
            
            const numPoints = 16;
            for (let i = 0; i < numPoints; i++) {
                const angle = (2 * Math.PI * i) / numPoints;
                const px = charge.x + charge.radius * Math.cos(angle);
                const py = charge.y + charge.radius * Math.sin(angle);
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, 2 * Math.PI);
                ctx.fillStyle = 'white';
                ctx.fill();
            }
        } else if (charge.type === 'disk') {
            ctx.beginPath();
            ctx.arc(charge.x, charge.y, charge.radius, 0, 2 * Math.PI);
            ctx.fillStyle = charge.q > 0 ? 'rgba(255, 71, 87, 0.3)' : 'rgba(55, 66, 250, 0.3)';
            ctx.fill();
            ctx.strokeStyle = charge.q > 0 ? '#ff4757' : '#3742fa';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            const numRings = 4;
            const pointsPerRing = 12;
            for (let ring = 1; ring <= numRings; ring++) {
                const radius = (charge.radius * ring) / numRings;
                for (let i = 0; i < pointsPerRing; i++) {
                    const angle = (2 * Math.PI * i) / pointsPerRing;
                    const px = charge.x + radius * Math.cos(angle);
                    const py = charge.y + radius * Math.sin(angle);
                    ctx.beginPath();
                    ctx.arc(px, py, 3, 0, 2 * Math.PI);
                    ctx.fillStyle = 'white';
                    ctx.fill();
                }
            }
        }
    });

    // Mostrar información del campo en el cursor
    if (lastFieldPoint && charges.length > 0) {
        displayFieldInfo(lastFieldPoint.x, lastFieldPoint.y);
    }

    // Dibujar leyenda
    drawLegend();
}

function displayFieldInfo(x, y) {
    const field = getElectricField(x, y);
    const magnitude = Math.sqrt(field.Ex * field.Ex + field.Ey * field.Ey);
    const angle = Math.atan2(field.Ey, field.Ex) * (180 / Math.PI);
    
    const panelX = 10;
    const panelY = 130;
    const panelWidth = 230;
    const panelHeight = 120;
    
    // Panel de fondo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Título
    ctx.fillStyle = '#667eea';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('📊 Campo Eléctrico', panelX + 10, panelY + 18);
    
    // Línea separadora
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 5, panelY + 25);
    ctx.lineTo(panelX + panelWidth - 5, panelY + 25);
    ctx.stroke();
    
    // Datos
    ctx.fillStyle = '#333';
    ctx.font = '11px monospace';
    let yOffset = panelY + 40;
    
    ctx.fillText(`Posición: (${Math.round(x)}, ${Math.round(y)}) px`, panelX + 10, yOffset);
    yOffset += 16;
    
    ctx.fillText(`Ex = ${field.Ex.toFixed(3)} N/C`, panelX + 10, yOffset);
    yOffset += 14;
    
    ctx.fillText(`Ey = ${field.Ey.toFixed(3)} N/C`, panelX + 10, yOffset);
    yOffset += 14;
    
    ctx.fillText(`|E| = ${magnitude.toFixed(3)} N/C`, panelX + 10, yOffset);
    yOffset += 14;
    
    ctx.fillText(`θ = ${angle.toFixed(1)}°`, panelX + 10, yOffset);
    
    // Indicador de punto en el canvas
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawLegend() {
    const legendX = 10;
    const legendY = 10;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legendX, legendY, 180, 110);
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.strokeRect(legendX, legendY, 180, 110);
    
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    
    ctx.fillText('Leyenda:', legendX + 10, legendY + 20);
    
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.arc(legendX + 20, legendY + 40, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.font = '11px Arial';
    ctx.fillText('Carga (+)', legendX + 35, legendY + 45);
    
    ctx.fillStyle = '#3742fa';
    ctx.beginPath();
    ctx.arc(legendX + 20, legendY + 65, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.fillText('Carga (−)', legendX + 35, legendY + 70);
    
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(legendX + 10, legendY + 90);
    ctx.lineTo(legendX + 30, legendY + 90);
    ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.fillText('Campo E', legendX + 35, legendY + 95);
}

function drawArrow(x, y, dx, dy) {
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude < 0.1) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const headLen = 5;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(x + dx, y + dy);
    ctx.lineTo(x + dx - headLen * Math.cos(angle - Math.PI / 6), y + dy - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x + dx - headLen * Math.cos(angle + Math.PI / 6), y + dy - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = 'rgba(102, 126, 234, 0.7)';
    ctx.fill();
}

function drawFieldLine(startX, startY, angle, positive) {
    let x = startX + Math.cos(angle) * 20;
    let y = startY + Math.sin(angle) * 20;
    const step = 3;
    const maxSteps = 200;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = positive ? 'rgba(255, 71, 87, 0.4)' : 'rgba(55, 66, 250, 0.4)';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < maxSteps; i++) {
        if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) break;

        const field = getElectricField(x, y);
        const magnitude = Math.sqrt(field.Ex * field.Ex + field.Ey * field.Ey);
        
        if (magnitude < 0.1) break;

        const direction = positive ? 1 : -1;
        x += direction * (field.Ex / magnitude) * step;
        y += direction * (field.Ey / magnitude) * step;

        ctx.lineTo(x, y);
    }

    ctx.stroke();
}

draw();