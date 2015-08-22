var gl_L, gl_R;
var canvasL, canvasR; //canvas要素
var programL, programR;//シェーダのプログラムオブジェクト
var selectNo = 0;
var rigid = [];
var floor0;
var plane = [0.0, 0.0, 1.0, 2.0];//床平面(z = -2)
var shadow_value = 0.3;
var camera, light;
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 45.0;//1秒間の回転角度
var flagStart = false;
var camera, light;
//立体視
var base = 0.5;// 0.065;//カメラ間隔
var delta ;//= 0.186;//輻輳の半角
var cameraL, cameraR;
var viewMethod = 0;//交差法

function webMain() 
{
  // Canvas要素を取得する
  canvasL = document.getElementById('WebGL_Left');
  canvasR = document.getElementById('WebGL_Right');

  // WebGL描画用のコンテキストを取得する
  gl_L = WebGLUtils.setupWebGL(canvasL);//左側
  gl_R = WebGLUtils.setupWebGL(canvasR);//右側
  //shader programを読み込む
  var VS_SOURCE = document.getElementById("vs").textContent;
  var FS_SOURCE = document.getElementById("fs").textContent;

  initGlsl(gl_L, VS_SOURCE, FS_SOURCE);
  initGlsl(gl_R, VS_SOURCE, FS_SOURCE);

  numObject = 2;//numObjectはkwgSupport.js

  for(var i = 0; i < numObject; i++) rigid[i] = new Rigid();//Rigidクラス（kwgRigid.js)
  m_rigid = new Rigid();//マウス操作用
  m_rigid = rigid[selectNo];
  floor0 = new Rigid();//フロア用
 
  init();
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
      drawScene(gl_L);
      drawScene(gl_R);
      
      rigid[selectNo].vEuler.x += angleStep * frameTime;//回転角を更新
      form2.rotateX.value = rigid[selectNo].vEuler.x;//現在の角度を表示
    }      
  }
  animeStart();
}
function init()
{
  light = new Light();
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
 
  //カメラ
  camera = new Camera();//中央カメラ（計算のみ）
  camera.getPos();
  cameraL = new Camera();//左側カメラ 
  cameraR = new Camera();//右側カメラ 

  // Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl_L.clearColor(0.0, 0.0, 0.0, 1.0);
  gl_L.enable(gl_L.DEPTH_TEST);
  gl_R.clearColor(0.0, 0.0, 0.0, 1.0);
  gl_R.enable(gl_R.DEPTH_TEST);
  
  rigid[0].kind = "CUBE";
  //rigid[0].kind = "SPHERE";
  rigid[0].diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid[0].ambient = [0.0, 0.4, 0.4, 1.0];
  rigid[0].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[0].shininess = 100.0; 
  rigid[0].vPos = new Vector3(0.0, -1.5, 0.0);
  rigid[0].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[0].vSize = new Vector3(1.0, 1.0, 1.0);

  rigid[1].kind = "TORUS";
  //rigid[1].kind = "CUBE";
  rigid[1].diffuse = [0.9, 0.2, 0.2, 1.0];
  rigid[1].ambient = [0.5, 0.1, 0.1, 1.0];
  rigid[1].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[1].shininess = 100.0;  
  rigid[1].vPos.y = 1.5;
  rigid[1].vPos = new Vector3(0.0, 1.5, 0.0);
  rigid[1].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[1].vSize = new Vector3(1.0, 1.0, 1.0);
  rigid[1].nSlice = 20;
  rigid[1].nStack = 20;
  
  //フロア
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(20, 20, 20);
  floor0.specular = [0.2, 0.2, 0.2, 1.0];
  floor0.shininess = 50;
  floor0.flagCheck = true;
  floor0.nSlice = 20;
  floor0.nStack = 20;

  form2.shadow.value = shadow_value;
  mouseOperation(canvasL, camera);//kwgSupport.js
  mouseOperation(canvasR, camera);
}

//---------------------------------------------
function display()
{  
  var delta = Math.atan(base/(2.0*camera.dist)) * RAD_TO_DEG;//輻輳の半角
  camera.getPos();
  //--左側のカメラ-----------------
  cameraL.theta = camera.theta; cameraL.dist = camera.dist; cameraL.cnt = camera.cnt;
  cameraL.phi = camera.phi - delta;
  cameraL.getPos();
  //--右側側のカメラ-----------------
  cameraR.theta = camera.theta; cameraR.dist = camera.dist; cameraR.cnt = camera.cnt;
  cameraR.phi = camera.phi + delta;
  cameraR.getPos();
  
  if(viewMethod == 0)
  {
    //交差法
    uploadToShader(gl_R, canvasR, cameraL);
    uploadToShader(gl_L, canvasL, cameraR);
  }
  else
  {
    //平行法
    uploadToShader(gl_L, canvasL, cameraL);
    uploadToShader(gl_R, canvasR, cameraR);
  }
  drawScene(gl_R);
  drawScene(gl_L);

  //選択オブジェクトの位置・角度・スケールをフォームに表示
  form2.translateX.value = rigid[selectNo].vPos.x;//現在の位置を表示
  form2.translateY.value = rigid[selectNo].vPos.y;
  form2.translateZ.value = rigid[selectNo].vPos.z;
  form2.rotateX.value = rigid[selectNo].vEuler.x;//現在の角度を表示
  form2.rotateY.value = rigid[selectNo].vEuler.y;
  form2.rotateZ.value = rigid[selectNo].vEuler.z;
  form2.scaleX.value = rigid[selectNo].vSize.x;//現在のスケールを表示
  form2.scaleY.value = rigid[selectNo].vSize.y;
  form2.scaleZ.value = rigid[selectNo].vSize.z;

  m_rigid = rigid[selectNo];
}

function uploadToShader(gl, canvas0, camera0)
{
  //光源位置・色をシェーダへアップロード
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightPosLoc, light.pos);
  gl.uniform4fv(lightColLoc, light.color);
  //カメラ位置をシェーダへアップロード 
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera0.pos);
  
  //ビュー投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera0.fovy, canvas0.width/canvas0.height, camera0.near, camera0.far);
  if(Math.cos(Math.PI * camera0.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera0.pos[0], camera0.pos[1], camera0.pos[2], camera0.cnt[0], camera0.cnt[1], camera0.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera0.pos[0], camera0.pos[1], camera0.pos[2], camera0.cnt[0], camera0.cnt[1], camera0.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);
}

function drawScene(gl)
{
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvasL.width, canvasL.height);

  var n = rigid[0].initVertexBuffers(gl);
  rigid[0].draw(gl, n);
  n = rigid[1].initVertexBuffers(gl);
  rigid[1].draw(gl, n);
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  
  drawShadow(gl)
}

function drawShadow(gl)
{
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  for(var i = 0; i < numObject; i++) 
  {
    rigid[i].shadow = shadow_value;
    n = rigid[i].initVertexBuffers(gl);
    rigid[i].draw(gl, n);
    rigid[i].shadow = 0;//描画後は元に戻す
  }
  gl.disable(gl.BLEND);
  gl.depthMask(true);
}

//---------------------------------------------------
//イベント処理
function onClickC_Size()
{
  canvasL.width = form1.c_sizeX.value;
  canvasL.height = form1.c_sizeY.value;
  display();
}

function onChangeNo()
{
  var radio1 =  document.getElementsByName("radio1");
  for(var i = 0; i < radio1.length; i++)
  {
     if(radio1[i].checked) selectNo = i;
  }
  display();
}

function onClickWire()
{
  var i;
  if(form2.wireframe.checked) for(i = 0; i < numObject; i++) rigid[i].flagSolid = false;
  else                        for(i = 0; i < numObject; i++) rigid[i].flagSolid = true;
  display(); 
}

function onChangeMouse()
{
  if(form2.object.checked) m_flagObject = true;
  else                     m_flagObject = false;
  mouseOperation(canvasL, camera);//kwgSupport.js
  mouseOperation(canvasR, camera);
}

function onClickTranslate()
{
  rigid[selectNo].vPos.x = parseFloat(form2.translateX.value);
  rigid[selectNo].vPos.y = parseFloat(form2.translateY.value);
  rigid[selectNo].vPos.z = parseFloat(form2.translateZ.value);
  display();
}   

function onClickScale()
{
  rigid[selectNo].vSize.x = parseFloat(form2.scaleX.value);
  rigid[selectNo].vSize.y = parseFloat(form2.scaleY.value);
  rigid[selectNo].vSize.z = parseFloat(form2.scaleZ.value);
  display();
}   

function onClickRotate()
{
  rigid[selectNo].vEuler.x = parseFloat(form2.rotateX.value);
  rigid[selectNo].vEuler.y = parseFloat(form2.rotateY.value);
  rigid[selectNo].vEuler.z = parseFloat(form2.rotateZ.value);
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

function onClickBase()
{
  base = parseFloat(form2.base.value);
  display();
}
function onChangeView()
{
  var radioV =  document.getElementsByName("radioV");
  for(var i = 0; i < radioV.length; i++)
  {
    if(radioV[i].checked) viewMethod = i;
  }
  display();
}

function onClickReset()
{
  init();
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
  

