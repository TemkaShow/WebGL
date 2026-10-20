'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

// Gouraud Shading - світло рахується у вершинному шейдері
const myVertexShader = `
    attribute vec3 vertex;
    attribute vec3 normal;
    
    uniform mat4 ModelViewMatrix;
    uniform mat4 ProjectionMatrix;
    uniform mat3 NormalMatrix;
    uniform vec3 LightPosition; 
    
    varying vec4 v_color;
    
    void main() {
        vec4 viewPosition = ModelViewMatrix * vec4(vertex, 1.0);
        gl_Position = ProjectionMatrix * viewPosition;
        
        vec3 N = normalize(NormalMatrix * normal);
        vec3 L = normalize(LightPosition - viewPosition.xyz);
        vec3 V = vec3(0.0, 0.0, 1.0); // Вектор на глядача
        vec3 R = reflect(-L, N);
        
        // Колір моделі (golden)
        vec3 ambient = vec3(0.2, 0.2, 0.0); 
        vec3 diffuseColor = vec3(1.0, 0.84, 0.0); 
        vec3 specularColor = vec3(1.0, 1.0, 1.0); 
        
        float diff = max(dot(N, L), 0.0);
        float spec = 0.0;
        if (diff > 0.0) {
            spec = pow(max(dot(R, V), 0.0), 32.0);
        }
        
        // Обчислення освітлення Гуро
        v_color = vec4(ambient + (diffuseColor * diff) + (specularColor * spec), 1.0);
    }
`;

// Фрагментний шейдер для Гуро лише отримує інтерпольований колір
const myFragmentShader  = `
    precision mediump float;
    varying vec4 v_color;
    void main() {
        gl_FragColor = v_color;
    }
`;

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    
    this.iModelViewMatrix = -1;
    this.iProjectionMatrix = -1;
    this.iNormalMatrix = -1;
    this.iLightPosition = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function updateModel() {
    let u = parseInt(document.getElementById('uSlider').value);
    let v = parseInt(document.getElementById('vSlider').value);
    surface = new Model(gl, u, v);
}

function draw() { 
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    let projection = m4.perspective(Math.PI/8, 1, 8, 12); 
    
    let modelView = spaceball.getViewMatrix();
    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );
        
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum1 );
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection );
    
    // Normal Matrix (обернена транспонована до ModelView)
    let nMat = [
        matAccum1[0], matAccum1[1], matAccum1[2],
        matAccum1[4], matAccum1[5], matAccum1[6],
        matAccum1[8], matAccum1[9], matAccum1[10]
    ];
    gl.uniformMatrix3fv(shProgram.iNormalMatrix, false, nMat);

    // Обертання джерела світла
    let time = Date.now() * 0.001; // час у секундах
    let lightX = Math.sin(time) * 5.0;
    let lightZ = Math.cos(time) * 5.0;
    let lightY = 3.0;
    
    // Множимо координати світла на View матрицю
    let lightPosView = [
        lightX * matAccum1[0] + lightY * matAccum1[4] + lightZ * matAccum1[8] + matAccum1[12],
        lightX * matAccum1[1] + lightY * matAccum1[5] + lightZ * matAccum1[9] + matAccum1[13],
        lightX * matAccum1[2] + lightY * matAccum1[6] + lightZ * matAccum1[10] + matAccum1[14]
    ];
    gl.uniform3fv(shProgram.iLightPosition, lightPosView);

    surface.draw(shProgram);

    // Викликаємо draw постійно для анімації світла
    window.requestAnimationFrame(draw);
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, myVertexShader, myFragmentShader );

    shProgram = new ShaderProgram('Gouraud', prog);
    shProgram.Use();

    shProgram.iAttribVertex      = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal      = gl.getAttribLocation(prog, "normal");
    
    shProgram.iModelViewMatrix   = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix  = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iNormalMatrix      = gl.getUniformLocation(prog, "NormalMatrix");
    shProgram.iLightPosition     = gl.getUniformLocation(prog, "LightPosition");

    updateModel(); // Створюємо початкову модель

    // Прив'язуємо івенти до слайдерів
    document.getElementById('uSlider').addEventListener('input', updateModel);
    document.getElementById('vSlider').addEventListener('input', updateModel);

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, () => {}, 0);

    window.requestAnimationFrame(draw);
}
