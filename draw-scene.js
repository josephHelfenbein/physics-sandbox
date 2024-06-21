function drawScene(gl, shaderProgram, programInfo, buffers, planeBuffers, sphereBuffers, cameraLoc, cameraRot, cubePos, spherePos) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.FRAMEBUFFER_SRGB); 
    // Clear the canvas before we start drawing on it.
    
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
  
    const fieldOfView = (45 * Math.PI) / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 120.0;
      
    const projectionMatrix = mat4.create();
   
    // note: glmatrix.js always has the first argument
    // as the destination to receive the result.

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    let newCameraRot = [cameraRot[0] * Math.PI * 0.00555555556,cameraRot[1] * Math.PI * 0.00555555556]; 
    let newCameraLoc = [-cameraLoc[0],-cameraLoc[1],-cameraLoc[2]];

    mat4.translate(
      projectionMatrix,
      projectionMatrix,
      newCameraLoc,
    );
        

    mat4.rotate(
      projectionMatrix,projectionMatrix, newCameraRot[0], [1,0,0],
    );
    mat4.rotate(
      projectionMatrix,projectionMatrix, newCameraRot[1], [0,1,0],
    );
    
 

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();
  


    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

  
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    setPositionAttribute(gl, buffers, programInfo);
    setColorAttribute(gl, buffers, programInfo);


    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);   

    setNormalAttribute(gl, buffers, programInfo);

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);
    
    let triangles = [
      // Front face
      -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0,     -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0,
    
      // Back face
      -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0,      1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, 1.0, -1.0,
    
      // Top face
      -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0,     1.0, 1.0, -1.0,-1.0, 1.0, -1.0,1.0, 1.0, 1.0,
    
      // Bottom face
      -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0,      -1.0, -1.0, 1.0,-1.0, -1.0, -1.0, 1.0, -1.0, 1.0,
    
      // Right face
      1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0,     1.0, -1.0, 1.0,1.0, -1.0, -1.0,1.0, 1.0, 1.0,
    
      // Left face
      -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0,      -1.0, 1.0, -1.0,-1.0, -1.0, -1.0,-1.0, 1.0, 1.0,
    ];
    const triangleCount = triangles.length / 9;
    const textureSize = Math.ceil(Math.sqrt((triangleCount*cubePos.length + spherePos.length) * 3));
    let texArr = new Float32Array(textureSize * textureSize * 4);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // CUBE DRAWING
    for(let k=0; k<cubePos.length; k++){
      mat4.translate(modelViewMatrix, modelViewMatrix, [cubePos[k][0], cubePos[k][1], cubePos[k][2]]);
      // Set the shader uniforms
      gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix,
      );
      gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix,
      );
      gl.uniformMatrix4fv(
          programInfo.uniformLocations.normalMatrix,
          false,
          normalMatrix,
      );

      
      texArr = addToTriangles(k, triangleCount, triangles, texArr, modelViewMatrix, 0);

      
      // draw cube
      {
          const vertexCount = buffers.vertices;
          const type = gl.UNSIGNED_SHORT;
          const offset = 0;
          gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
      }      
      mat4.translate(modelViewMatrix, modelViewMatrix, [-cubePos[k][0], -cubePos[k][1], -cubePos[k][2]]);
    }





    setPositionAttribute(gl, sphereBuffers, programInfo);
    setColorAttribute(gl, sphereBuffers, programInfo);
    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereBuffers.indices);   
    setNormalAttribute(gl, sphereBuffers, programInfo);
    const lastIndex = ((triangleCount -1) * 3 + 2) * 4 + 108 * (cubePos.length-1) + 4;
    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);
    //SPHERE DRAWING
    for(let k=0; k<spherePos.length; k++){
        mat4.translate(modelViewMatrix, modelViewMatrix, [spherePos[k][0], spherePos[k][1], spherePos[k][2]]);
        // Set the shader uniforms
        gl.uniformMatrix4fv(
          programInfo.uniformLocations.projectionMatrix,
          false,
          projectionMatrix,
        );
        gl.uniformMatrix4fv(
          programInfo.uniformLocations.modelViewMatrix,
          false,
          modelViewMatrix,
        );
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.normalMatrix,
            false,
            normalMatrix,
        );

      texArr = addToSpherePos(lastIndex, k, texArr, modelViewMatrix);
        
        // draw cube
        {
            const vertexCount = sphereBuffers.vertices;
            const type = gl.UNSIGNED_SHORT;
            const offset = 0;
            gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
        }      
        mat4.translate(modelViewMatrix, modelViewMatrix, [-spherePos[k][0], -spherePos[k][1], -spherePos[k][2]]);
    }
    

    
    const triangleDat = initSceneTexBuffer(gl, texArr, textureSize, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,triangleDat.triangleTexture);
    gl.useProgram(shaderProgram);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uTextureSize'), triangleDat.textureSize);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uSphereCount'), spherePos.length);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uTriangleCount'), triangleCount * cubePos.length);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uCubeCount'), cubePos.length);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uTriangleTexture'), 0);




    //draw plane
    mat4.translate(modelViewMatrix, modelViewMatrix, [0, -2, 0]);
    setPositionAttribute(gl, planeBuffers, programInfo);
    setColorAttribute(gl, planeBuffers, programInfo);
    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planeBuffers.indices);   
    setNormalAttribute(gl, planeBuffers, programInfo);
    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix,
    );
    {
      const vertexCount = 6;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }   
  
  }
  
  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  function setPositionAttribute(gl, buffers, programInfo) {
    const numComponents = 3; // pull out 2 values per iteration
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }
  // Tell WebGL how to pull out the colors from the color buffer
// into the vertexColor attribute.
function setColorAttribute(gl, buffers, programInfo) {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
    programInfo.attribLocations.vertexColor,
    numComponents,
    type,
    normalize,
    stride,
    offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
}
// Tell WebGL how to pull out the normals from
// the normal buffer into the vertexNormal attribute.
function setNormalAttribute(gl, buffers, programInfo) {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexNormal,
      numComponents,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
}
function addToTriangles(k, triangleCount, triangles, texArr, mVMat){
  for (let i=0;i<triangleCount;i++){
    for (let j=0; j<3; j++){
      const vertex = vec3.fromValues(
        triangles[i * 9 + j * 3 + 0],
        triangles[i * 9 + j * 3 + 1],
        triangles[i * 9 + j * 3 + 2]
      );

      vec3.transformMat4(vertex, vertex, mVMat);
      texArr[(i * 3 + j) * 4 + 108 * k + 0] = vertex[0];
      texArr[(i * 3 + j) * 4 + 108 * k + 1] = vertex[1];
      texArr[(i * 3 + j) * 4 + 108 * k + 2] = vertex[2];
      texArr[(i * 3 + j) * 4 + 108 * k + 3] = 1.0;
    }
  }
  return texArr;
}
function addToSpherePos(lastIndex, k, texArr, mVMat){
  const vertex = vec3.create();
  vec3.transformMat4(vertex, vertex, mVMat);
  texArr[lastIndex + k * 4 + 0] = vertex[0];
  texArr[lastIndex + k * 4 + 1] = vertex[1];
  texArr[lastIndex + k * 4 + 2] = vertex[2];
  texArr[lastIndex + k * 4 + 3] = 1.0;
  return texArr;
}
function initSceneTexBuffer(gl, texArr, textureSize){
    const triangleTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, triangleTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, textureSize, textureSize, 0, gl.RGBA, gl.FLOAT, texArr);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return {
        textureSize: textureSize,
        triangleTexture : triangleTexture,
    };
}



  
export { drawScene };
  