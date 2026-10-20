class Model {
    constructor(gl, numU, numV) {
        this.gl = gl;
        
        let vertices = [];
        let indices = [];
        
        // Параметри гофрованої сфери
        const R = 1.0;
        const a = 0.15;
        const m = 12;
        const n = 10;
        
        const uMin = 0, uMax = 2 * Math.PI;
        const vMin = 0, vMax = Math.PI;

        const getPoint = (u, v) => {
            const r = R + a * Math.sin(m * u) * Math.sin(n * v);
            return [
                r * Math.sin(v) * Math.cos(u),
                r * Math.sin(v) * Math.sin(u),
                r * Math.cos(v)
            ];
        };

        // Генеруємо вершини
        for (let i = 0; i <= numV; i++) {
            let v = vMin + (i / numV) * (vMax - vMin);
            for (let j = 0; j <= numU; j++) {
                let u = uMin + (j / numU) * (uMax - uMin);
                vertices.push(...getPoint(u, v));
            }
        }

        // Генеруємо індекси для ТРИКУТНИКІВ
        for (let i = 0; i < numV; i++) {
            for (let j = 0; j < numU; j++) {
                let p1 = i * (numU + 1) + j;
                let p2 = (i + 1) * (numU + 1) + j;
                let p3 = i * (numU + 1) + (j + 1);
                let p4 = (i + 1) * (numU + 1) + (j + 1);

                // Два трикутники на один квадрат сітки
                indices.push(p1, p2, p3);
                indices.push(p3, p2, p4);
            }
        }

        // Розрахунок нормалей (Facet Angle Weighted Average)
        let normals = new Array(vertices.length).fill(0);

        // Допоміжні математичні функції
        const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
        const cross = (a, b) => [a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]];
        const dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
        const normalize = (v) => {
            let len = Math.sqrt(dot(v, v));
            return len > 0 ? [v[0]/len, v[1]/len, v[2]/len] : [0,0,0];
        };
        const getAngle = (v1, v2) => Math.acos(Math.max(-1.0, Math.min(1.0, dot(normalize(v1), normalize(v2)))));

        for (let i = 0; i < indices.length; i += 3) {
            let i1 = indices[i], i2 = indices[i+1], i3 = indices[i+2];
            
            let v1 = [vertices[i1*3], vertices[i1*3+1], vertices[i1*3+2]];
            let v2 = [vertices[i2*3], vertices[i2*3+1], vertices[i2*3+2]];
            let v3 = [vertices[i3*3], vertices[i3*3+1], vertices[i3*3+2]];

            let e1 = sub(v2, v1);
            let e2 = sub(v3, v1);
            
            // Нормаль грані
            let faceNormal = normalize(cross(e1, e2));

            // Вектори для кутів
            let e3 = sub(v3, v2);
            
            let angle1 = getAngle(e1, e2);
            let angle2 = getAngle(sub(v1, v2), e3);
            let angle3 = getAngle(sub(v1, v3), sub(v2, v3));

            // Додаємо зважену нормаль до кожної вершини
            normals[i1*3] += faceNormal[0] * angle1; normals[i1*3+1] += faceNormal[1] * angle1; normals[i1*3+2] += faceNormal[2] * angle1;
            normals[i2*3] += faceNormal[0] * angle2; normals[i2*3+1] += faceNormal[1] * angle2; normals[i2*3+2] += faceNormal[2] * angle2;
            normals[i3*3] += faceNormal[0] * angle3; normals[i3*3+1] += faceNormal[1] * angle3; normals[i3*3+2] += faceNormal[2] * angle3;
        }

        // Нормалізуємо фінальні нормалі вершин
        for (let i = 0; i < normals.length; i += 3) {
            let norm = normalize([normals[i], normals[i+1], normals[i+2]]);
            normals[i] = norm[0]; normals[i+1] = norm[1]; normals[i+2] = norm[2];
        }

        // Створення буферів WebGL
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        this.indexCount = indices.length;
    }

    draw(prog) {
        const gl = this.gl;
        
        // Позиції
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(prog.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(prog.iAttribVertex);

        // Нормалі
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.vertexAttribPointer(prog.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(prog.iAttribNormal);

        // Індекси та малювання трикутників
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    }
}