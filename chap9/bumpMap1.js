
var canvas, gl,  camera, light;
var rigid = new Rigid();//Rigidクラス（rigid.js)
var m_rigid = new Rigid();//マウス操作用
var dummy = new Rigid();
var floor0 = new Rigid();
var objectNo = 0;
var plane = [0.0, 0.0, 1.0, 1.0];//床平面(z = -1)
var shadow_value = 0.2;
//テクスチャ
var repeatS = 1;
var repeatT = 1;
var inverse = 1;
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 45.0;//1秒間の回転角度
var flagStart = false;

function webMain() {
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

  m_rigid = rigid;

  init();
  initBumpMap();
  
  var animeStart = function()
  {
    var n, i;
  
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
      drawScene();
           
      rigid.vEuler.x += angleStep * frameTime;//回転角を更新
    }      
  }
  animeStart();
}

function init()
{
  light = new Light();
  light.pos[0] = 5.0;
  light.pos[1] = 8.0;
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];

  camera = new Camera();
  camera.dist = 5.0; 
  camera.getPos();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  
  //オブジェクトの初期設定
  rigid.flagTexture = true;
  rigid.diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid.ambient = [0.0, 0.4, 0.4, 1.0];
  rigid.specular = [0.99, 0.99, 0.99, 1.0];
  rigid.shininess = 100.0; 
  rigid.nSlice = 25;
  rigid.nStack = 25;
  rigid.vEuler = new Vector3(); 

  dummy.kind = "SPHERE";
  dummy.flagTexture = true;
  dummy.nSlice = 30;
  dummy.nStack = 30;
 
  //フロアの初期設定
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(20, 20, 20);
  floor0.nSlice = 20;//x方向分割数
  floor0.nStack = 20;//y方向分割数
  floor0.col1 = [0.6, 0.5, 0.5, 1.0];
  floor0.col2 = [0.4, 0.4, 0.6, 1.0];
  floor0.specular = [0.5, 0.5, 0.5, 1.0];
  floor0.shininess = 50;
  floor0.flagCheck = true;

  //オブジェクトのpropertyをフォームに表示
  form2.nSlice.value = rigid.nSlice;
  form2.nStack.value = rigid.nStack;
  form2.radiusRatio.value = rigid.radiusRatio;
  form2.eps1.value = rigid.eps1;
  form2.eps2.value = rigid.eps2;
  form2.shadow.value = shadow_value;

  mouseOperation(canvas, camera);
}

//------------------------------------------------------------------------
function initBumpMap() 
{
  var texBump = gl.createTexture();// テクスチャオブジェクトを作成する
  var image = new Image();

  image.src = '../imageJPEG/disk.jpg';
  // 画像の読み込み完了時のイベントハンドラを設定する
  image.onload = function(){ setTexture(); }

  function setTexture() 
  {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);// 画像のY軸を反転する
    // テクスチャユニット0を有効にする
    gl.activeTexture(gl.TEXTURE0);
    // テクスチャオブジェクトをターゲットにバインドする
    gl.bindTexture(gl.TEXTURE_2D, texBump);
    // テクスチャ画像を設定する
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    // テクスチャパラメータを設定する
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
    var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
    gl.uniform1i(samplerLoc, 0);

    display();
  }
}

//---------------------------------------------
function display()
{  
  //光源の位置と色をシェーダへ
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  // 光源の位置（ワールド座標系）と色をシェーダへ
  gl.uniform4fv(lightPosLoc, light.pos);//.elements);
  gl.uniform4fv(lightColLoc, light.color);
  
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);
  
  //ビュープロジェクション行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera.fovy, canvas.width/canvas.height, camera.near, camera.far);
  if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

  var flagTorus = false;
  if(objectNo == 4) flagTorus = true;
  var torusLoc = gl.getUniformLocation(gl.program, 'u_flagTorus');
  gl.uniform1i(torusLoc, flagTorus);

  var inverseLoc = gl.getUniformLocation(gl.program, 'u_inverse');
  gl.uniform1f(inverseLoc, inverse);
 
  if(objectNo == 0) rigid.kind = "CUBE_BUMP";
  else if(objectNo == 1) rigid.kind = "SPHERE";
  else if(objectNo == 2) rigid.kind = "CYLINDER";
  else if(objectNo == 3) rigid.kind = "PRISM";
  else if(objectNo == 4) rigid.kind = "TORUS";
  else if(objectNo == 5) rigid.kind = "SUPER";
  
  rigid.nRepeatS = repeatS;
  rigid.nRepeatT = repeatT;
  
  drawScene();
}
  
function drawScene()
{
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  var n = rigid.initVertexBuffers(gl);
  rigid.draw(gl, n);
  
  n = dummy.initVertexBuffers(gl);//ダミー
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  //影 
  drawShadow();    
}

function drawShadow()
{
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
 
  rigid.shadow = shadow_value;
  n = rigid.initVertexBuffers(gl);
  rigid.draw(gl, n);
  rigid.shadow = 0;//描画後は元に戻す
  
  gl.disable(gl.BLEND);
  gl.depthMask(true);
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
  objectNo = form2.objectNo.value;
  if(objectNo == 0) form2.objectName.value = "立方体";
  else if(objectNo == 1) form2.objectName.value = "球";
  else if(objectNo == 2) form2.objectName.value = "円柱";
  else if(objectNo == 3) form2.objectName.value = "多角柱";
  else if(objectNo == 4) form2.objectName.value = "トーラス";
  else if(objectNo == 5) form2.objectName.value = "超2次曲面";
   
  display();
}

function onChangeModel()
{
  if(form2.wireframe.checked) rigid.flagSolid = false;
  else                        rigid.flagSolid = true;
  display();  
}
function onChangeMouse()
{
  if(form2.object.checked) m_flagObject = true;
  else                     m_flagObject = false;
  mouseOperation(canvas, camera);//kwgSupport.js
}

function onChangeInverse()
{
  if(form2.inverse.checked) inverse = -1;
  else                      inverse = 1;
  display();
}

function onClickSlice()
{ 
  rigid.nSlice = parseInt(form2.nSlice.value);
  display();
}
function onClickStack()
{ 
  rigid.nStack = parseInt(form2.nStack.value);
  display();
}
function onClickRadiusRatio()
{ 
  rigid.radiusRatio = parseFloat(form2.radiusRatio.value);
  display();
}
function onClickEps()
{ 
  rigid.eps2 = parseFloat(form2.eps2.value);
  rigid.eps1 = parseFloat(form2.eps1.value);
  display();
}

function onClickRepeat()
{
  repeatS = parseFloat(form2.repeatS.value);
  repeatT = parseFloat(form2.repeatT.value);
  display();
}

function onClickLight()
{
  light.pos[0] = parseFloat(form2.lightX.value);
  light.pos[1] = parseFloat(form2.lightY.value);
  light.pos[2] = parseFloat(form2.lightZ.value);
  display();
}

function onClickShadow()
{
  shadow_value = parseFloat(form2.shadow.value);
  display();
}

function onClickStart()
{
  flagStart = true;
  display();
}
function onClickStop()
{
  flagStart = false;
  display();
}
function onClickReset()
{
  init();
  display();
}
