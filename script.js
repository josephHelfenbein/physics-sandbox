import { initBuffers } from "./init-buffers.js";
import { drawScene } from "./draw-scene.js";


let deltaTime = 0;


main();
function main(){
    // Get the canvas
    const canvas = document.getElementById("webglCanvas");
    

    // Initialize the GL context
    const gl = canvas.getContext("webgl2");

    // Only continue if WebGL is available
    if (!gl) {
        alert("Your browser does not support WebGL.");
        return;
    }
    

    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    let cameraLoc = [0.0, 0.0, 30.0];
    let cameraRot = [0,0];
    let cubePos = [[0,-100,0]];
    let spherePos = [];
    let sphereVel = [];
    let sphereAcc = [];

    var mousedownID=-1;
    function mousedown(event){
       var isRightMB;
       var isMiddleMB;
       if("which" in event) {
        isRightMB = event.which == 3;
        isMiddleMB = event.which == 2;
       }
       else if("button" in event) {
        isRightMB = event.button == 2;
        isMiddleMB = event.button == 1;
       }
       if(mousedownID==-1 && !isRightMB && !isMiddleMB) mousedownID = setInterval(moveRotate, 10);
       if(mousedownID==-1 && !isRightMB && isMiddleMB) mousedownID = setInterval(moveZoom, 10);
    }
    function mouseup(event){
        if(mousedownID!=-1){clearInterval(mousedownID);mousedownID=-1;}
        if(oldMousePos.x!=undefined) oldMousePos.x=undefined;
        if(oldMousePos.y!=undefined) oldMousePos.y=undefined;
        
    }
    function moveRotate(){
        if(oldMousePos.x == undefined){oldMousePos=mousePos;}
        else if(oldMousePos.x != mousePos.x || oldMousePos.y != mousePos.y){
            if(mousePos.y - oldMousePos.y > 0 && cameraRot[0] < 90)
                cameraRot[0]+=(mousePos.y - oldMousePos.y) / 2;
            else if(mousePos.y - oldMousePos.y < 0 && cameraRot[0] > 0)
                cameraRot[0]+=(mousePos.y - oldMousePos.y) / 2;
            if(mousePos.x - oldMousePos.x != 0)
                cameraRot[1]+=(mousePos.x - oldMousePos.x) / 2;
            if(cameraRot[0] > 90) cameraRot[0] = 90;
            else if(cameraRot[0] < 0) cameraRot[0] = 0;
            oldMousePos=mousePos;
        }
    }
    function moveZoom(){
        if(oldMousePos.x == undefined){oldMousePos=mousePos;}
        else if (oldMousePos.y != mousePos.y){
            if(mousePos.y - oldMousePos.y < 0 && cameraLoc[2] > 1)
                cameraLoc[2]+=(mousePos.y - oldMousePos.y) / 25;
            else if(mousePos.y - oldMousePos.y > 0 && cameraLoc[2] < 90)
                cameraLoc[2]+=(mousePos.y - oldMousePos.y) / 25;
            if(cameraLoc[2] < 1) cameraLoc[2] = 1;
            oldMousePos=mousePos;
        }
    }
    let oldMousePos = {x: undefined, y: undefined};
    let mousePos = {x: undefined, y: undefined};
    canvas.addEventListener("mousedown",mousedown);
    canvas.addEventListener("mouseup",mouseup);
    canvas.addEventListener("mouseout",mouseup);
    canvas.addEventListener('mousemove', (event) => {
        mousePos = { x: event.clientX, y: event.clientY };
    });
    // Vertex shader program
    const vsSource = `#version 300 es
        in vec4 aVertexPosition;
        in vec3 aVertexNormal;
        in vec4 aVertexColor;

        uniform mat4 uNormalMatrix;
        uniform mat4 uModelViewMatrix;
        uniform mat4 uProjectionMatrix;
        uniform mat4 u_world;
        


        out highp vec3 v_Position;
        out highp vec4 vColor;
        out highp vec3 v_Normal;

        void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        highp vec3 surfaceWorldPosition = (u_world * aVertexPosition).xyz;
        highp vec4 transformedNormal = uNormalMatrix * vec4(aVertexNormal, 1.0);
        v_Normal = vec3(uModelViewMatrix * vec4(aVertexNormal, 0.0));
        v_Position = vec3(uModelViewMatrix * aVertexPosition);
        vColor = aVertexColor;
        }
    `;


    const fsSource = `#version 300 es
    precision highp float;
        in highp vec3 v_Position;
        in highp vec4 vColor;
        in highp vec3 v_Normal;

        
        out vec4 FragColor;

        uniform sampler2D uTriangleTexture;
        uniform int uTextureSize;
        uniform vec3 uCameraPosition;
        uniform int uSphereCount;
        uniform int uTriangleCount;
        uniform int uCubeCount;


        const float epsilon = 0.00001;
        
        vec4 getVertex(int index){
            float f_index = float(index);
            float f_uTextureSize = float(uTextureSize);
            int x = index % uTextureSize;
            int y = index / uTextureSize;
            ivec2 texelCoord = ivec2(x, y);
            return texelFetch(uTriangleTexture, texelCoord, 0);
        }
        bool rayIntersectsTriangle(vec3 rayOrigin, vec3 rayVector, vec3 v0, vec3 v1, vec3 v2){
            vec3 edge1 = v1 - v0;
            vec3 edge2 = v2 - v0;
            vec3 h = cross(rayVector, edge2);
            float a = dot(edge1, h);

            if(a>-epsilon && a<epsilon) return false;
            float f = 1.0 / a;
            vec3 s = rayOrigin - v0;
            float u = f * dot(s, h);

            if(u<0.0||u>1.0) return false;

            vec3 q = cross(s, edge1);
            float v = f * dot(rayVector, q);
            if(v<0.0||u+v>1.0) return false;

            float t = f * dot(edge2, q);
            return t > epsilon;
        }
        bool rayIntersectsSphere(vec3 rayOrigin, vec3 rayVector, vec3 sphereCenter, float sphereRad){
            vec3 oc = rayOrigin - sphereCenter;
            float a = dot(rayVector, rayVector);
            float b = 2.0 * dot(oc, rayVector);
            float c = dot(oc, oc) - sphereRad * sphereRad;
            float discriminant = b * b - 4.0 * a * c;
            return (discriminant > 0.0 && c > 0.0 && b < 0.0);
        }

        void main(void) {
            highp vec3 normal = normalize(v_Normal);
            highp vec3 u_LightDir = normalize(vec3(2, 4, 3));
            highp vec3 u_LightCol = vec3(1,1,1); 
            highp float diffuse = max(dot(normal, u_LightDir), 0.015);


            vec3 rayOrigin = vec3(v_Position.xyz) + epsilon * normalize(u_LightDir);
            highp float shadow = 1.0;

            for(int i=0; i<uTriangleCount - uCubeCount * 3; i++){
                vec4 v0 = getVertex(i*3+0);
                vec4 v1 = getVertex(i*3+1);
                vec4 v2 = getVertex(i*3+2);
                if(rayIntersectsTriangle(rayOrigin, u_LightDir, v0.xyz, v1.xyz, v2.xyz)){
                    shadow = 0.05;break;
                }
                
            }
            if(shadow!=0.05){
                for(int j=0; j<uSphereCount; j++){
                    int sphereIndex = uTriangleCount * 2 + 9 + uCubeCount * 3 + j;
                    vec3 spherePos = getVertex(sphereIndex).xyz;
                    if(rayIntersectsSphere(rayOrigin, u_LightDir, spherePos, 1.0)){
                        shadow = 0.05;break;
                    }
                }
            }



            vec3 viewDir = normalize(uCameraPosition - rayOrigin);
            vec3 halfwayDir = normalize(u_LightDir + viewDir);
            float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0);
            vec3 specular = spec * 0.2 * u_LightCol;

            float gamma = 2.2;
            FragColor = vec4(pow(specular * shadow + shadow * vColor.rgb*u_LightCol*vec3(diffuse,diffuse,diffuse), vec3(1.0 / gamma)),1.0);
        }
    `;


    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const spherePositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, spherePositionBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, spherePos, gl.STATIC_DRAW);
    
    function updateCamPos(camPos){
        gl.useProgram(shaderProgram);
        gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'uCameraPosition'), camPos);
        
    }
    updateCamPos(cameraLoc);
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
          vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
          vertexNormal: gl.getAttribLocation(shaderProgram, "aVertexNormal"),
          vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
        },
        uniformLocations: {
          projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
          modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
          normalMatrix: gl.getUniformLocation(shaderProgram, "uNormalMatrix"),
          worldLocation: gl.getUniformLocation(shaderProgram, "u_world"),
          textureSize: gl.getUniformLocation(shaderProgram, 'uTextureSize'),
          triangleTexture: gl.getUniformLocation(shaderProgram, 'uTriangleTexture'),
          sphereCount: gl.getUniformLocation(shaderProgram, 'uSphereCount'),
          triangleCount: gl.getUniformLocation(shaderProgram, 'uTriangleCount'),
          cubeCount: gl.getUniformLocation(shaderProgram, 'uCubeCount'),
          cameraLoc: gl.getUniformLocation(shaderProgram, "uCameraPosition"),
        },
    };          
    
    document.getElementById('xyz-submit').onclick = function() {spawnObject()};
    document.getElementById('removeAll').onclick = function() {despawnAll()};

    let g = 9.8
    function spawnObject(){
        let objType = document.getElementById('object-choice').value;
        let x = document.getElementById('x-input').value;
        let y = document.getElementById('y-input').value;
        let z = document.getElementById('z-input').value;
        let errMessage = document.getElementById('errMessage');
        errMessage.textContent = "";
        if(x < -9){x = -9; document.getElementById('x-input').value = -9;}
        if(x > 9){x = 9; document.getElementById('x-input').value = 9;}
        if(z < -9){z = -9; document.getElementById('z-input').value = -9;}
        if(z > 9){z = 9; document.getElementById('z-input').value = 9;}
        if(y < 0){y = 0; document.getElementById('y-input').value = 0;}
        if(y > 30){y = 30; document.getElementById('y-input').value = 30;}
        let spawning = true;
        for(let i=0; i<cubePos.length;i++){
            if(Math.abs(x - cubePos[i][0]) < 2.0 && Math.abs(y - cubePos[i][1]) < 2.0 && Math.abs(z - cubePos[i][2]) < 2.0)
                {
                    errMessage.textContent = "Could not spawn: Object is overlapping another in the scene.";
                    spawning = false;
                }
        }
        for(let i=0; i<spherePos.length;i++){
            if(Math.abs(x - spherePos[i][0]) < 2.0 && Math.abs(y - spherePos[i][1]) < 2.0 && Math.abs(z - spherePos[i][2]) < 2.0)
                {
                    errMessage.textContent = "Could not spawn: Object is overlapping another in the scene.";
                    spawning = false;
                }
        }
        if(objType == "cube" && spawning){
            cubePos.push([x, y, z]);
        }
        else if(objType == "sphere" && spawning){
            spherePos.push([x, y, z]);
            sphereVel.push([0, 0, 0]);
            sphereAcc.push([0, -g, 0]);
        }
    }    
    function despawnAll(){
        cubePos = [[0,-100,0]];
        spherePos = [];
        sphereVel = [];
        sphereAcc = [];
    }

    function updatePosition(deltaTime){
        for(let i=0; i<spherePos.length; i++){
            sphereVel[i] = [
                sphereVel[i][0] + sphereAcc[i][0] * deltaTime,
                sphereVel[i][1] + sphereAcc[i][1] * deltaTime,
                sphereVel[i][2] + sphereAcc[i][2] * deltaTime,
            ];
            spherePos[i] = [
                +spherePos[i][0] + sphereVel[i][0] * deltaTime,
                +spherePos[i][1] + sphereVel[i][1] * deltaTime,
                +spherePos[i][2] + sphereVel[i][2] * deltaTime,
            ];
        }
        console.log(spherePos);
    }

    const buffers = initBuffers(gl, 0);
    const planeBuffers = initBuffers(gl, 1);
    const sphereBuffers = initBuffers(gl, 2);
    // Draw the scene
    let then = 0;

    
    // Draw the scene repeatedly

    function render(now) {
        now *= 0.001; // convert to seconds
        deltaTime = now - then;
        then = now;
       
        let newCamRot = [cameraRot[0] * Math.PI * 0.00555555556,cameraRot[1] * Math.PI * 0.00555555556];
        let newCamLoc = [
            cameraLoc[0]*Math.cos(newCamRot[1]) + cameraLoc[2] * Math.sin(newCamRot[1]),
            cameraLoc[0]*Math.sin(newCamRot[0])*Math.sin(newCamRot[1]) + cameraLoc[1]*Math.cos(newCamRot[0])-cameraLoc[2]*Math.sin(newCamRot[0])*Math.cos(newCamRot[1]),
            -cameraLoc[0]*Math.cos(newCamRot[0])*Math.sin(newCamRot[1]) + cameraLoc[1]*Math.sin(newCamRot[0]) + cameraLoc[2]*Math.cos(newCamRot[0])*Math.cos(newCamRot[1])
        ];
        updateCamPos(newCamLoc);
        updatePosition(deltaTime);

        drawScene(gl, shaderProgram, programInfo, buffers, planeBuffers, sphereBuffers, cameraLoc, cameraRot, cubePos, spherePos);


        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);


}

// Initialize shader program
function initShaderProgram(gl, vsSource, fsSource){
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // Create shader program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    // Alert for creation fail
    if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
        alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram,)}`,);
    return null;
    }
    return shaderProgram;
}

// Creates shader, uploads source and compiles
function loadShader(gl, type, source){
    const shader = gl.createShader(type);
    // Send source to shader object
    gl.shaderSource(shader, source);
    // Compile shader
    gl.compileShader(shader);
    // Check compilation
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        alert(`An error occurred compiling shaders: ${gl.getShaderInfoLog(shader)}`,);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
