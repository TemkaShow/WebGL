class Model {
    constructor(gl) {
        this.gl = gl;
        
        // Масиви для вершин двох сіток поліліній
        let uVertices = [];
        let vVertices = [];

        // Параметри гофрованої сфери
        const R = 1.0;          // Базовий радіус
        const a = 0.15;         // Амплітуда гофрування (висота хвиль)
        const m = 12;           // Кількість хвиль по довготі (u)
        const n = 10;           // Кількість хвиль по широті (v)
        
        // Налаштування сітки (u є [0; 2pi], v є [0; pi])
        const numU = 60;
        const numV = 60;
        const uMin = 0;
        const uMax = 2 * Math.PI;
        const vMin = 0;
        const vMax = Math.PI;

        // Функція для отримання XYZ за координатами U та V
        const getPoint = (u, v) => {
            // Радіус сфери не є сталим, а змінюється за законом подвійної синусоїди
            // r(u, v) = R + a * sin(m * u) * sin(n * v)
            const r = R + a * Math.sin(m * u) * Math.sin(n * v);
            
            // Перехід від сферичної системи координат до декартової (x, y, z)
            const x = r * Math.sin(v) * Math.cos(u);
            const y = r * Math.sin(v) * Math.sin(u);
            const z = r * Math.cos(v);
            return [x, y, z];
        };

        // Формуємо U-полілінії (рухаємось по U, тримаючи V постійним)
        for (let j = 0; j <= numV; j++) {
            let v = vMin + (j / numV) * (vMax - vMin);
            for (let i = 0; i < numU; i++) {
                let u1 = uMin + (i / numU) * (uMax - uMin);
                let u2 = uMin + ((i + 1) / numU) * (uMax - uMin);
                
                let p1 = getPoint(u1, v);
                let p2 = getPoint(u2, v);
                
                uVertices.push(...p1, ...p2);
            }
        }

        // Формуємо V-полілінії (рухаємось по V, тримаючи U постійним)
        for (let i = 0; i <= numU; i++) {
            let u = uMin + (i / numU) * (uMax - uMin);
            for (let j = 0; j < numV; j++) {
                let v1 = vMin + (j / numV) * (vMax - vMin);
                let v2 = vMin + ((j + 1) / numV) * (vMax - vMin);
                
                let p1 = getPoint(u, v1);
                let p2 = getPoint(u, v2);
                
                vVertices.push(...p1, ...p2);
            }
        }

        // Створюємо буфери для WebGL
        this.uVertexCount = uVertices.length / 3;
        this.uBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uVertices), gl.STATIC_DRAW);

        this.vVertexCount = vVertices.length / 3;
        this.vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vVertices), gl.STATIC_DRAW);
    }

    // Метод малювання
    draw(attributeLocation) {
        const gl = this.gl;
        
        gl.enableVertexAttribArray(attributeLocation);

        // Малюємо множину U-поліліній
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uBuffer);
        gl.vertexAttribPointer(attributeLocation, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, this.uVertexCount);

        // Малюємо множину V-поліліній
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
        gl.vertexAttribPointer(attributeLocation, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, this.vVertexCount);
    }
}