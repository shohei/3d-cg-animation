var gl_L, gl_R;
var canvasL, canvasR; //canvas要素
var cameraL, cameraR;
var light;

var selectNo = 0;
var rigid = [];
var floor0 = new Rigid();//フロア用
var plane = [0.0, 0.0, 1.0, 2.0];//床平面(z = -2)
var shadow_value = 0.3;
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 45.0;//1秒間の回転角度
var flagStart = false;
var light;

function webMain() 
{
  // Canvas要素を取得する
  canvasL = document.getElementById('WebGL_Left');
  canvasR = document.getElementById('WebGL_Right');

  // WebGL描画用のコンテキストを取得する
  gl_L = WebGLUtils.setupWebGL(canvasL);//左側
  gl_R = WebGLUtils.setupWebGL(canvasR);//右側

  var VS_SOURCE = document.getElementById("vs").textContent;
  var FS_SOURCE = document.getElementById("fs").textContent;

  initGlsl(gl_L, VS_SOURCE, FS_SOURCE);
  initGlsl(gl_R, VS_SOURCE, FS_SOURCE);//シェーダのソースは同じ

  numObject = 3;//numObjectはkwgSupport.jsで定義
  //0,1は左側キャンバス，2は右側キャンバス
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
      drawSceneLeft(gl_L);
      drawSceneRight(gl_R);
      
      if(selectNo < 2) rigid[selectNo].vEuler.x += angleStep * frameTime;//回転角を更新
      //右側はｙ軸回転
      if(selectNo == 2) rigid[selectNo].vEuler.y += angleStep * frameTime;//回転角を更新
      
      form2.rotateX.value = rigid[selectNo].vEuler.x;//現在の角度を表示
      form2.rotateY.value = rigid[selectNo].vEuler.y;//現在の角度を表示
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
  cameraL = new Camera();//左側canvasのカメラ 
  cameraL.getPos();
  cameraR = new Camera();//右側canvasのカメラ 
  //cameraR.phi = 180.0;//負のx軸方向
  cameraR.getPos();

  // Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl_L.clearColor(0.0, 0.0, 0.0, 1.0);
  gl_L.enable(gl_L.DEPTH_TEST);
  gl_R.clearColor(0.0, 0.0, 0.0, 1.0);
  gl_R.enable(gl_R.DEPTH_TEST);
  
  //rigid[0].kind = "CUBE";
  rigid[0].kind = "CYLINDER";
  rigid[0].diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid[0].ambient = [0.0, 0.4, 0.4, 1.0];
  rigid[0].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[0].shininess = 100.0; 
  rigid[0].vPos = new Vector3(0.0, -1.0, 0.0);
  rigid[0].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[0].vSize = new Vector3(1.0, 1.0, 1.0);

  rigid[1].kind = "TORUS";
  //rigid[1].kind = "CUBE";
  rigid[1].diffuse = [0.9, 0.2, 0.2, 1.0];
  rigid[1].ambient = [0.5, 0.1, 0.1, 1.0];
  rigid[1].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[1].shininess = 100.0;  
  rigid[1].vPos.y = 1.5;
  rigid[1].vPos = new Vector3(0.0, 1.0, 0.0);
  rigid[1].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[1].vSize = new Vector3(1.0, 1.0, 1.0);
  rigid[1].nSlice = 20;
  rigid[1].nStack = 20;
  
  rigid[2].kind = "CUBE";
  //rigid[2].kind = "CYLINDER";
  rigid[2].diffuse = [0.9, 0.6, 0.6, 1.0];
  rigid[2].ambient = [0.4, 0.4, 0.4, 1.0];
  rigid[2].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[2].shininess = 100.0; 
  rigid[2].vPos = new Vector3(0.0, 0.0, 0.0);
  rigid[2].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[2].vSize = new Vector3(1.0, 1.0, 1.0);

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
  mouseOperation(canvasL, cameraL);//kwgSupport.js
  mouseOperation(canvasR, cameraR);
}

//---------------------------------------------
function display()
{  
  uploadToShader(gl_L, canvasL, cameraL);
  drawSceneLeft(gl_L);
  uploadToShader(gl_R, canvasR, cameraR);
  drawSceneRight(gl_R);

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
  var radio1 =  document.getElementsByName("radio1");
  radio1[selectNo].checked = true;

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

function drawSceneLeft(gl)
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
  
  drawShadowLeft(gl)
}

function drawShadowLeft(gl)
{
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  for(var i = 0; i < numObject-1; i++) 
  {
    rigid[i].shadow = shadow_value;
    n = rigid[i].initVertexBuffers(gl);
    rigid[i].draw(gl, n);
    rigid[i].shadow = 0;//描画後は元に戻す
  }
  gl.disable(gl.BLEND);
  gl.depthMask(true);
}
function drawSceneRight(gl)
{
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvasR.width, canvasR.height);

  var n = rigid[2].initVertexBuffers(gl);
  rigid[2].draw(gl, n);
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  
  drawShadowRight(gl)
}

function drawShadowRight(gl)
{
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  rigid[2].shadow = shadow_value;
  n = rigid[2].initVertexBuffers(gl);
  rigid[2].draw(gl, n);
  rigid[2].shadow = 0;//描画後は元に戻す
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
  mouseOperation(canvasL, cameraL);//kwgSupport.js
  mouseOperation(canvasR, cameraR);
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
  

