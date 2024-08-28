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
    let cameraRot = [20,30];
    let cubePos = [[0,-250,0]];
    let cubeVel = [[0, 0, 0]];
    let cubeAcc = [[0, 0, 0]];
    let cubeAngVel = [[0, 0, 0]];
    let cubeAngAcc = [[0, 0, 0]];
    let cubeAng = [[0, 0, 0]];
    let cubeStatic = [1];

    let spherePos = [];
    let sphereVel = [];
    let sphereAcc = [];
    let sphereStatic = [];

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


        const float epsilon = 0.01;
        
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
            return (discriminant > 0.0 && b < 0.0);
        }

        void main(void) {
            highp vec3 normal = normalize(v_Normal);
            highp vec3 u_LightDir = normalize(vec3(2, 4, 3));
            highp vec3 u_LightCol = vec3(1,1,1); 
            

            vec3 rayOrigin = vec3(v_Position.xyz) + epsilon * normalize(u_LightDir);
            highp float shadow = 1.0;

            for(int i=0; i<(uTriangleCount * 2 + 9 + uCubeCount * 3)/3; i++){
                vec4 v0 = getVertex(i*3+0);
                vec4 v1 = getVertex(i*3+1);
                vec4 v2 = getVertex(i*3+2);
                if(rayIntersectsTriangle(rayOrigin, u_LightDir, v0.xyz, v1.xyz, v2.xyz)){
                    shadow = 0.0;
                    break;
                }
            }
            if(shadow!=0.0){
                for(int j=0; j<uSphereCount; j++){
                    int sphereIndex = uTriangleCount * 2 + 9 + uCubeCount * 3 + j;
                    vec3 spherePos = getVertex(sphereIndex).xyz;
                    if(rayIntersectsSphere(rayOrigin, u_LightDir, spherePos, 1.0)){
                        shadow = 0.0;
                        break;
                    }
                }
            }

            highp float diffuse = max(shadow * dot(normal, u_LightDir), 0.015);

            vec3 viewDir = normalize(uCameraPosition - v_Position.xyz);
            vec3 halfwayDir = normalize(u_LightDir + viewDir);
            float spec = pow(max(dot(normal, halfwayDir), 0.0), 32.0);
            vec3 specular = shadow * spec * 0.1 * u_LightCol;

            float gamma = 2.2;
            FragColor = vec4(pow(specular + vColor.rgb*u_LightCol*vec3(diffuse,diffuse,diffuse), vec3(1.0 / gamma)),1.0);
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
    document.getElementById('pausebutton').onclick = function() {pausePlayTime()};
    document.getElementById('template1').onclick = function() {spawnTemplate(1)};
    document.getElementById('template2').onclick = function() {spawnTemplate(2)};
    document.getElementById('template3').onclick = function() {spawnTemplate(3)};
    document.getElementById('template4').onclick = function() {spawnTemplate(4)};
    const alertPlaceholder = document.getElementById('alertDiv')
    const inputx = document.getElementById('x-input');
    const inputy = document.getElementById('y-input');
    const inputz = document.getElementById('z-input');
    const inputvx = document.getElementById('x-vinput');
    const inputvy = document.getElementById('y-vinput');
    const inputvz = document.getElementById('z-vinput');
    const staticCheck = document.getElementById('dynamicCheck');
    const resetInputs = () => {
        inputx.value = 0;
        inputy.value = 0;
        inputz.value = 0;
        inputvx.value = 0;
        inputvy.value = 0;
        inputvz.value = 0;
        staticCheck.checked = false;
    }
    resetInputs();

    let g = 9.8;
    const appendAlert = (message, type) => {
        const wrapper = document.createElement('div')
        wrapper.innerHTML = [
            `<div id="errorPopup" class="alert alert-${type} fade show d-flex align-items-center" role="alert">`,
                `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-exclamation-triangle-fill flex-shrink-0 me-2" viewBox="0 0 16 16" role="img" aria-label="Warning:">`,
                    `<path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>`,
                `</svg>`,
                `<div>${message}</div>`,
                `<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`,
            `</div>`
        ].join('')
        alertPlaceholder.append(wrapper);
        var alertList = document.querySelectorAll('.alert');
        let alertObj = new bootstrap.Alert(alertList[alertList.length-1]);
        setInterval(function(){alertObj.close()}, 3000);
    }
    function spawnObject(){
        let objType = document.getElementById('object-choice').value;
        let x = inputx.value;
        let y = inputy.value;
        let z = inputz.value;
        let vx = inputvx.value;
        let vy = inputvy.value;
        let vz = inputvz.value;
        if(x < -9){x = -9; inputx.value = -9;}
        if(x > 9){x = 9; inputx.value = 9;}
        if(z < -9){z = -9; inputz.value = -9;}
        if(z > 9){z = 9; inputz.value = 9;}
        if(y < 0){y = 0; inputy.value = 0;}
        if(y > 30){y = 30; inputy.value = 30;}
        let spawning = true;
        for(let i=0; i<cubePos.length;i++){
            if(Math.abs(x - cubePos[i][0]) < 2.0 && Math.abs(y - cubePos[i][1]) < 2.0 && Math.abs(z - cubePos[i][2]) < 2.0)
                {
                    appendAlert('Could not spawn: Object is overlapping another in the scene.', 'danger');
                    spawning = false;
                }
        }
        for(let i=0; i<spherePos.length;i++){
            if(Math.abs(x - spherePos[i][0]) < 2.0 && Math.abs(y - spherePos[i][1]) < 2.0 && Math.abs(z - spherePos[i][2]) < 2.0)
                {
                    appendAlert('Could not spawn: Object is overlapping another in the scene.', 'danger');
                    spawning = false;
                }
        }
        if(objType == "cube" && spawning){
            cubePos.push([+x, +y, +z]);
            cubeVel.push([+vx, +vy, +vz]);
            cubeAcc.push([0, -g, 0]);
            cubeAngVel.push([0, 0, 0]);
            cubeAng.push([0, 0, 0]);
            cubeAngAcc.push([0, 0, 0]);
            if(staticCheck.checked == true)
                cubeStatic.push(1);
            else
                cubeStatic.push(0);
        }
        else if(objType == "sphere" && spawning){
            spherePos.push([+x, +y, +z]);
            sphereVel.push([+vx, +vy, +vz]);
            sphereAcc.push([0, -g, 0]);
            if(staticCheck.checked == true)
                sphereStatic.push(1);
            else
                sphereStatic.push(0);
        }
        return spawning;
    }    
    function despawnAll(){
        cubePos = [[0,-250,0]];
        cubeVel = [[0, 0, 0]];
        cubeAngVel = [[0, 0, 0]];
        cubeAngAcc = [[0, 0, 0]];
        cubeAng = [[0, 0, 0]];
        cubeStatic = [1];
        sphereStatic = [];
        spherePos = [];
        sphereVel = [];
        sphereAcc = [];
        var alertList = document.querySelectorAll('.alert');
        alertList.forEach(function (alert) {
            let alertObj = new bootstrap.Alert(alert);
            alertObj.close();
        });
        resetInputs();
    }
    let paused = false;
    function pausePlayTime(){
        paused = !paused;
        let icon = document.getElementById('pauseicon');
        if(icon.innerText == 'play_arrow') icon.innerText = 'pause';
        else icon.innerText = 'play_arrow';
    }
    const delay = ms => new Promise(res => setTimeout(res, ms));
    const spawnTemplate = async (num) => {
        let objType = document.getElementById('object-choice');
        let outerSpawnTry = 0;
        switch(num){
            case 1:
                inputx.value = -9;
                inputy.value = 20;
                inputz.value = -5;
                inputvx.value = Math.random() + 10;
                inputvy.value = (6 * Math.random()) - 16;
                inputvz.value = (6 * Math.random()) - 3;
                objType.value = "sphere";
                staticCheck.checked = false;
                outerSpawnTry = 0;
                if(spawnObject())
                for(let i=0; i<100; i++){
                    let spawned = false;
                    let spawnTry = 0;
                    while(!spawned) {
                        if(spawnTry>3) break;
                        await delay(200);
                        inputx.value = -9;
                        inputy.value = 20;
                        inputz.value = -5;
                        inputvx.value = Math.random() + 10;
                        inputvy.value = (6 * Math.random()) - 16;
                        inputvz.value = (6 * Math.random()) - 3;
                        objType.value = "sphere";
                        staticCheck.checked = false;
                        spawned = spawnObject();
                        spawnTry++;
                    }
                    if(spawnTry>5) outerSpawnTry++;
                    if(outerSpawnTry>3) break;
                }
                break;
            case 2:
                for(let i=-1;i<2;i++){
                    for(let j=-1;j<2;j++){
                        for(let k=3;k<6;k++){
                            inputx.value = i * 2;
                            inputy.value = k * 2;
                            inputz.value = j * 2;
                            staticCheck.checked = false;
                            inputvx.value = i * 10.0 * (Math.random() + 1);
                            inputvy.value = k * 10.0 * (Math.random() + 1);
                            inputvz.value = j * 10.0 * (Math.random() + 1);
                            objType.value = "sphere";
                            spawnObject();
                        }
                    }
                }
                break;
            case 3:
                inputx.value = 0;
                inputy.value = 5;
                inputz.value = 1;
                inputvx.value = 8 * Math.random() - 4;
                inputvy.value = 10 * Math.random() + 30;
                inputvz.value = 8 * Math.random() - 4;
                objType.value = "sphere";
                staticCheck.checked = false;
                outerSpawnTry = 0;
                if(spawnObject())
                for(let i=0; i<60; i++){
                    let spawned = false;
                    let spawnTry = 0;
                    while(!spawned) {
                        if(spawnTry>3) break;
                        await delay(150);
                        inputx.value = 0;
                        inputy.value = 5;
                        inputz.value = 1;
                        inputvx.value = 8 * Math.random() - 4;
                        inputvy.value = 10 * Math.random() + 30;
                        inputvz.value = 8 * Math.random() - 4;
                        staticCheck.checked = false;
                        objType.value = "sphere";
                        spawned = spawnObject();
                        spawnTry++;
                    }
                    if(spawnTry>5) outerSpawnTry++;
                    if(outerSpawnTry>3) break;
                }
                break;
            case 4:
                for(let i=-1;i<2;i++){
                    for(let j=-1;j<2;j++){
                        for(let k=3;k<6;k++){
                            inputx.value = i * 2;
                            inputy.value = k * 2;
                            inputz.value = j * 2;
                            inputvx.value = i * 10.0 * (Math.random() + 1);
                            inputvy.value = k * 10.0 * (Math.random() + 1);
                            inputvz.value = j * 10.0 * (Math.random() + 1);
                            objType.value = "cube";
                            staticCheck.checked = false;
                            spawnObject();
                        }
                    }
                }
                break;
        }
    }
    // Math functions
    function getDistance(arr1, arr2){
        return Math.sqrt((arr1[0] - arr2[0]) * (arr1[0] - arr2[0]) + (arr1[1] - arr2[1]) * (arr1[1] - arr2[1]) + (arr1[2] - arr2[2]) * (arr1[2] - arr2[2]));
    }
    function clampToRange(value, min, max){
        if(value <= min) return min;
        else if(value >= max) return max;
        return value;
    }
    function closestPointTo(OBB1, pos){
        let directionVec = [
            pos[0] - OBB1.pos[0],
            pos[1] - OBB1.pos[1],
            pos[2] - OBB1.pos[2],
        ];
        let size = 1.0;
        let distanceX = clampToRange(dotVec(directionVec, OBB1.axisX), -size, size);
        let distanceY = clampToRange(dotVec(directionVec, OBB1.axisY), -size, size);
        let distanceZ = clampToRange(dotVec(directionVec, OBB1.axisZ), -size, size);
        return [
            +OBB1.pos[0] + distanceX * OBB1.axisX[0] + distanceY * OBB1.axisY[0] + distanceZ * OBB1.axisZ[0],
            +OBB1.pos[1] + distanceX * OBB1.axisX[1] + distanceY * OBB1.axisY[1] + distanceZ * OBB1.axisZ[1],
            +OBB1.pos[2] + distanceX * OBB1.axisX[2] + distanceY * OBB1.axisY[2] + distanceZ * OBB1.axisZ[2],
        ];
    }
    function collidingSpheres(arr1, arr2){
        return getDistance(arr1, arr2) < 2.0;
    }
    function calculateNormal(arr1, arr2){
        let dist = getDistance(arr1, arr2);
        return [
            (arr1[0] - arr2[0]) / dist,
            (arr1[1] - arr2[1]) / dist,
            (arr1[2] - arr2[2]) / dist,
        ];
    }
    function dotVec(arr1, arr2){
        return arr1[0] * arr2[0] + arr1[1] * arr2[1] + arr1[2] * arr2[2];
    }
    function crossVec(arr1, arr2){
        return [
            arr1[1] * arr2[2] - arr1[2] * arr2[1],
            arr1[2] * arr2[0] - arr1[0] * arr2[2],
            arr1[0] * arr2[1] - arr1[1] * arr2[0],
        ];
    }
    function rotateAxis(axis, rotArr){
        let i = axis[0];
        let j = axis[1];
        let k = axis[2];
        let x = rotArr[0];
        let y = rotArr[1];
        let z = rotArr[2];
        return [
            -j * Math.cos(y) * Math.sin(z) + k * Math.sin(y) + i * Math.cos(y) * Math.cos(z),
            j * Math.cos(x) * Math.cos(z) - j * Math.sin(x) * Math.sin(y) * Math.sin(z) - k * Math.sin(x) * Math.cos(y) + i * Math.cos(x) * Math.sin(z) + i * Math.sin(x) * Math.sin(y) * Math.cos(z),
            j * Math.cos(x) * Math.sin(y) * Math.sin(z) + j * Math.sin(x) * Math.cos(z) + k * Math.cos(x) * Math.cos(y) + i * Math.sin(x) * Math.sin(z) - i * Math.cos(x) * Math.sin(y) * Math.cos(z)
        ];
    }
    function normalize(arr){
        let length = Math.sqrt(arr[0] * arr[0] + arr[1] * arr[1] + arr[2] * arr[2]);
        return [
            arr[0] / length,
            arr[1] / length,
            arr[2] / length
        ];
    }
    function projShapeOntoAxis(axis, OBB){
        let min = dotVec(axis, OBB.vertices[0]);
        let max = min;
        let collVertex = OBB.vertices[0];
        for(let i=1; i<OBB.vertices.length; i++){
            let p = dotVec(axis, OBB.vertices[i]);
            if(p < min) {
                min = p;
                collVertex = OBB.vertices[i];
            }
            if(p > max) max = p;
        }
        return {
            min: min,
            max: max,
            collVertex: collVertex
        };
    }
    function cubeCubeCollision(OBB1, OBB2){
        let proj1, proj2, overlap = 0;
        let minOverlap = null;
        let smallestAxis;
        let vertexObj;

        let axes1 = [
            OBB1.axisX, OBB1.axisY, OBB1.axisZ,
            normalize(crossVec(OBB1.axisX, OBB2.axisX)), normalize(crossVec(OBB1.axisX, OBB2.axisY)), normalize(crossVec(OBB1.axisX, OBB2.axisZ)), 
            normalize(crossVec(OBB1.axisY, OBB2.axisX)), normalize(crossVec(OBB1.axisY, OBB2.axisY)), normalize(crossVec(OBB1.axisY, OBB2.axisZ)),
            normalize(crossVec(OBB1.axisZ, OBB2.axisX)), normalize(crossVec(OBB1.axisZ, OBB2.axisY)), normalize(crossVec(OBB1.axisZ, OBB2.axisZ)),
        ];
        let axes2 = [
            OBB2.axisX, OBB2.axisY, OBB2.axisZ,
            normalize(crossVec(OBB2.axisX, OBB1.axisX)), normalize(crossVec(OBB2.axisX, OBB1.axisY)), normalize(crossVec(OBB2.axisX, OBB1.axisZ)), 
            normalize(crossVec(OBB2.axisY, OBB1.axisX)), normalize(crossVec(OBB2.axisY, OBB1.axisY)), normalize(crossVec(OBB2.axisY, OBB1.axisZ)),
            normalize(crossVec(OBB2.axisZ, OBB1.axisX)), normalize(crossVec(OBB2.axisZ, OBB1.axisY)), normalize(crossVec(OBB2.axisZ, OBB1.axisZ)),
        ];

        for(let i=0; i<axes1.length; i++){
            proj1 = projShapeOntoAxis(axes1[i], OBB1);
            proj2 = projShapeOntoAxis(axes1[i], OBB2);
            overlap = Math.min(proj1.max, proj2.max) - Math.max(proj1.min, proj2.min);
            if(overlap < 0) return false;
            if((proj1.max > proj2.max && proj1.min < proj2.min) || 
                (proj1.max < proj2.max && proj1.min > proj2.min)){
                    let mins = Math.abs(proj1.min - proj2.min);
                    let maxs = Math.abs(proj1.max - proj2.max);
                    if(mins < maxs) overlap += mins;
                    else{
                        overlap += maxs;
                        axes1[i] = [-axes1[i][0], -axes1[i][1], -axes1[i][2]];
                    }
            }
            if(overlap < minOverlap || minOverlap === null){
                minOverlap = overlap;
                smallestAxis = axes1[i];
                vertexObj = OBB2;
                if(proj1.max > proj2.max){
                    smallestAxis = [-axes1[i][0], -axes1[i][1], -axes1[i][2]];
                }
            }
            
        }
        for(let i=0; i<axes2.length; i++){
            proj1 = projShapeOntoAxis(axes2[i], OBB1);
            proj2 = projShapeOntoAxis(axes2[i], OBB2);
            overlap = Math.min(proj1.max, proj2.max) - Math.max(proj1.min, proj2.min);
            if(overlap < 0) return false;
            if((proj1.max > proj2.max && proj1.min < proj2.min) || 
                (proj1.max < proj2.max && proj1.min > proj2.min)){
                    let mins = Math.abs(proj1.min - proj2.min);
                    let maxs = Math.abs(proj1.max - proj2.max);
                    if(mins < maxs) overlap += mins;
                    else{
                        overlap += maxs;
                        axes2[i] = [-axes2[i][0], -axes2[i][1], -axes2[i][2]];
                    }
            }
            if(overlap < minOverlap || minOverlap === null){
                minOverlap = overlap;
                smallestAxis = axes2[i];
                vertexObj = OBB1;
                if(proj1.max < proj2.max){
                    smallestAxis = [-axes2[i][0], -axes2[i][1], -axes2[i][2]];
                }
            }
        }

        let contactVertex = projShapeOntoAxis(smallestAxis, vertexObj).collVertex;

        return {
            colliding: true,
            collisionPoint: contactVertex,
            normal: smallestAxis,
            penetrationDepth: minOverlap
        };
    }
    function OBB(pos, rotArr){
        this.pos = pos;
        let cubeVertices = [
            [-1, -1, -1], [-1, -1, 1],
            [-1, 1, -1], [-1, 1, 1,],
            [1, -1, -1], [1, -1, 1],
            [1, 1, -1], [1, 1, 1]
        ]; 
        for(let i=0; i<cubeVertices.length; i++){
            cubeVertices[i] = rotateAxis(cubeVertices[i], rotArr);
            cubeVertices[i] = [
                cubeVertices[i][0] + pos[0],
                cubeVertices[i][1] + pos[1],
                cubeVertices[i][2] + pos[2],
            ];
        }
        
        this.vertices = cubeVertices;
        this.rotation = rotArr;
        this.axisX = rotateAxis([1, 0, 0], rotArr);
        this.axisY = rotateAxis([0, 1, 0], rotArr);
        this.axisZ = rotateAxis([0, 0, 1], rotArr);
        
    }
    function getLength(dir){
        return Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]);
    }
    function solveCubeCubeCollision(cube1Pos, cube2Pos, cube1Vel, cube2Vel, cube1AngVel, cube2AngVel, normalVector, contactPoint, penDepth, isStatic, hasTested){
        let r1 = [
            contactPoint[0] - cube1Pos[0],
            contactPoint[1] - cube1Pos[1],
            contactPoint[2] - cube1Pos[2],
        ];
        let r2 = [
            contactPoint[0] - cube2Pos[0],
            contactPoint[1] - cube2Pos[1],
            contactPoint[2] - cube2Pos[2],
        ];
        let angVelR1 = crossVec(cube1AngVel, r1);
        let angVelR2 = crossVec(cube2AngVel, r2);
        let v1 = [
            cube1Vel[0] + angVelR1[0],
            cube1Vel[1] + angVelR1[1],
            cube1Vel[2] + angVelR1[2],
        ];
        let v2 = [
            cube2Vel[0] + angVelR2[0],
            cube2Vel[1] + angVelR2[1],
            cube2Vel[2] + angVelR2[2],
        ]
        let relVel = [
            v1[0] - v2[0],
            v1[1] - v2[1],
            v1[2] - v2[2],
        ];
        let contactVel = dotVec(relVel, normalVector);
        let r1CrossN = crossVec(r1, normalVector);
        let r2CrossN = crossVec(r2, normalVector);
        
        const mass = 1.0;
        const invMass = 1 / mass;

        let invInertia = [[1.0/(0.6 * mass), 0.0, 0.0], [0.0, 1.0/(0.6 * mass), 0.0], [0.0, 0.0, 1.0/(0.6 * mass)]];
        let transformR1CrossN = [
            r1CrossN[0] * invInertia[0][0] + r1CrossN[1] * invInertia[0][1] + r1CrossN[2] * invInertia[0][2],
            r1CrossN[0] * invInertia[1][0] + r1CrossN[1] * invInertia[1][1] + r1CrossN[2] * invInertia[1][2],
            r1CrossN[0] * invInertia[2][0] + r1CrossN[1] * invInertia[2][1] + r1CrossN[2] * invInertia[2][2],
        ];
        let transformR2CrossN = [
            r2CrossN[0] * invInertia[0][0] + r2CrossN[1] * invInertia[0][1] + r2CrossN[2] * invInertia[0][2],
            r2CrossN[0] * invInertia[1][0] + r2CrossN[1] * invInertia[1][1] + r2CrossN[2] * invInertia[1][2],
            r2CrossN[0] * invInertia[2][0] + r2CrossN[1] * invInertia[2][1] + r2CrossN[2] * invInertia[2][2],
        ];
        let term1 = dotVec(transformR1CrossN, r1CrossN);
        let term2 = dotVec(transformR2CrossN, r2CrossN);
        let J = -(1+.8) * contactVel / (invMass * 2 + term1 + term2);
        let impulse = [
            normalVector[0] * J,
            normalVector[1] * J,
            normalVector[2] * J,
        ];
        let staticCube1Pos;
        if(isStatic){
            if(penDepth < 2.0){
                let penResolution = [
                    normalVector[0] * penDepth ,
                    normalVector[1] * penDepth ,
                    normalVector[2] * penDepth ,
                ];
                cube1Pos = [
                    cube1Pos[0] + penResolution[0],
                    cube1Pos[1] + penResolution[1],
                    cube1Pos[2] + penResolution[2],
                ];
            }
        }else{
            if(penDepth < 2.0 && !hasTested){
                let penResolution = [
                    normalVector[0] * penDepth ,
                    normalVector[1] * penDepth ,
                    normalVector[2] * penDepth ,
                ];
                cube1Pos = [
                    cube1Pos[0] - penResolution[0],
                    cube1Pos[1] - penResolution[1],
                    cube1Pos[2] - penResolution[2],
                ];
                cube2Pos = [
                    cube2Pos[0] + penResolution[0],
                    cube2Pos[1] + penResolution[1],
                    cube2Pos[2] + penResolution[2],
                ];
                staticCube1Pos = [
                    cube1Pos[0] + penResolution[0],
                    cube1Pos[1] + penResolution[1],
                    cube1Pos[2] + penResolution[2],
                ];
            }
        }
        cube1Vel = [
            cube1Vel[0] + impulse[0] * invMass,
            cube1Vel[1] + impulse[1] * invMass,
            cube1Vel[2] + impulse[2] * invMass,
        ];
        cube2Vel = [
            cube2Vel[0] - impulse[0] * invMass,
            cube2Vel[1] - impulse[1] * invMass,
            cube2Vel[2] - impulse[2] * invMass,
        ];
        let angMultiplyR1 = crossVec(r1, impulse);
        angMultiplyR1 = [
            angMultiplyR1[0] * invInertia[0][0] + angMultiplyR1[1] * invInertia[0][1] + angMultiplyR1[2] * invInertia[0][2],
            angMultiplyR1[0] * invInertia[1][0] + angMultiplyR1[1] * invInertia[1][1] + angMultiplyR1[2] * invInertia[1][2],
            angMultiplyR1[0] * invInertia[2][0] + angMultiplyR1[1] * invInertia[2][1] + angMultiplyR1[2] * invInertia[2][2],
        ];
        let angMultiplyR2 = crossVec(r2, impulse);
        angMultiplyR2 = [
            angMultiplyR2[0] * invInertia[0][0] + angMultiplyR2[1] * invInertia[0][1] + angMultiplyR2[2] * invInertia[0][2],
            angMultiplyR2[0] * invInertia[1][0] + angMultiplyR2[1] * invInertia[1][1] + angMultiplyR2[2] * invInertia[1][2],
            angMultiplyR2[0] * invInertia[2][0] + angMultiplyR2[1] * invInertia[2][1] + angMultiplyR2[2] * invInertia[2][2],
        ];
        if(isStatic){
            cube1AngVel = [
                cube1AngVel[0] + angMultiplyR1[0],
                cube1AngVel[1] + angMultiplyR1[1],
                cube1AngVel[2] + angMultiplyR1[2],
            ];
            cube2AngVel = [
                cube2AngVel[0] - angMultiplyR2[0],
                cube2AngVel[1] - angMultiplyR2[1],
                cube2AngVel[2] - angMultiplyR2[2],
            ];
        }  
        else{    
            cube1AngVel = [
                cube1AngVel[0] + angMultiplyR1[0] * 6.28 * deltaTime,
                cube1AngVel[1] + angMultiplyR1[1] * 6.28 * deltaTime,
                cube1AngVel[2] + angMultiplyR1[2] * 6.28 * deltaTime,
            ];
            cube2AngVel = [
                cube2AngVel[0] - angMultiplyR2[0] * 6.28 * deltaTime,
                cube2AngVel[1] - angMultiplyR2[1] * 6.28 * deltaTime,
                cube2AngVel[2] - angMultiplyR2[2] * 6.28 * deltaTime,
            ];
        }
        if(getLength(cube1AngVel) < 0.05) cube1AngVel = [0,0,0];
        if(getLength(cube2AngVel) < 0.05) cube2AngVel = [0,0,0];
        return {
            cube1Pos,
            cube2Pos,
            cube1Vel,
            cube2Vel,
            cube1AngVel,
            cube2AngVel,
            staticCube1Pos
        };
    }
    function solveCubeSphereCollision(cubePos, spherePos, cubeVel, sphereVel, cubeAngVel, normalVector, contactPoint, isCubeSphere){
        let r1 = [
            contactPoint[0] - cubePos[0],
            contactPoint[1] - cubePos[1],
            contactPoint[2] - cubePos[2],
        ];
        let r2 = [
            contactPoint[0] - spherePos[0],
            contactPoint[1] - spherePos[1],
            contactPoint[2] - spherePos[2],
        ];
        let angVelR1 = crossVec(cubeAngVel, r1);
        let v1 = [
            cubeVel[0] + angVelR1[0],
            cubeVel[1] + angVelR1[1],
            cubeVel[2] + angVelR1[2],
        ];
        let relVel = [
            v1[0] - sphereVel[0],
            v1[1] - sphereVel[1],
            v1[2] - sphereVel[2],
        ];
        let contactVel = dotVec(relVel, normalVector);
        let r1CrossN = crossVec(r1, normalVector);
        let r2CrossN = crossVec(r2, normalVector);
        
        const mass = 1.0;
        const invMass = 1 / mass;

        let invInertia = [[1.0/(0.6 * mass), 0.0, 0.0], [0.0, 1.0/(0.6 * mass), 0.0], [0.0, 0.0, 1.0/(0.6 * mass)]];
        let invInertiaSphere = [[5/(2*mass), 0.0, 0.0], [0.0, 5/(2*mass), 0.0], [0.0, 0.0, 5/(2*mass)]];
        let transformR1CrossN = [
            r1CrossN[0] * invInertia[0][0] + r1CrossN[1] * invInertia[0][1] + r1CrossN[2] * invInertia[0][2],
            r1CrossN[0] * invInertia[1][0] + r1CrossN[1] * invInertia[1][1] + r1CrossN[2] * invInertia[1][2],
            r1CrossN[0] * invInertia[2][0] + r1CrossN[1] * invInertia[2][1] + r1CrossN[2] * invInertia[2][2],
        ];
        let transformR2CrossN = [
            r2CrossN[0] * invInertiaSphere[0][0] + r2CrossN[1] * invInertiaSphere[0][1] + r2CrossN[2] * invInertiaSphere[0][2],
            r2CrossN[0] * invInertiaSphere[1][0] + r2CrossN[1] * invInertiaSphere[1][1] + r2CrossN[2] * invInertiaSphere[1][2],
            r2CrossN[0] * invInertiaSphere[2][0] + r2CrossN[1] * invInertiaSphere[2][1] + r2CrossN[2] * invInertiaSphere[2][2],
        ];
        let term1 = dotVec(transformR1CrossN, r1CrossN);
        let term2 = dotVec(transformR2CrossN, r2CrossN);
        let J = -(1+.8) * contactVel / (invMass * 2 + term1 + term2);
        let impulse = [
            normalVector[0] * J,
            normalVector[1] * J,
            normalVector[2] * J,
        ];
        if(isCubeSphere){
            cubeVel = [
                cubeVel[0] + impulse[0] * invMass,
                cubeVel[1] + impulse[1] * invMass,
                cubeVel[2] + impulse[2] * invMass,
            ];
            sphereVel = [
                sphereVel[0] - impulse[0] * invMass,
                sphereVel[1] - impulse[1] * invMass,
                sphereVel[2] - impulse[2] * invMass,
            ];
        }
        else{
            cubeVel = [
                cubeVel[0] - impulse[0] * invMass,
                cubeVel[1] - impulse[1] * invMass,
                cubeVel[2] - impulse[2] * invMass,
            ];
            sphereVel = [
                sphereVel[0] + impulse[0] * invMass,
                sphereVel[1] + impulse[1] * invMass,
                sphereVel[2] + impulse[2] * invMass,
            ];
        }
        let angMultiplyR1 = crossVec(r1, impulse);
        angMultiplyR1 = [
            angMultiplyR1[0] * invInertia[0][0] + angMultiplyR1[1] * invInertia[0][1] + angMultiplyR1[2] * invInertia[0][2],
            angMultiplyR1[0] * invInertia[1][0] + angMultiplyR1[1] * invInertia[1][1] + angMultiplyR1[2] * invInertia[1][2],
            angMultiplyR1[0] * invInertia[2][0] + angMultiplyR1[1] * invInertia[2][1] + angMultiplyR1[2] * invInertia[2][2],
        ];
        if(isCubeSphere)
            cubeAngVel = [
                cubeAngVel[0] + angMultiplyR1[0],
                cubeAngVel[1] + angMultiplyR1[1],
                cubeAngVel[2] + angMultiplyR1[2],
            ];
        else
            cubeAngVel = [
                cubeAngVel[0] - angMultiplyR1[0],
                cubeAngVel[1] - angMultiplyR1[1],
                cubeAngVel[2] - angMultiplyR1[2],
            ];

        return {
            cubePos,
            spherePos,
            cubeVel,
            sphereVel,
            cubeAngVel
        };
    }
    const frictionalCoeffS = 1.25;
    const frictionalCoeffC = 1.5;
    function updatePosition(deltaTime){
        let calculationDoneListSpheres = [];
        let calculationDoneListCubes = [];
        for(let i=0; i<spherePos.length; i++){
            while(sphereStatic[i] == 1) i++;
            if(i>=spherePos.length) break;
            let xColliding = false;
            let yColliding = false;
            let zColliding = false;
            let frictionApplied = false;
            let possibleVel = [
                sphereVel[i][0] + sphereAcc[i][0] * deltaTime,
                sphereVel[i][1] + sphereAcc[i][1] * deltaTime,
                sphereVel[i][2] + sphereAcc[i][2] * deltaTime,
            ];
            let possiblePos = [
                spherePos[i][0] + sphereVel[i][0] * deltaTime,
                spherePos[i][1] + sphereVel[i][1] * deltaTime,
                spherePos[i][2] + sphereVel[i][2] * deltaTime,
            ];
            let prevPos = [
                spherePos[i][0] - sphereVel[i][0] * deltaTime,
                spherePos[i][1] - sphereVel[i][1] * deltaTime,
                spherePos[i][2] - sphereVel[i][2] * deltaTime,
            ];
            let possibleSpeed = Math.sqrt(Math.pow(possibleVel[0], 2.0) + Math.pow(possibleVel[1], 2.0) + Math.pow(possibleVel[2], 2.0));
            let thisSpeedVel = Math.sqrt(Math.pow(sphereVel[i][0], 2.0) + Math.pow(sphereVel[i][1], 2.0) + Math.pow(sphereVel[i][2], 2.0));
            let normalVector = [];
            // sphere-cube collisions
            for(let j=1; j<cubePos.length; j++){
                let OBB1 = new OBB(cubePos[j], cubeAng[j]);
                let closestPoint = closestPointTo(OBB1, spherePos[i]);
                if(getDistance(closestPoint, spherePos[i]) < 1.0) {
                    //collision response

                    // define normal vector
                    if(getDistance(closestPoint, spherePos[i]) < 1.0) {
                        // colision response
                        // define normal vector
                        normalVector = calculateNormal(possiblePos, closestPoint);
                        let sphereCubeCollision = solveCubeSphereCollision(cubePos[j], spherePos[i], cubeVel[j], sphereVel[i], cubeAngVel[j], normalVector, closestPoint, false);
                        if(cubeStatic[j]==0){
                            cubePos[j] = sphereCubeCollision.cubePos;
                            cubeVel[j] = sphereCubeCollision.cubeVel;
                            cubeAngVel[j] = sphereCubeCollision.cubeAngVel;
                            possiblePos = sphereCubeCollision.spherePos;
                            possibleVel = sphereCubeCollision.sphereVel;
                            calculationDoneListCubes.push(j);
                        }
                        else{
                            possiblePos = sphereCubeCollision.spherePos;
                            possibleVel = sphereCubeCollision.sphereVel;
                        }
                    }
                }
            }
            // sphere-sphere collisions
            for(let j=0;j<spherePos.length;j++){
                if(i!=j){
                    if(Math.abs(possiblePos[0] - spherePos[j][0]) < 2.0 && collidingSpheres(possiblePos, spherePos[j]) && Math.abs(prevPos[0] - spherePos[j][0]) >= 1) {
                        xColliding = true;
                    }
                    if(Math.abs(possiblePos[1] - spherePos[j][1]) < 2.0 && collidingSpheres(possiblePos, spherePos[j]) && Math.abs(prevPos[1] - spherePos[j][1]) >= 1) {
                        yColliding = true;
                    }
                    if(Math.abs(possiblePos[2] - spherePos[j][2]) < 2.0 && collidingSpheres(possiblePos, spherePos[j]) && Math.abs(prevPos[2] - spherePos[j][2]) >= 1) {
                        zColliding = true;
                    }
                    if((xColliding||yColliding||zColliding) && collidingSpheres(possiblePos, spherePos[j])){
                        normalVector = calculateNormal(possiblePos, spherePos[j]);
                        if(sphereStatic[j]==0){
                            let canCalculate = true;
                            for(let k=0;k<calculationDoneListSpheres;k++){
                                if(calculationDoneListSpheres[k]==i){
                                    canCalculate = false;
                                    break;
                                }
                            }
                            if(canCalculate){
                                // transfer of velocity
                                let otherSphereVel = Math.sqrt(Math.pow(sphereVel[j][0], 2.0) + Math.pow(sphereVel[j][1], 2.0) + Math.pow(sphereVel[j][2], 2.0));
                                sphereVel[j][0] = (sphereVel[j][0] - normalVector[0] * thisSpeedVel - normalVector[0] * otherSphereVel) / 2.4;
                                sphereVel[i][0] = (possibleVel[0] + normalVector[0] * otherSphereVel + normalVector[0] * thisSpeedVel) / 2.4;
                                sphereVel[j][1] = (sphereVel[j][1] - normalVector[1] * thisSpeedVel - normalVector[1] * otherSphereVel) / 2.4;
                                sphereVel[i][1] = (possibleVel[1] + normalVector[1] * otherSphereVel + normalVector[1] * thisSpeedVel) / 2.4;
                                sphereVel[j][2] = (sphereVel[j][2] - normalVector[2] * thisSpeedVel - normalVector[2] * otherSphereVel) / 2.4;
                                sphereVel[i][2] = (possibleVel[2] + normalVector[2] * otherSphereVel + normalVector[2] * thisSpeedVel) / 2.4;
                                calculationDoneListSpheres.push(j);
                            }
                        }
                        else{
                            // bounce
                            sphereVel[i][0] = normalVector[0] * Math.abs(possibleSpeed) / 2.4;
                            sphereVel[i][1] = normalVector[1] * Math.abs(possibleSpeed) / 2.4;
                            sphereVel[i][2] = normalVector[2] * Math.abs(possibleSpeed) / 2.4;
                        }
                    }
                }
            }
            // sphere-wall collisions
            if(possiblePos[0] >= 9){
                xColliding = true;
                normalVector = calculateNormal(possiblePos, [10, possiblePos[1], possiblePos[2]]);
                sphereVel[i][0] = normalVector[0] * Math.abs(sphereVel[i][0]) / 2.4;
            }
            else if(possiblePos[0] <= -9){
                xColliding = true;
                normalVector = calculateNormal(possiblePos, [-10, possiblePos[1], possiblePos[2]]);
                sphereVel[i][0] = normalVector[0] * Math.abs(sphereVel[i][0]) / 2.4;
            }
            if(possiblePos[2] >= 9){
                zColliding = true;
                normalVector = calculateNormal(possiblePos, [possiblePos[0], possiblePos[1], 10]);
                sphereVel[i][2] = normalVector[2] * Math.abs(sphereVel[i][2]) / 2.4;
            }
            else if(possiblePos[2] <= -9){
                zColliding = true;
                normalVector = calculateNormal(possiblePos, [possiblePos[0], possiblePos[1], -10]);
                sphereVel[i][2] = normalVector[2] * Math.abs(sphereVel[i][2]) / 2.4;
            }
            // sphere-ground and sphere-ceiling collision
            if(possiblePos[1] >= 45.0) {
                yColliding = true;
                normalVector = calculateNormal(possiblePos, [possiblePos[0],46,possiblePos[2]]);
                sphereVel[i][1] = normalVector[1] * Math.abs(sphereVel[i][1]) / 2.4;
            }
            else if(possiblePos[1] <= 0.0) {
                yColliding = true;
                normalVector = calculateNormal(possiblePos, [possiblePos[0],-2,possiblePos[2]]);
                sphereVel[i][1] = normalVector[1] * Math.abs(sphereVel[i][1]) / 2.4;
                possibleVel[1] = normalVector[1] * Math.abs(sphereVel[i][1]) / 2.4;
                frictionApplied = true;
            }
            // updating unblocked position
            if(!xColliding){
                sphereVel[i][0] = possibleVel[0];
                if(frictionApplied)
                    sphereVel[i][0] *= 1.0 - frictionalCoeffS * deltaTime;
                spherePos[i][0] = possiblePos[0];
            }
            if(!yColliding){
                sphereVel[i][1] = possibleVel[1];
                spherePos[i][1] = possiblePos[1];
            }
            if(!zColliding){
                sphereVel[i][2] = possibleVel[2];
                if(frictionApplied)
                    sphereVel[i][2] *= 1.0 - frictionalCoeffS * deltaTime;
                spherePos[i][2] = possiblePos[2];
            }
        }
        for(let i=1; i<cubePos.length; i++){
            while(cubeStatic[i] == 1) i++;
            if(i>=cubePos.length) break;
            let frictionApplied = false;
            let possibleVel = [
                cubeVel[i][0] + cubeAcc[i][0] * deltaTime,
                cubeVel[i][1] + cubeAcc[i][1] * deltaTime,
                cubeVel[i][2] + cubeAcc[i][2] * deltaTime,
            ];
            let possiblePos = [
                cubePos[i][0] + cubeVel[i][0] * deltaTime,
                cubePos[i][1] + cubeVel[i][1] * deltaTime,
                cubePos[i][2] + cubeVel[i][2] * deltaTime,
            ];
            let possibleAngVel= [
                cubeAngVel[i][0] + cubeAngAcc[i][0] * deltaTime,
                cubeAngVel[i][1] + cubeAngAcc[i][1] * deltaTime,
                cubeAngVel[i][2] + cubeAngAcc[i][2] * deltaTime,
            ];
            let possibleAng = [
                cubeAng[i][0] + cubeAngVel[i][0] * deltaTime,
                cubeAng[i][1] + cubeAngVel[i][1] * deltaTime,
                cubeAng[i][2] + cubeAngVel[i][2] * deltaTime,
            ];
            let normalVector = [];
            let AABBcolliding = false;
            let OBBcolliding = false;
            // OBB creation
            cubeVel[i] = possibleVel;
            cubeAngVel[i] = possibleAngVel;
            cubePos[i] = possiblePos;
            cubeAng[i] = possibleAng;
            let hasTestedArr = Array.apply(false, Array(cubePos.length).map(function (){}));
            let OBB1 = new OBB(cubePos[i], cubeAng[i]);
            // AABB collision testing
            for(let j=1; j<cubePos.length;j++){
                if(i!=j)
                if(Math.abs(possiblePos[0] - cubePos[j][0]) < 2 * Math.sqrt(2.0) && Math.abs(possiblePos[1] - cubePos[j][1]) < 2 * Math.sqrt(2.0) && Math.abs(possiblePos[2] - cubePos[j][2]) < 2 * Math.sqrt(2.0)) {
                    AABBcolliding = true;
                    break;
                }
            }
            if(!AABBcolliding){
                for(let j=0; j<spherePos.length; j++){
                    if(Math.abs(possiblePos[0] - spherePos[j][0]) < 2 * Math.sqrt(2.0) && Math.abs(possiblePos[1] - spherePos[j][1]) < 2 * Math.sqrt(2.0) && Math.abs(possiblePos[2] - spherePos[j][2]) < 2 * Math.sqrt(2.0)) {
                        AABBcolliding = true;
                        break;
                    }
                }
            }
            // OBB collisions
            if(AABBcolliding){
                // cube-cube collisions
                for(let j=1; j<cubePos.length; j++){
                    if(i!=j){
                        let OBB2 = new OBB(cubePos[j], cubeAng[j]);
                        OBBcolliding = cubeCubeCollision(OBB1, OBB2);
                        if(OBBcolliding.colliding) {
                            // colision response
                            let closest1 = closestPointTo(OBB1, OBB2.pos);
                            let closest2 = closestPointTo(OBB2, OBB1.pos);
                            for(let iteration = 0; iteration < 30; iteration++){
                                closest1 = closestPointTo(OBB1, closest2);
                                closest2 = closestPointTo(OBB2, closest1);
                            }
                            let contactPoint = [
                                (closest1[0] + closest2[0]) / 2.0,
                                (closest1[1] + closest2[1]) / 2.0,
                                (closest1[2] + closest2[2]) / 2.0,
                            ];
                            normalVector = normalize(OBBcolliding.normal);
                            let solvedCollision = solveCubeCubeCollision(cubePos[i], cubePos[j], cubeVel[i], cubeVel[j], cubeAngVel[i], cubeAngVel[j], normalVector, contactPoint, OBBcolliding.penetrationDepth, false, hasTestedArr[i] || hasTestedArr[j]);
                            hasTestedArr[i] = true;
                            hasTestedArr[j] = true;
                            if(cubeStatic[j] == 0){
                                cubePos[i] = solvedCollision.cube1Pos;
                                cubePos[j] = solvedCollision.cube2Pos;
                                cubeVel[i] = solvedCollision.cube1Vel;
                                cubeVel[j] = solvedCollision.cube2Vel;
                                cubeAngVel[i] = solvedCollision.cube1AngVel;
                                cubeAngVel[j] = solvedCollision.cube2AngVel;
                            }
                            else{
                                cubePos[i] = solvedCollision.cube1Pos;
                                cubeVel[i] = solvedCollision.cube1Vel;  
                                cubeAngVel[i] = solvedCollision.cube1AngVel;
                            }
                        }
                    }
                }
                // cube-sphere collisions
                for(let j=0; j<spherePos.length; j++){
                    if(!calculationDoneListCubes.includes(i)){
                        let closestPoint = closestPointTo(OBB1, spherePos[j]);
                        if(getDistance(closestPoint, spherePos[j]) < 1.0) {
                            // colision response
                            // define normal vector
                            normalVector = calculateNormal(cubePos[i], closestPoint);
                            let sphereCubeCollision = solveCubeSphereCollision(cubePos[i], spherePos[j], cubeVel[i], sphereVel[j], cubeAngVel[i], normalVector, closestPoint, true);
                            if(sphereStatic[j]==0){
                                cubePos[i] = sphereCubeCollision.cubePos;
                                cubeVel[i] = sphereCubeCollision.cubeVel;
                                cubeAngVel[i] = sphereCubeCollision.cubeAngVel;
                                spherePos[j] = sphereCubeCollision.spherePos;
                                sphereVel[j] = sphereCubeCollision.sphereVel;
                            }
                            else{
                                cubePos[i] = sphereCubeCollision.cubePos;
                                cubeVel[i] = sphereCubeCollision.cubeVel;
                                cubeAngVel[i] = sphereCubeCollision.cubeAngVel;
                            }
                        }
                    }
                    
                }
            }
            // cube-wall collisions
            if(cubePos[i][0] >= 7){
                let wallOBB = new OBB([11, cubePos[i][1], cubePos[i][2]], [cubeAng[i][0], 0, 0]);
                OBBcolliding = cubeCubeCollision(OBB1, wallOBB);
                if(OBBcolliding.colliding){
                    let contactPoint = OBBcolliding.collisionPoint;
                    let normalVector = [-1, 0, 0];
                    let solvedCollision = solveCubeCubeCollision(cubePos[i], wallOBB.pos, cubeVel[i], [0,0,0], cubeAngVel[i], [0,0,0], normalVector, contactPoint, OBBcolliding.penetrationDepth, true, false);
                    cubePos[i] = solvedCollision.cube1Pos;
                    cubeVel[i] = solvedCollision.cube1Vel;  
                    cubeAngVel[i] = solvedCollision.cube1AngVel;
                }
            }
            else if(cubePos[i][0] <= -7){
                let wallOBB = new OBB([-11, cubePos[i][1], cubePos[i][2]], [cubeAng[i][0], 0, 0]);
                OBBcolliding = cubeCubeCollision(OBB1, wallOBB);
                if(OBBcolliding.colliding){
                    let contactPoint = OBBcolliding.collisionPoint;
                    let normalVector = [1, 0, 0];
                    let solvedCollision = solveCubeCubeCollision(cubePos[i], wallOBB.pos, cubeVel[i], [0,0,0], cubeAngVel[i], [0,0,0], normalVector, contactPoint, OBBcolliding.penetrationDepth, true, false);
                    cubePos[i] = solvedCollision.cube1Pos;
                    cubeVel[i] = solvedCollision.cube1Vel;  
                    cubeAngVel[i] = solvedCollision.cube1AngVel;
                }
            }
            if(cubePos[i][2] >= 7){
                let wallOBB = new OBB([cubePos[i][0], cubePos[i][1], 11], [0, 0, cubeAng[i][2]]);
                OBBcolliding = cubeCubeCollision(OBB1, wallOBB);
                if(OBBcolliding.colliding){
                    let contactPoint = OBBcolliding.collisionPoint;
                    let normalVector = [0, 0, -1];
                    let solvedCollision = solveCubeCubeCollision(cubePos[i], wallOBB.pos, cubeVel[i], [0,0,0], cubeAngVel[i], [0,0,0], normalVector, contactPoint, OBBcolliding.penetrationDepth, true, false);
                    cubePos[i] = solvedCollision.cube1Pos;
                    cubeVel[i] = solvedCollision.cube1Vel;  
                    cubeAngVel[i] = solvedCollision.cube1AngVel;
                }
            }
            else if(cubePos[i][2] <= -7){
                let wallOBB = new OBB([cubePos[i][0], cubePos[i][1], -11], [0, 0, cubeAng[i][2]]);
                OBBcolliding = cubeCubeCollision(OBB1, wallOBB);
                if(OBBcolliding.colliding){
                    let contactPoint = OBBcolliding.collisionPoint;
                    let normalVector = [0, 0, 1];
                    let solvedCollision = solveCubeCubeCollision(cubePos[i], wallOBB.pos, cubeVel[i], [0,0,0], cubeAngVel[i], [0,0,0], normalVector, contactPoint, OBBcolliding.penetrationDepth, true, false);
                    cubePos[i] = solvedCollision.cube1Pos;
                    cubeVel[i] = solvedCollision.cube1Vel;  
                    cubeAngVel[i] = solvedCollision.cube1AngVel;
                }
            }
            // cube-ground and cube-ceiling collision
            if(cubePos[i][1] >= 44){
                let ceilingOBB = new OBB([cubePos[i][0], 46, cubePos[i][2]], [0, cubeAng[i][1], 0]);
                OBBcolliding = cubeCubeCollision(OBB1, ceilingOBB);
                if(OBBcolliding.colliding){
                    let contactPoint = OBBcolliding.collisionPoint;
                    let normalVector = [0, -1, 0];
                    let solvedCollision = solveCubeCubeCollision(cubePos[i], ceilingOBB.pos, cubeVel[i], [0,0,0], cubeAngVel[i], [0,0,0], normalVector, contactPoint, OBBcolliding.penetrationDepth, true, false);
                    cubePos[i] = solvedCollision.cube1Pos;
                    cubeVel[i] = solvedCollision.cube1Vel;  
                    cubeAngVel[i] = solvedCollision.cube1AngVel;
                }
            }
            else if(cubePos[i][1] <= 2){
                let groundOBB = new OBB([cubePos[i][0], -2, cubePos[i][2]], [0, cubeAng[i][1], 0]);
                OBBcolliding = cubeCubeCollision(OBB1, groundOBB);
                if(OBBcolliding.colliding){
                    let contactPoint = OBBcolliding.collisionPoint;
                    let normalVector = [0, 1, 0];
                    let solvedCollision = solveCubeCubeCollision(cubePos[i], groundOBB.pos, cubeVel[i], [0,0,0], cubeAngVel[i], [0,0,0], normalVector, contactPoint, OBBcolliding.penetrationDepth, true, false);
                    cubePos[i] = solvedCollision.cube1Pos;
                    cubeVel[i] = solvedCollision.cube1Vel;  
                    cubeAngVel[i] = solvedCollision.cube1AngVel;
                    frictionApplied = true;
                }
            }
            if(frictionApplied){
                cubeVel[i][0] *= 1.0 - frictionalCoeffC * deltaTime;
                cubeVel[i][2] *= 1.0 - frictionalCoeffC * deltaTime;
            }
        }
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
            -(cameraLoc[0]*Math.cos(newCamRot[1]) + cameraLoc[2] * Math.sin(newCamRot[1])),
            Math.abs(cameraLoc[0]*Math.sin(newCamRot[0])*Math.sin(newCamRot[1]) + cameraLoc[1]*Math.cos(newCamRot[0])-cameraLoc[2]*Math.sin(newCamRot[0])*Math.cos(newCamRot[1])),
            -cameraLoc[0]*Math.cos(newCamRot[0])*Math.sin(newCamRot[1]) + cameraLoc[1]*Math.sin(newCamRot[0]) + cameraLoc[2]*Math.cos(newCamRot[0])*Math.cos(newCamRot[1])
        ];
        updateCamPos(newCamLoc);
        if(!paused)
            updatePosition(deltaTime);
        

        drawScene(gl, shaderProgram, programInfo, buffers, planeBuffers, sphereBuffers, cameraLoc, cameraRot, cubePos, cubeAng, spherePos);
        
        
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
