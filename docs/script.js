const canvas = document.getElementById('shelfCanvas');
const smoothCanvas = document.getElementById('smoothCanvas');
let mouseX = 0;
let mouseY = 0;

const sharp_ctx = canvas.getContext('2d');
const smooth_ctx = smoothCanvas.getContext('2d');
let ctx = sharp_ctx;
let points = [];
let disabledPoints = []; // Track indices of disabled points
let mergedPoints = []; // Track merged points
let isDragging = false;
let dragIndex = -1;
let hoverIndex = -1;
let gridSize = 20; // Default grid size

let zoomLevel = 1;
let panX = 0;
let panY = 0;
function medianFilterImageData(imageData, windowSize = 3) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const result = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const windowR = [];
            const windowG = [];
            const windowB = [];

            for (let dy = -Math.floor(windowSize / 2); dy <= Math.floor(windowSize / 2); dy++) {
                for (let dx = -Math.floor(windowSize / 2); dx <= Math.floor(windowSize / 2); dx++) {
                    const ny = y + dy;
                    const nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        const i = (ny * width + nx) * 4;
                        windowR.push(data[i]);
                        windowG.push(data[i + 1]);
                        windowB.push(data[i + 2]);
                    }
                }
            }

            windowR.sort((a, b) => a - b);
            windowG.sort((a, b) => a - b);
            windowB.sort((a, b) => a - b);

            const i = (y * width + x) * 4;
            result[i] = windowR[Math.floor(windowR.length / 2)];
            result[i + 1] = windowG[Math.floor(windowG.length / 2)];
            result[i + 2] = windowB[Math.floor(windowB.length / 2)];
            result[i + 3] = data[i + 3]; // Keep original alpha
        }
    }

    return new ImageData(result, width, height);
}

function drawPoints_body(smooth = 0, shapesonly = false) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(zoomLevel, zoomLevel);

    ctx.translate(panX, panY);
    drawVoronoi(!shapesonly, smooth = smooth);
    if (shapesonly) {
        ctx.restore();
        return
    }
    // const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // const filteredImageData = medianFilterImageData(imageData, 3); // 3x3 window

    // smooth_ctx.putImageData(filteredImageData, 0, 0);
    // Draw grid
    drawGrid();

    // Draw Voronoi diagram

    // Draw points
    points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point[0], point[1], 5, 0, Math.PI * 2);
        if (index === hoverIndex) {
            ctx.fillStyle = 'red';
        } else if (disabledPoints.includes(index)) {
            ctx.fillStyle = 'gray'; // Set disabled point color to gray
        } else {
            ctx.fillStyle = 'black';
        }
        ctx.fill();
    });

    // Draw merged point connections
    ctx.beginPath();
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 3;
    mergedPoints.forEach(ps => {
        ctx.moveTo(points[ps[0]][0], points[ps[0]][1]);
        ps.slice(1).forEach(e => ctx.lineTo(points[e][0], points[e][1]));
    });
    ctx.stroke();

    ctx.restore();
}

function drawPoints() {

    ctx = smooth_ctx;
    drawPoints_body(smooth = 5, shapesonly = true);
    ctx = sharp_ctx;
    drawPoints_body();
}
function drawGrid() {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= canvas.width / zoomLevel; x += gridSize) {
        ctx.moveTo(x - panX + panX % gridSize, -panY);
        ctx.lineTo(x - panX + panX % gridSize, (canvas.height / zoomLevel) - panY);
    }

    for (let y = 0; y <= canvas.height / zoomLevel; y += gridSize) {
        ctx.moveTo(-panX, y - panY + panY % gridSize);
        ctx.lineTo((canvas.width / zoomLevel) - panX, y - panY + panY % gridSize);
    }

    ctx.stroke();
}
// Function to generate a pastel color
function generatePastelColor() {
    const r = Math.floor((Math.random() * 127) + 127); // Random value between 127 and 254
    const g = Math.floor((Math.random() * 127) + 127); // Random value between 127 and 254
    const b = Math.floor((Math.random() * 127) + 127);
    return `rgb(${r}, ${g}, ${b})`;
}

// Generate a palette of 12 pastel colors
let pastelPalette = [];
for (let i = 0; i < 12; i++) {
    pastelPalette.push(generatePastelColor());
}
function chaikinCurveClosed(points, max_movement = 30, iterations = 1) {
    for (let i = 0; i < iterations; i++) {
        const newPoints = [];

        for (let j = 0; j < points.length; j++) {
            const p0 = points[j];
            const p1 = points[(j + 1) % points.length]; // Wrap around to the first point

            // Compute new points (using 1/4 and 3/4 of the distance)
            let Q = [
                0.75 * p0[0] + 0.25 * p1[0],
                0.75 * p0[1] + 0.25 * p1[1]
            ];
            let R = [
                0.25 * p0[0] + 0.75 * p1[0],
                0.25 * p0[1] + 0.75 * p1[1]
            ];

            // Limit movement of Q
            Q = limitMovement(p0, Q, max_movement);

            // Limit movement of R
            R = limitMovement(p1, R, max_movement);

            // Add the interpolated points to the new points array
            newPoints.push(Q);
            newPoints.push(R);
        }
        points = newPoints;
    }
    return points;
}

function limitMovement(originalPoint, newPoint, maxDistance) {
    const dx = newPoint[0] - originalPoint[0];
    const dy = newPoint[1] - originalPoint[1];
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDistance) {
        const ratio = maxDistance / distance;
        return [
            originalPoint[0] + dx * ratio,
            originalPoint[1] + dy * ratio
        ];
    }

    return newPoint;
}
function laplaceSmoothing(points, iterations = 1) {
    for (let k = 0; k < iterations; k++) {
        const newPoints = [];
        for (let i = 0; i < points.length; i++) {
            const prev = points[(i - 1 + points.length) % points.length];
            const next = points[(i + 1) % points.length];
            const p = points[i];

            const smoothedPoint = [
                (prev[0] + next[0]) / 2,
                (prev[1] + next[1]) / 2
            ];

            newPoints.push([
                (p[0] + smoothedPoint[0]) / 2,
                (p[1] + smoothedPoint[1]) / 2
            ]);
        }
        points = newPoints;
    }
    return points;
}
function hybridChaikinLaplace(points, iterations, laplaceIterations = 1) {
    for (let i = 0; i < iterations; i++) {
        points = chaikinCurveClosed(points); // Step 1: Chaikin's Algorithm

        points = laplaceSmoothing(points, laplaceIterations); // Step 2: Laplace Smoothing

    }
    return points;
}
function catmullRomSpline(points, alpha = 0.2) {
    const newPoints = [];

    for (let i = 0; i < points.length; i++) {
        const p0 = points[(i - 1 + points.length) % points.length];
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const p3 = points[(i + 2) % points.length];

        for (let t = 0; t < 1; t += 0.1) {
            const tt = t * t;
            const ttt = tt * t;

            const q1 = -alpha * ttt + 2 * alpha * tt - alpha * t;
            const q2 = (2 - alpha) * ttt + (alpha - 3) * tt + 1;
            const q3 = (alpha - 2) * ttt + (3 - 2 * alpha) * tt + alpha * t;
            const q4 = alpha * ttt - alpha * tt;

            const x = p0[0] * q1 + p1[0] * q2 + p2[0] * q3 + p3[0] * q4;
            const y = p0[1] * q1 + p1[1] * q2 + p2[1] * q3 + p3[1] * q4;

            newPoints.push([x, y]);
        }
    }

    return newPoints;
}
function mergeVoronoiCells(voronoi, cellIndices) {
    // Step 1: Collect all edges of the cells we want to merge
    let allEdges = cellIndices.flatMap(index => {
        let cellEdges = voronoi.cellPolygon(index);
        if (!cellEdges)
            return []
        cellEdges.splice(0, 1)
        return cellEdges.map((point, i) => {
            const nextPoint = cellEdges[(i + 1) % cellEdges.length];
            return [point, nextPoint];
        });
    });
    // Step 2: Remove duplicate edges (internal edges)
    let uniqueEdges = [];
    for (i = 0; i < allEdges.length; i++) {
        edge = allEdges[i]
        if (!allEdges.filter((a, b) => b != i).some(e =>
            (e[0][0] === edge[0][0] && e[0][1] === edge[0][1] && e[1][0] === edge[1][0] && e[1][1] === edge[1][1]) ||
            (e[0][0] === edge[1][0] && e[0][1] === edge[1][1] && e[1][0] === edge[0][0] && e[1][1] === edge[0][1])
        )) {
            uniqueEdges.push(edge);
        }
    }

    // Step 3: Order edges into polygons
    let polygons = [];
    while (uniqueEdges.length > 0) {
        let orderedEdges = [uniqueEdges[0]];
        uniqueEdges.splice(0, 1);

        while (true) {
            let lastPoint = orderedEdges[orderedEdges.length - 1][1];
            let nextEdgeIndex = uniqueEdges.findIndex(edge =>
                edge[0][0] === lastPoint[0] && edge[0][1] === lastPoint[1]
            );
            if (nextEdgeIndex === -1) {
                nextEdgeIndex = uniqueEdges.findIndex(edge =>
                    edge[1][0] === lastPoint[0] && edge[1][1] === lastPoint[1]
                );
                if (nextEdgeIndex === -1) {
                    // Can't find a connecting edge, so this polygon is complete
                    break;
                }
                orderedEdges.push([uniqueEdges[nextEdgeIndex][1], uniqueEdges[nextEdgeIndex][0]]);
            } else {
                orderedEdges.push(uniqueEdges[nextEdgeIndex]);
            }

            uniqueEdges.splice(nextEdgeIndex, 1);
        }

        // Extract points from ordered edges to form the final polygon
        const polygon = orderedEdges.map(edge => edge[0]);
        polygons.push(polygon);
    }

    return polygons;
}
function calculateEdgeNormals(points) {
    const normals = [];

    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];

        const edge = [p2[0] - p1[0], p2[1] - p1[1]];
        const normal = [-edge[1], edge[0]];

        // Normalize the normal vector
        const length = Math.hypot(normal[0], normal[1]);
        normals.push([normal[0] / length, normal[1] / length]);
    }

    return normals;
}

function insetPolygon(points, insetDistance) {
    const normals = calculateEdgeNormals(points);
    const insetPoints = [];

    for (let i = 0; i < points.length; i++) {
        const prevNormal = normals[(i - 1 + normals.length) % normals.length];
        const currNormal = normals[i];

        // Average the normals of the two adjacent edges
        const insetVector = [(prevNormal[0] + currNormal[0]) / 2, (prevNormal[1] + currNormal[1]) / 2
        ];

        // Normalize the inset vector
        const length = Math.hypot(insetVector[0], insetVector[1]);
        const normalizedInset = [insetVector[0] / length, insetVector[1] / length
        ];

        // Inset the point by moving it along the averaged normal
        insetPoints.push([points[i][0] + normalizedInset[0] * insetDistance,
        points[i][1] + normalizedInset[1] * insetDistance
        ]);
    }

    return insetPoints;
}

function drawVoronoi(edges = true, smooth = 0) {
    if (points.length < 2) return;

    const delaunay = d3.Delaunay.from(points);
    const voronoi = delaunay.voronoi([-panX, -panY, (canvas.width / zoomLevel) - panX, (canvas.height / zoomLevel) - panY]);

    const indexes_to_draw = points.flatMap((p, i) => disabledPoints.includes(i) ? [] : i);
    indexes_to_exclude = []
    for (let i = 0; i < indexes_to_draw.length; i++) {
        const mergeIndex = mergedPoints.findIndex(subarray => subarray.includes(indexes_to_draw[i]));
        if (smooth == 0) {
            if (mergeIndex != -1) {
                if (mergedPoints[mergeIndex][0] != indexes_to_draw[i]) {
                    continue; //this was already drawn
                }
                cells = mergeVoronoiCells(voronoi, mergedPoints[mergeIndex]);

                if (!cells) continue;
            }
            else {
                cell = voronoi.cellPolygon(indexes_to_draw[i]);
                if (cell === null) continue;

                cell.splice(0, 1)
                cells = [cell]
            }

        } else {
            indexes_to_display = indexes_to_draw.flatMap((a) => indexes_to_exclude.includes(a) ? [] : a)
            cells = mergeVoronoiCells(voronoi, indexes_to_display);
            if (!cells) continue;
        }

        cells.forEach(cell => {
            if (smooth) {
                cell = chaikinCurveClosed(cell,25,3)
                // cell = hybridChaikinLaplace(cell, 3, 1);

                // cell = catmullRomSpline(cell);
            }
            ctx.beginPath();
            ctx.moveTo(cell[0][0], cell[0][1]);
            for (let j = 1; j < cell.length; j++) {
                ctx.lineTo(cell[j][0], cell[j][1]);
            }
            ctx.closePath();
            if (edges) {
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            ctx.fillStyle = pastelPalette[i % pastelPalette.length];
            ctx.fill();

            if (smooth) {
                if (mergeIndex != -1) {
                    cell = mergeVoronoiCells(voronoi, mergedPoints[mergeIndex])[0];
    
                }
                else {
                    cell = voronoi.cellPolygon(indexes_to_draw[i]);
                    if (cell === null) return;
    
                    cell.splice(0, 1)
                }
                cell = chaikinCurveClosed(cell,25,3)

            }
            cell = insetPolygon(cell,10)
            ctx.beginPath();
            ctx.moveTo(cell[0][0], cell[0][1]);
            for (let j = 1; j < cell.length; j++) {
                ctx.lineTo(cell[j][0], cell[j][1]);
            }
            ctx.closePath();
            if (edges) {
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
            ctx.fillStyle = "white"
            ctx.fill();
        });

        indexes_to_exclude.push(indexes_to_draw[i]);
        if (mergeIndex != -1) {
            indexes_to_exclude.push(...mergedPoints[mergeIndex])
        }
    }

}

function snapToGrid(x, y) {
    return [
        Math.round((x) / gridSize) * gridSize,
        Math.round((y) / gridSize) * gridSize
    ];
}

function getPointNearPosition(x, y) {
    for (let i = 0; i < points.length; i++) {
        const dx = x - points[i][0];
        const dy = y - points[i][1];
        if (dx * dx + dy * dy < 150) {
            return i;
        }
    }
    return -1;
}

canvas.addEventListener('mousedown', (e) => {
    if (e.shiftKey) {
        isDragging = true;
    } else {
        const rect = canvas.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / zoomLevel) - panX;
        const y = ((e.clientY - rect.top) / zoomLevel) - panY;

        dragIndex = getPointNearPosition(x, y);
        if (dragIndex !== -1) {
            isDragging = true;
        } else {
            const [snappedX, snappedY] = snapToGrid(x, y);
            points.push([snappedX, snappedY]);
            isDragging = true
            dragIndex = points.length - 1;
        }
    }
    drawPoints();
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / zoomLevel) - panX;
    const y = ((e.clientY - rect.top) / zoomLevel) - panY;
    mouseX = x;
    mouseY = y;
    if (isDragging) {
        if (e.shiftKey) {
            panX += e.movementX;
            panY += e.movementY;
        } else {
            const [snappedX, snappedY] = snapToGrid(x, y);
            points[dragIndex] = [snappedX, snappedY];
        }
    } else {
        hoverIndex = getPointNearPosition(x, y);
    }
    drawPoints();
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    dragIndex = -1;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const oldZoomLevel = zoomLevel;
    zoomLevel *= zoomFactor;
    panX -= (e.clientX - canvas.offsetLeft) * (zoomFactor - 1) / oldZoomLevel;
    panY -= (e.clientY - canvas.offsetTop) * (zoomFactor - 1) / oldZoomLevel;
    drawPoints();
});

function deletePointIndex(index) {
    points.splice(index, 1);
    disabledPoints = disabledPoints.filter(i => i !== index).map(i => i > index ? i - 1 : i); // Remove index from disabled points
    mergedPoints = mergedPoints.filter((x) => x.every(i => i != index)).map((x) => x.map(i => i > index ? i - 1 : i)); // Remove any merged point connections
    drawPoints();
    hoverIndex = getPointNearPosition(mouseX, mouseY);
}

canvas.addEventListener('dblclick', (e) => {
    if (hoverIndex !== -1) {
        deletePointIndex(hoverIndex);
    }
});

let mergeFirstIndex = -1;
window.addEventListener('keydown', (e) => {
    if (e.key === 'd') {
        if (hoverIndex !== -1) {
            deletePointIndex(hoverIndex);
        }
    } else if (e.key === 'e') {
        // Toggle outline rendering for the nearest point
        if (hoverIndex !== -1) {
            if (disabledPoints.includes(hoverIndex)) {
                disabledPoints = disabledPoints.filter(i => i !== hoverIndex); // Remove point from disabled list
            } else {
                disabledPoints.push(hoverIndex); // Add point to disabled list
            }
            drawPoints();
        }
    } else if (e.key === 'm') {
        // Handle point merging
        if (hoverIndex !== -1) {
            if (mergeFirstIndex === -1) {
                mergeFirstIndex = hoverIndex;
            } else {
                const mergeIndex1 = mergedPoints.findIndex(subarray => subarray.includes(mergeFirstIndex));
                const mergeIndex2 = mergedPoints.findIndex(subarray => subarray.includes(hoverIndex));
                if (mergeIndex1 == -1 && mergeIndex2 == -1) {
                    mergedPoints.push([mergeFirstIndex, hoverIndex]);
                }
                else if (mergeIndex1 != -1 && mergeIndex2 != -1) {
                    const mergedsum = mergedPoints.filter((e, i) => i == mergeIndex1 || i == mergeIndex2).flat()
                    mergedPoints = mergedPoints.filter((e, i) => i != mergeIndex1 && i != mergeIndex2)
                    mergedPoints.push(mergedsum)
                }
                else if (mergeIndex1 != -1) {
                    mergedPoints[mergeIndex1].push(hoverIndex);
                }
                else {
                    mergedPoints[mergeIndex2].push(mergeFirstIndex);
                }
                mergeFirstIndex = -1;
            }
            drawPoints();
        }
    }
});

canvas.addEventListener('mouseleave', () => {
    hoverIndex = -1;
    drawPoints();
});

// Save points function
function savePoints(name) {
    const saveitem = JSON.stringify({
        points: points,
        disabledPoints: disabledPoints,
        mergedPoints: mergedPoints,
        zoomLevel: zoomLevel,
        panX: panX,
        panY: panY
    });
    localStorage.setItem(`shelfPoints-${name}`, saveitem);
    populateSaveList();
}

// Load points function
function loadPoints() {
    const selectedSave = document.getElementById('loadSelect').value;
    const savedData = localStorage.getItem(`shelfPoints-${selectedSave}`);
    if (savedData) {
        const { points: loadedPoints, disabledPoints: loadedDisabledPoints, mergedPoints: loadedMergedPoints, zoomLevel: loadedZoomLevel, panX: loadedPanX, panY: loadedPanY } = JSON.parse(savedData);
        points = loadedPoints;
        disabledPoints = loadedDisabledPoints;
        mergedPoints = loadedMergedPoints;
        if (mergedPoints === undefined) {
            mergedPoints = []

        }
        zoomLevel = loadedZoomLevel;
        panX = loadedPanX;
        panY = loadedPanY;
        drawPoints();
    }
}

function populateSaveList() {
    // Populate the load dropdown
    savedSaves = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('shelfPoints-')) {
            savedSaves.push(key.slice(12));
        }
    }
    savedSaves.sort();
    if (savedSaves.length == 0) {
        const demo = '{"points":[[540,440],[1000,400],[1000,800],[800,600],[1000,600],[1200,600],[800,800],[800,300],[540,540],[320,580],[540,800],[450,400],[450,500],[1150,450],[780,600],[780,800],[780,300],[540,260],[1000,420],[900,800]],"disabledPoints":[2,1,5,6,7,9,10,11,12,13,15,16,17,19],"mergedPoints":[[14,3]],"zoomLevel":0.8221655227352777,"panX":-259.92739638364253,"panY":-16.415736211721736}'
        localStorage.setItem(`shelfPoints-Demo Shelf`, demo);
        savedSaves = ["Demo Shelf"]
    }
    const loadSelect = document.getElementById('loadSelect');
    loadSelect.innerHTML = ""
    savedSaves.forEach(save => {
        const option = document.createElement('option');
        option.value = save;
        option.text = save;
        loadSelect.add(option);
    });
}

// Add event listeners for save and load buttons
document.getElementById('saveasButton').addEventListener('click', () => {
    const name = prompt('Enter a name for this save point:');
    if (name) {
        savePoints(name);
    }
});
document.getElementById('saveButton').addEventListener('click', () => {
    const selectedSave = document.getElementById('loadSelect').value;
    savePoints(selectedSave);
});
document.getElementById('loadButton').addEventListener('click', loadPoints);

// Function to clear the canvas
function clearCanvas() {
    points = [];
    disabledPoints = [];
    mergedPoints = [];
    zoomLevel = 1;
    panX = 0;
    panY = 0;
    drawPoints();
}

// Function to delete the currently loaded save
function deleteSave() {
    const selectedSave = document.getElementById('loadSelect').value;
    localStorage.removeItem(`shelfPoints-${selectedSave}`);
    populateSaveList();
    clearCanvas();
}

// Add event listeners for the new and delete buttons
document.getElementById('newButton').addEventListener('click', clearCanvas);
document.getElementById('deleteButton').addEventListener('click', deleteSave);

// Function to update grid size
function updateGridSize() {
    const newGridSize = parseInt(prompt('Enter new grid size:', gridSize));
    if (!isNaN(newGridSize) && newGridSize > 0) {
        gridSize = newGridSize;
        drawPoints();
    }
}

// Add event listener for grid size update
document.getElementById('updateGridButton').addEventListener('click', updateGridSize);



const canvasShelf = document.getElementById('shelfCanvas');
const canvasSmoothShelf = document.getElementById('smoothCanvas');

const shelfCanvasWidth = window.getComputedStyle(canvasShelf).getPropertyValue('width');
const shelfCanvasHeight = window.getComputedStyle(canvasShelf).getPropertyValue('height');

const smoothCanvasWidth = window.getComputedStyle(canvasSmoothShelf).getPropertyValue('width');
const smoothCanvasHeight = window.getComputedStyle(canvasSmoothShelf).getPropertyValue('height');

canvasShelf.width = parseInt(shelfCanvasWidth);
canvasShelf.height = parseInt(shelfCanvasHeight);

canvasSmoothShelf.width = parseInt(smoothCanvasWidth);
canvasSmoothShelf.height = parseInt(smoothCanvasHeight);

populateSaveList();
loadPoints();