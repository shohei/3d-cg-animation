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
  
  // 三角形の頂点データを取得
  var vertices = new Float32Array(makeTriangle());//型付き配列に変換
  
  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  
  var ESIZE = vertices.BYTES_PER_ELEMENT;//配列の要素当たりのバイト数
  //attribute変数a_vertexの格納場所を取得する
  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  //vertex変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, ESIZE * 5, 0);
  //バッファオブジェクトの割り当てを有効にする
  gl.enableVertexAttribArray(vertexLoc);

  //attribute変数a_colorの格納場所を取得する
  var colorLoc = gl.getAttribLocation(gl.program, 'a_color');
  //vertex変数a_colorにバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, ESIZE * 5, ESIZE * 2);
  //バッファオブジェクトの割り当てを有効にする
  gl.enableVertexAttribArray(colorLoc);
  
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  var flagFill = true;
  
  //三角形要素の描画
  if(flagFill)
  {
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length/5);
  }
  else
  {
    gl.drawArrays(gl.LINE_LOOP, 0, vertices.length/5);
  }
}

function makeTriangle() 
{
  var vertices = [//正三角形
       //座標　　　　     　色
    -0.5, -0.288675,   1.0, 0.0, 0.0,
     0.5, -0.288675,   0.0, 1.0, 0.0,
     0.0, 0.57735,     0.0, 0.0, 1.0 
  ];
  return vertices;
}
