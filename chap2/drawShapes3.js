//複数の2次元形状のアニメーション
var canvas; //キャンバス要素
var gl;     //WebGL描画用コンテキスト

var shape = [];//Shape()クラスのインスタンス
var selectNo = 0;//選択されたインスタンス番号
var hpw;//キャンバスのサイズ比
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 10.0;//1秒間の回転角度
var flagStart = false;

function webMain() 
{
  //canvas要素を取得する
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
    alert("GLSLの初期化に失敗");
    return;
  }
  
  //canvasをクリアする色を設定する
  gl.clearColor(1, 1, 1, 1);

  //Shapeインスタンスの作成
  for(var i = 0; i < 3; i++) shape[i] = new Shape();
  
  display();
 
  var animeStart = function()
  {
    //繰り返し呼び出す関数を登録
    requestAnimationFrame(animeStart); //webgl-utilsで定義
    //時間計測
    var currentTime = new Date().getTime();
    var frameTime = (currentTime - lastTime) / 1000.0;//時間刻み[sec]
    elapseTime += frameTime;
    fps ++;
    if(elapseTime >= 0.5)
    {
      form1.fps.value = 2.0 * fps.toString(); //0.5秒間隔で表示
      fps = 0;
      elapseTime = 0.0;
    }
    lastTime = currentTime;　
    if(flagStart)
    {
      display();//図形の表示
      form2.rotate.value = shape[selectNo].angle;//現在の回転角度を表示
      shape[selectNo].angle += angleStep * frameTime;//回転角を更新
    }      
  }
  animeStart();
}
//--------------------------------------------------------
function display()
{
  //canvasをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT);
      
  gl.viewport(0, 0, canvas.width, canvas.height);
  hpw = canvas.height / canvas.width;//縦横の比率を一定にするための係数

  //shape[]インスタンスの初期設定
  shape[0].kind = "TRIANGLE";
  shape[0].color = new Float32Array([1.0, 0.0, 0.0, 1.0]);//"RED";

  shape[1].kind = "RECTANGLE";
  shape[1].color = new Float32Array([0.0, 0.0, 1.0, 1.0]);//"BLUE";

  shape[2].kind = "CIRCLE";
  shape[2].color = new Float32Array([0.0, 0.5, 0.0, 1.0]);//"DARK_GREEN";

  for(var i = 0; i < shape.length; i++) shape[i].draw();
}
//--------------------------------------------------------------
//Shapeクラス
function Shape()
{
  this.kind = "TRIANGLE";
  this.color = new Float32Array([0.0, 0.0, 0.0, 1.0]);
  this.flagFill = false;
  this.verteces = [];
  this.angle = 0.0;
  this.transX = 0.0;
  this.transY = 0.0;
  this.scaleX = 1.0;
  this.scaleY = 1.0;
}

Shape.prototype.draw = function()
{
  if(this.kind == "TRIANGLE") this.vertices = makeTriangle();
  else if(this.kind == "RECTANGLE") this.vertices = makeRectangle(this.flagFill);
  else if(this.kind == "CIRCLE") this.vertices = makeCircle(this.flagFill);
    
  var hpwLoc = gl.getUniformLocation(gl.program, 'u_hpw');
  gl.uniform1f(hpwLoc, hpw);

  var angLoc = gl.getUniformLocation(gl.program, 'u_angle');
  gl.uniform1f(angLoc, this.angle);
  var transXLoc = gl.getUniformLocation(gl.program, 'u_tx');
  gl.uniform1f(transXLoc, this.transX);
  var transYLoc = gl.getUniformLocation(gl.program, 'u_ty');
  gl.uniform1f(transYLoc, this.transY);
  var scaleXLoc = gl.getUniformLocation(gl.program, 'u_sx');
  gl.uniform1f(scaleXLoc, this.scaleX);
  var scaleYLoc = gl.getUniformLocation(gl.program, 'u_sy');
  gl.uniform1f(scaleYLoc, this.scaleY);
  
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
  //vertex変数にバッファオブジェクトを割り当てる
  gl.vertexAttribPointer(vertexLoc, 2, gl.FLOAT, false, 0, 0);

  // a_vertex変数でのバッファオブジェクトの割り当てを有効にする
  gl.enableVertexAttribArray(vertexLoc);

  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
  //図形の描画
  if(this.flagFill == "true")
  {
    if(this.kind == "CIRCLE")
    {//円
      gl.drawArrays(gl.TRIANGLE_FAN, 0, this.vertices.length/2);
    }
    else
    {//三角形と四角形
      gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length/2);
    }
  }   
  else
  {//塗りつぶしなし
    gl.drawArrays(gl.LINE_LOOP, 0, this.vertices.length/2);
  }
}
//-------------------------------------------------
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
  if(flagFill == "true")//塗りつぶし
  {
    var vertices = [
      0.5, 0.5,  -0.5, 0.5,  -0.5, -0.5,  
      0.5, 0.5,  -0.5,-0.5,   0.5, -0.5
    ];
  }
  else//線画
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
  if(flagFill == "true")
  {
    vertices[0] = 0.0;  vertices[1] = 0.0; //中心点
    for(var i = 0; i <= nSlice; i++)
    {
     theta = i * theta0;
      x = 0.5 * Math.cos(theta);
      y = 0.5 * Math.sin(theta);
      vertices[2 + i * 2] = x;
      vertices[3 + i * 2] = y;
    }
  }
  else
  {
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

function onChangeObjNo()
{
  selectNo = form2.objectNo.value;
  //htmlのformを選択されたオブジェクト番号の現在の値，状態に変更する
  var radio1 =  document.getElementsByName("radio1");
  if(shape[selectNo].flagFill == "true") 
  { 
    radio1[0].checked = true; 
    radio1[1].checked = false;
  }
  else 
  {
    radio1[0].checked = false; 
    radio1[1].checked = true;
  }
  form2.translateX.value = shape[selectNo].transX;
  form2.translateY.value = shape[selectNo].transY;
  form2.scaleX.value = shape[selectNo].scaleX;
  form2.scaleY.value = shape[selectNo].scaleY;
  form2.rotate.value = shape[selectNo].angle;
  display();
}

function onChangeFill()
{
  var radio1 =  document.getElementsByName("radio1");
  for(var i = 0; i < radio1.length; i++)
  {
     if(radio1[i].checked) 
       shape[selectNo].flagFill = radio1[i].value;
  }
  display();
}

function onChangeRotate()
{
  shape[selectNo].angle = parseFloat(form2.rotate.value);
  display();
}   

function onChangeTranslate()
{
  shape[selectNo].transX = parseFloat(form2.translateX.value);
  shape[selectNo].transY = parseFloat(form2.translateY.value);
  display();
}   

function onChangeScale()
{
  shape[selectNo].scaleX = parseFloat(form2.scaleX.value);
  shape[selectNo].scaleY = parseFloat(form2.scaleY.value);
  display();
}   

function onChangeAngleStep()
{
  angleStep = parseFloat(form2.angleStep.value);
}

function onClickStart()
{
  flagStart = true;
}
function onClickStop()
{
  flagStart = false;
}
