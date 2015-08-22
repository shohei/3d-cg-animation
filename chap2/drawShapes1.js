//複数の2次元形状作成
var canvas; //キャンバス要素
var gl;     //WebGL描画用コンテキスト

var shape = [];//Shapeクラスのインスタンス

function webMain()
{
  //canvas要素を取得する
  canvas = document.getElementById('WebGL');
  //WebGL描画用のコンテキストを取得する
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
    alert("GLSLの初期化に失敗");
    return;
  }
  
  //canvasをクリアする色を設定する
  gl.clearColor(1, 1, 1, 1);

  //Shapeインスタンスを作成
  for(var i = 0; i < 3; i++) shape[i] = new Shape();
  display();
}

//------------------------------------------------------
function display()
{
  //canvasをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT);
  //ビューポート変換
  gl.viewport(0, 0, canvas.width, canvas.height);

  //shape[]インスタンスの初期設定
  shape[0].kind = "TRIANGLE";
  shape[0].color = new Float32Array([1.0, 0.0, 0.0, 1.0]);//"RED";
  shape[0].flagFill = true;

  shape[1].kind = "RECTANGLE";
  shape[1].color = new Float32Array([0.0, 0.0, 1.0, 1.0]);//"BLUE";
  shape[1].flagFill = false;

  shape[2].kind = "CIRCLE";
  shape[2].color = new Float32Array([0.0, 0.5, 0.0, 1.0]);//"DARK_GREEN";
  shape[2].flagFill = false;
  for(var i = 0; i < shape.length; i++) shape[i].draw();
}

//--------------------------------------------------------------
//Shapeクラス
function Shape()
{
  this.kind = "TRIANGLE";
  this.color = new Float32Array([0.0, 0.0, 0.0, 1.0]);
  this.flagFill = false;//塗りつぶしフラグ
  this.verteces = [];//頂点座標
}
Shape.prototype.draw = function()
{
  if(this.kind == "TRIANGLE") this.vertices = makeTriangle();
  else if(this.kind == "RECTANGLE") this.vertices = makeRectangle(this.flagFill);
  else if(this.kind == "CIRCLE") this.vertices = makeCircle(this.flagFill);
  
  //色データをuniform変数でシェーダへ渡す
  var colLoc = gl.getUniformLocation(gl.program, 'u_color');
  gl.uniform4fv(colLoc, this.color);

  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  // バッファオブジェクトをバインドする
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // バッファオブジェクトにデータを書き込む
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
  //attribute変数の格納場所を取得する
  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  //a_vertex変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);
  // a_vertex変数でのバッファオブジェクトの割り当てを有効にする
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  //図形の描画
  if(this.flagFill)
  {//塗りつぶしあり
    if(this.kind == "CIRCLE")
    {//円
      gl.drawArray(gl.TRIANGLE_FAN, 0, this.vertices.length/2);
    }
    else
    {//三角形と四角形
      gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length/2);
    }
  }   
  else
  {//塗りつぶしなし
    gl.drawArrays(gl.LINE_LOOP, 0, this.vertices.length/2);gl.getErrors();
  }
}
//---------------------------------------------------
//頂点座標作成
function makeTriangle() 
{
  var vertices = [//正三角形
    -0.5, -0.288675,  
     0.5, -0.288675,   
     0.0, 0.57735 
  ];
  return vertices;
}

function makeRectangle(flagFill) 
{
  if(flagFill)//塗りつぶしあり
  {
    var vertices = [
      0.5, 0.5,  -0.5, 0.5,  -0.5, -0.5,  
      0.5, 0.5,  -0.5,-0.5,   0.5, -0.5
    ];
  }
  else//線画（塗りつぶしなし）
  {
    var vertices =  [
      0.5, 0.5,  -0.5, 0.5,  -0.5, -0.5,  0.5, -0.5
    ];
  }
  return vertices;
}

function makeCircle(flagFill)
{
  var nSlice = 30;
  var theta0 = 2.0 * Math.PI / nSlice;
  var theta, x, y;
  var vertices = [];
  if(flagFill)
  {//塗りつぶしあり
    vertices[0] = 0.0;  vertices[1] = 0.0; //中心点
    for(var i = 0; i < nSlice; i++)
    {
     theta = i * theta0;
      x = 0.5 * Math.cos(theta);
      y = 0.5 * Math.sin(theta);
      vertices[2 + i * 2] = x;
      vertices[3 + i * 2] = y;
    }
  }
  else
  {//塗りつぶしなし
    for(var i = 0; i < nSlice; i++)
    {
      theta = i * theta0;
      x = 0.5 * Math.cos(theta);
      y = 0.5 * Math.sin(theta);
      vertices[0 + i * 2] = x;
      vertices[1 + i * 2] = y;
    }
  }
  return vertices;
}
//---------------------------------------------------
//イベント処理
function onClickC_Size()
{
  canvas.width = form1.c_sizeX.value;
  canvas.height = form1.c_sizeY.value;
  display();
}
