function initBuffers(gl, object) {
    const positionBuffer = initPositionBuffer(gl, object, []);

    const indexBuffer = initIndexBuffer(gl, object, []);

    if(object == 2){
        const subdividedM = subdivideIcosphere(gl, positionBuffer.positions, indexBuffer.indices, 3);
        const normalBuffer = initNormalBuffer(gl, 2, subdividedM.positions, subdividedM.indices);
        const colorBuffer = initColorBuffer(gl,3, subdividedM.indices.length);
        return{
            position: subdividedM.positionBuffer,
            normal: normalBuffer,
            color: colorBuffer,
            indices: subdividedM.indexBuffer,
            vertices: subdividedM.indices.length,
        };
    }
    const normalBuffer = initNormalBuffer(gl, object, positionBuffer.positions, indexBuffer.indices);
    const colorBuffer = initColorBuffer(gl,object, 0);
    return {
        position: positionBuffer.positionBuffer,
        normal: normalBuffer,
        color: colorBuffer,
        indices: indexBuffer.indexBuffer,
        vertices: indexBuffer.indices.length,
    };
  }
  
function initPositionBuffer(gl, object, index) {
    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();

    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    let positions = [];
    // Array of positions for the cube.
    if(object == 0){
    positions = [
        // Front face
        -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
      
        // Back face
        -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0,
      
        // Top face
        -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0,
      
        // Bottom face
        -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
      
        // Right face
        1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0,
      
        // Left face
        -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0,
    ];      }
    else if(object == 1){  
        positions = [
            // Top face
            -10.0, 1.0, -10.0, -10.0, 1.0, 10.0, 10.0, 1.0, 10.0, 10.0, 1.0, -10.0,
        ];
    }
    else if(object ==2){
       positions = [
        // 12 vertices (36 values)
        0, 0, 1, 
        0.8944, 0, 0.4472, 
        0.2764, 0.8506, 0.4472,
        -0.7236, 0.5257, 0.4472, 
        -0.7236, -0.5257, 0.4472, 
        0.2764, -0.8506, 0.4472, 
        0.7236, 0.5257, -0.4472, 
        -0.2764, 0.8506, -0.4472, 
        -0.8944, 0, -0.4472, 
        -0.2764, -0.8506, -0.4472, 
        0.7236, -0.5257, -0.4472, 
        0, 0, -1,
        ];
    }
    else if(object == 3){
        positions = index;
    }
    // Buffer positions
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    return {positionBuffer, positions};
}
function initColorBuffer(gl, object, verts) {
    let faceColors = [];
    if(object == 0){
     for(let i=0;i<6;i++){
        faceColors[i]=[0.05, 0.05, 0.65, 1.0];
     }
    }
    else if(object == 1){
         faceColors = [[0.35, 0.45, 0.5, 1.0],]; // white
    }
    else if(object == 2){
        for(let i=0;i<20;i++){
            faceColors[i]=[0.7, 0.05, 0.05, 1.0];
        }
    }
    else if(object == 3){
        for(let i=0;i<verts;i++){
            faceColors[i]=[0.7, 0.05, 0.05, 1.0];
        }
    }
    
    
    // Convert the array of colors into a table for all the vertices.
      
    var colors = [];
    
    for (var j = 0; j < faceColors.length; ++j) {
        const c = faceColors[j];
        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }
      

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return colorBuffer;
}
function initIndexBuffer(gl, object, index) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.
    let indices = [];
if(object == 0){
    indices = [
        0,
        1,
        2,
        0,
        2,
        3, // front
        4,
        5,
        6,
        4,
        6,
        7, // back
        8,
        9,
        10,
        8,
        10,
        11, // top
        12,
        13,
        14,
        12,
        14,
        15, // bottom
        16,
        17,
        18,
        16,
        18,
        19, // right
        20,
        21,
        22,
        20,
        22,
        23, // left
    ];
}
else if(object == 1){
    indices = [
        0,
        1,
        2,
        0,
        2,
        3, //top
    ];
}
else if(object == 2){
    indices = [
        // 20 triangles (60 values)
        0, 1, 2,
        0, 2, 3,
        0, 3, 4,
        0, 4, 5,
        0, 5, 1,
        1, 6, 2,
        2, 7, 3,
        3, 8, 4,
        4, 9, 5,
        5, 10, 1,
        1, 10, 6,
        2, 6, 7,
        3, 7, 8,
        4, 8, 9,
        5, 9, 10,
        6, 11, 7,
        7, 11, 8,
        8, 11, 9,
        9, 11, 10,
        10, 11, 6,
    ];
}
else if(object == 3){
    indices = index;
}
    // Now send the element array to GL

    gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(indices),
        gl.STATIC_DRAW,
    );

    return {indexBuffer, indices};
}
function initNormalBuffer(gl, object, verts, indices) {
    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    let vertexNormals = [];
    if(object == 0){
    vertexNormals = [
        // Front
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,

        // Back
        0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,

        // Top
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,

        // Bottom
        0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,

        // Right
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,

        // Left
        -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
    ];}
    else if(object == 1){
        vertexNormals = [ // Top
            0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
        ];
    }
    else if(object == 2){
        const normalCount = new Uint32Array(verts.length/3);
        const normals = new Float32Array(verts.length);
        for(let i=0; i<indices.length; i+=3){
            const v0 = [verts[indices[i]*3], verts[indices[i] * 3 + 1], verts[indices[i] * 3 + 2]];
            const v1 = [verts[indices[i+1]*3], verts[indices[i+1] * 3 + 1], verts[indices[i+1] * 3 + 2]];
            const v2 = [verts[indices[i+2]*3], verts[indices[i+2] * 3 + 1], verts[indices[i+2] * 3 + 2]];
            const edge1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
            const edge2 = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];
            const normal = [
                edge1[1] * edge2[2] - edge1[2] * edge2[1],
                edge1[2] * edge2[0] - edge1[0] * edge2[2],
                edge1[0] * edge2[1] - edge1[1] * edge2[0],
            ]
            const length = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
            normal[0] /= length; normal[1] /= length; normal[2] /= length;
            normals[indices[i] * 3 + 0] = normal[0];
            normals[indices[i] * 3 + 1] = normal[1];
            normals[indices[i] * 3 + 2] = normal[2];
            normalCount[indices[i]]++;

            normals[indices[i+1] * 3 + 0] = normal[0];
            normals[indices[i+1] * 3 + 1] = normal[1];
            normals[indices[i+1] * 3 + 2] = normal[2];
            normalCount[indices[i + 1]]++;

            normals[indices[i+2] * 3 + 0] = normal[0];
            normals[indices[i+2] * 3 + 1] = normal[1];
            normals[indices[i+2] * 3 + 2] = normal[2];
            normalCount[indices[i + 2]]++;
        }
        
        for(let i=0; i<verts.length / 3; i++){
            normals[i * 3] /= normalCount[i];
            normals[i * 3 + 1] /= normalCount[i];
            normals[i * 3 + 2] /= normalCount[i];
            const nx = normals[i * 3];
            const ny = normals[i * 3 + 1];
            const nz = normals[i * 3 + 2];
            const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
            normals[i * 3] /= length;
            normals[i * 3 + 1] /= length;
            normals[i * 3 + 2] /= length;
        }
        gl.bufferData(
            gl.ARRAY_BUFFER,
            normals,
            gl.STATIC_DRAW,
        );
    }
    if(object != 2){
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertexNormals),
        gl.STATIC_DRAW,
    );}

    return normalBuffer;
}
function subdivideIcosphere(gl, verts, indices, iterations){
    const positions = new Float32Array(verts);
    const getMidpoint = (v1, v2) => {
        return [
            (v1[0] + v2[0]) / 2,
            (v1[1] + v2[1]) / 2,
            (v1[2] + v2[2]) / 2
        ];
    };
    const normalize = (v) => {
        const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        return [v[0] / length, v[1] / length, v[2] / length]; 
    };
    let vertices = [...positions];
    let indexMap = new Map();
    const getVertexIndex = (v) => {
        const key = v.toString();
        if(!indexMap.has(key)){
            indexMap.set(key, vertices.length / 3);
            vertices.push(...v);
        }
        return indexMap.get(key);
    };
    for(let iteration = 0; iteration < iterations; iteration++){
        let newIndices = [];
        for(let i=0; i<indices.length; i+=3){
            const v0 = [vertices[indices[i] * 3 + 0], vertices[indices[i] * 3 + 1], vertices[indices[i] * 3 + 2]];
            const v1 = [vertices[indices[i + 1] * 3 + 0], vertices[indices[i + 1] * 3 + 1], vertices[indices[i + 1] * 3 + 2]];
            const v2 = [vertices[indices[i + 2] * 3 + 0], vertices[indices[i + 2] * 3 + 1], vertices[indices[i + 2] * 3 + 2]];
            const m0 = normalize(getMidpoint(v0, v1));
            const m1 = normalize(getMidpoint(v1, v2));
            const m2 = normalize(getMidpoint(v2, v0));
            const i0 = getVertexIndex(v0);
            const i1 = getVertexIndex(v1);
            const i2 = getVertexIndex(v2);
            const im0 = getVertexIndex(m0);
            const im1 = getVertexIndex(m1);
            const im2 = getVertexIndex(m2);

            newIndices.push(i0, im0, im2);
            newIndices.push(im0, i1, im1);
            newIndices.push(im1, i2, im2);
            newIndices.push(im0, im1, im2);
        }
        indices = newIndices;
    }
    const positionBuffer = initPositionBuffer(gl, 3, vertices);
    const indexBuffer = initIndexBuffer(gl, 3, indices);

    return {
        positionBuffer: positionBuffer.positionBuffer, 
        indexBuffer: indexBuffer.indexBuffer, 
        positions: vertices, 
        indices: indices
    };
}
  
  

export { initBuffers };
