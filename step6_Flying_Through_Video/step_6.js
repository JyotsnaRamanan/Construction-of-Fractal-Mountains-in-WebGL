

var startX;
var startY;
var g_mouseDrag = false;
var depth = -0.01;

var canvas;
var gl;

//for shading
var pointsArray = [];
var normalsArray = [];

var NumVertices = 0; /*initial number of vertices*/

var camera = vec3(1.0, 1.0, -3.0); 
var near = 0.1;
var far = 40.0;
var radius = 1.3;
var aspect = 1.0;
var fovy = 45.0;
var at = vec3(0.0, 0.0, 0.0);
var lightPosition = vec4(5.0, 10.0, 0.0, 0.0);

var quaternion = vec4(1.0, 0.0, 0.0, 0.0);
var modelViewMatrix , projectionMatrix;
var lightPositionLoc, modelViewMatrixLoc, projectionMatrixLoc;

var vertices = [                    
    vec4(-1.0, 0.0, -1.0, 1.0),
    vec4(-1.0, 0.0, 1.0, 1.0),
    vec4(1.0, 0.0, 1.0, 1.0),
    vec4(1.0, 0.0, -1.0, 1.0)
]; //vertices of the mountains 

function quad(a, b, c, d) {
    //calculating the normal
    var normal = cross(a, b);
    normal = vec4(normal);
    if(length(normal) > 1) {
        normal = normalize(normal);
    }

    // points and normals array for shading
    pointsArray.push(a);
    normalsArray.push(normal);
    pointsArray.push(b);
    normalsArray.push(normal);
    pointsArray.push(c);
    normalsArray.push(normal);
    pointsArray.push(c);
    normalsArray.push(normal);
    pointsArray.push(d);
    normalsArray.push(normal);
    pointsArray.push(a);
    normalsArray.push(normal);
}

function rnd(mean, stdev) {
    return (rnd_snd()*stdev+mean);
}

function rnd_snd() {
    return (Math.random()*2-1)+(Math.random()*2-1)+(Math.random()*2-1);
}



function fractal(v1, v2, v3, v4, n, d, h) {
    if(n == 0) {
        quad(v1, v2, v3, v4);
        return;
    }

    d = Math.pow(1/2.0, h/2.0) * d;
    var r = rnd(0, d);

    var mountain_leftHeight = (v1[1] + v2[1]) / 2.0;

    if(mountain_leftHeight <= depth) {
        mountain_leftHeight = depth;
    }

    var mountain_topHeight = (v1[1] + v4[1]) / 2.0;

    if(mountain_topHeight <= depth) {
        mountain_topHeight = depth;
    }

    var mountain_rightHeight = (v4[1] + v3[1]) / 2.0;

    if(mountain_rightHeight <= depth) {
        mountain_rightHeight = depth;
    }

    var bottomHeight = (v2[1] + v3[1]) / 2.0;

    if(bottomHeight <= depth) {
        bottomHeight = depth;
    }

    var mountain_left = vec4(v1[0], mountain_leftHeight, (v1[2]+v2[2]) / 2, 1.0);
    var bottom = vec4((v2[0]+v3[0])/2.0, bottomHeight, v2[2], 1.0);
    var mountain_right = vec4(v3[0], mountain_rightHeight, (v3[2]+v4[2])/2.0, 1.0);
    var mountain_top = vec4((v1[0]+v4[0])/2.0, mountain_topHeight, v1[2], 1.0);
    var mountain_center = vec4(bottom[0], (v1[1]+v2[1]+v3[1]+v4[1])/4.0 + r, mountain_left[2], 1.0);
    
    if(mountain_center[1] < depth) {
        mountain_center[1] = depth;
    }

    fractal(v1, mountain_left, mountain_center, mountain_top, n-1, d, h);
    fractal(mountain_left, v2, bottom, mountain_center, n-1, d, h);
    fractal(mountain_center, bottom, v3, mountain_right, n-1, d, h);
    fractal(mountain_top, mountain_center, mountain_right, v4, n-1, d, h);
}


window.onload = function() {
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    
    aspect =  canvas.width/canvas.height;
    
    gl.clearColor( 0.0,0.0,1.0, 0.3 );
    
    gl.enable(gl.DEPTH_TEST);
    
    
    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    fractal(vertices[0], vertices[1], vertices[2], vertices[3], 8, .9, 1.5);

    NumVertices = pointsArray.length;

    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    lightPositionLoc = gl.getUniformLocation(program, "lightPosition");
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );

    
    canvas.onmousedown = function(e) {
        var client_x_r = e.clientX - this.offsetLeft;
        var client_y_r = e.clientY - this.offsetTop;
        var clip_x = -1 + 2 * client_x_r / this.width;
        var clip_y = -1 + 2 * (this.height - client_y_r) / this.height;
        startX = clip_x;
        startY = clip_y;

        g_mouseDrag = true;
    }

    canvas.onmouseup = function(e) {
        g_mouseDrag = false;
    }

    var initial = true;
    canvas.onmousemove = function(e) {
        var client_x_r = e.clientX - this.offsetLeft;
        var client_y_r = e.clientY - this.offsetTop;
        var clip_x = -1 + 2 * client_x_r / this.width;
        var clip_y = -1 + 2 * (this.height - client_y_r) / this.height;
        if(g_mouseDrag) {
            var cur_x = clip_x;
            var cur_y = clip_y;
            var p1 = vec3(startX, startY, Math.sqrt(1 - Math.pow(startX,2.0) - Math.pow(startY,2.0)));
            var p2 = vec3(cur_x, cur_y, Math.sqrt(1 - Math.pow(cur_x,2.0) - Math.pow(cur_y,2.0)));
            
            /*checking for the mouse movement*/
            var dx = p2[0] - p1[0];
            var dy = p2[1] - p1[1];
            var dz = p2[2] - p1[2];

            if(length(p1) > 1) {
                p1 = normalize(p1);
            }

            if(length(p2) > 1) {
                p2 = normalize(p2);
            }

            if(length(p1) == 0) {
                p1 = vec3(p1[0] + 0.00001, p1[1] + 0.00001, p1[2]);
            }

            if(dx > 0 || dy > 0 || dz > 0) {
                var theta = dot(p1, p2) / (length(p1) * length(p2));
                theta = Math.acos(theta);
                var axis = cross(p1, p2);
                var temp_quat = vec4(   Math.cos(theta / 2.0),
                                axis[0] / length(axis) * Math.sin(theta / 2.0),
                                axis[1] / length(axis) * Math.sin(theta / 2.0),
                                axis[2] / length(axis) * Math.sin(theta / 2.0));

                temp_quat = normalize(temp_quat);

                if(initial) {
                    quaternion = temp_quat;
                    quaternion = normalize(quaternion);
                    initial = false;
                } else {
                    quaternion = multiplyQuat(normalize(temp_quat), normalize(quaternion));
                    quaternion = normalize(quaternion);
                }
                startX = cur_x;
                startY = cur_y;
            }

        }
    }
    
    /*using keyboard to zoom in and zoom out*/

    document.addEventListener('keydown', function(e) {
        if(e.keyCode == 38) {
            camera[2] += .1;
        }

        if(e.keyCode == 40) {
            camera[2] -= .1;
        }

        if(e.keyCode == 37) {
            at[0] += .1;
        }

        if(e.keyCode == 39) {
            at[0] -= .1;
        }

        if(e.keyCode == 32) {
            camera[1] += .1;
        }

        if(e.keyCode == 17) {
            camera[1] -= .1;
        }
    });

    render();
}

function multiplyQuat(a, b) {
    return vec4(    b[0]*a[0] - b[1]*a[1] - b[2]*a[2] - b[3]*a[3],
                    b[0]*a[1] + b[1]*a[0] - b[2]*a[3] + b[3]*a[2],
                    b[0]*a[2] + b[1]*a[3] + b[2]*a[0] - b[3]*a[1],
                    b[0]*a[3] - b[1]*a[2] + b[2]*a[1] + b[3]*a[0]);
}

var render = function(){

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    modelViewMatrix = lookAt(camera, at, vec3(0.0, 1.0, 0.0));
    projectionMatrix = perspective(fovy, aspect, near, far);
    var r = mat4(               vec4(1.0 - 2*quaternion[2]*quaternion[2] - 2*quaternion[3]*quaternion[3],   2*quaternion[1]*quaternion[2] + 2*quaternion[0]*quaternion[3],          2*quaternion[1]*quaternion[3] - 2*quaternion[0]*quaternion[2],          0),
                    vec4(2*quaternion[1]*quaternion[2] - 2*quaternion[0]*quaternion[3],         1.0 - 2*quaternion[1]*quaternion[1] - 2*quaternion[3]*quaternion[3],    2*quaternion[2]*quaternion[3] + 2*quaternion[0]*quaternion[1],          0),
                    vec4(2*quaternion[1]*quaternion[3] + 2*quaternion[0]*quaternion[2],         2*quaternion[2]*quaternion[3] - 2*quaternion[0]*quaternion[1],          1.0 - 2*quaternion[1]*quaternion[1] - 2*quaternion[2]*quaternion[2],    0),
                    vec4(0,                                 0,                                  0,                                  1));
    modelViewMatrix = mult(modelViewMatrix, r);
    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
    gl.uniform4fv( lightPositionLoc,flatten(lightPosition) );
            
    gl.drawArrays( gl.TRIANGLES, 0, NumVertices );
    requestAnimFrame(render);
}