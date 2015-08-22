function webMain() 
{
  // Canvas要素を取得する
  canvas = document.getElementById('WebGL');

  // WebGL描画用のコンテキストを取得する
  gl = WebGLUtils.setupWebGL(canvas);

  if (!gl) 
  {
    alert('WebGLコンテキストの取得に失敗');
    return;
  }

  var VS_SOURCE = document.getElementById("vs").textContent;
  var FS_SOURCE = document.getElementById("fs").textContent;

  if(!initGlsl(gl, VS_SOURCE, FS_SOURCE))
  {
    alert("GLSL初期化に失敗");
    return;
  }
 
  //Canvasをクリアする色を設定する
  gl.clearColor(1.0, 1.0, 0.0, 1.0);

  //Canvasをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  //三角形の色
  var col = new Float32Array([1.0, 0.0, 0.0, 1.0]);
  var colLoc = gl.getUniformLocation(gl.program, 'u_color');
  gl.uniform4f(colLoc, col[0], col[1],  col[2],  col[3]);

  // 三角形の頂点データを取得
  var vertices = makeTriangle();
  
  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  //attribute変数の格納場所を取得する
  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  //vertex変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);
  //バッファオブジェクトの割り当てを有効にする
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  var flagFill = true;
  
  //三角形要素の描画
  if(flagFill)
  {
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length/2);
  }
  else
  {
    gl.drawArrays(gl.LINE_LOOP, 0, vertices.length/2);
  }
}

function makeTriangle() 
{
  var vertices = [
    -0.5, -0.288675,   0.5, -0.288675,   0.0, 0.57735 //正三角形
  ];
  return vertices;
}
