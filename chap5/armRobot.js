
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var robot = new ArmRobot;
var floor0 = new Rigid();
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0.0)
var shadow_value = 0.3;
var camera, light;

function webMain() 
{
  // Canvas要素を取得する
  canvas = document.getElementById('WebGL');

  // WebGL描画用のコンテキストを取得する
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
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
    
  m_rigid = new Rigid();//マウス操作用
  m_rigid = robot;
  
  init();
  display();
}
//--------------------------------------------
function init()
{
  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.62, 0.6, 0.6, 1.0);
  gl.enable(gl.DEPTH_TEST);

　//光源インスタンスを作成
  light = new Light();
  light.pos = [5, 5, 10, 1];
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera(); 
  camera.cnt[2] = 2.0;
  camera.getPos();//カメラ位置を計算
  
  //robotの初期値
  robot.vSize = new Vector3(1.0, 1.0, 1.0);
  robot.vEuler = new Vector3(0.0, 0.0, 0.0);
  robot.vPos = new Vector3(0.0, 0.0, 0.0);
  robot.joints[0] =  new Vector3(0.0, 0.0, 0.0);
  robot.joints[1] =  new Vector3(0.0, 0.0, 0.0);
  
  //HTMLのフォームをリセット
  form2.scaleX.value = 1.0;
  form2.scaleY.value = 1.0;
  form2.scaleZ.value = 1.0;
  form2.translateX.value = robot.vPos.x;
  form2.translateY.value = robot.vPos.y;
  form2.translateZ.value = robot.vPos.z;
  form2.rotateX1.value = 0.0;
  form2.rotateY1.value = 0.0;
  form2.rotateZ1.value = 0.0;
  form2.rotateX2.value = 0.0;
  form2.rotateY2.value = 0.0;
  form2.rotateZ2.value = 0.0;

  //フロア
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

  form2.shadow.value = shadow_value;
  mouseOperation(canvas, camera);//kwgSupport.js

}
//---------------------------------------------
function display()
{ 
 
  //光源
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  gl.uniform4fv(lightPosLoc, light.pos);
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightColLoc, light.color);
  
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);
  
  //ビュープロジェクション行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera.fovy, canvas.width/canvas.height, camera.near, camera.far);
  //vpMatrix.lookAt(camera.pos[0], camera.pos[1], v, 0, 0, 0, 0, 0, 1);
  if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  robot.draw(gl);
  
  var n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  
  //影
  drawShadow();
}
function drawShadow()
{
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  robot.shadow = shadow_value;
  robot.draw(gl);
  gl.depthMask(true);
  gl.disable(gl.BLEND);
  robot.shadow = 0.0;
}
/*---------------------------------------------------------------
       ArmRobotクラス
----------------------------------------------------------------*/
function ArmRobot()
{
  this.numParts = 3;
  this.numJoints = 2;
  
  this.flagSolid = true;
  this.shadow = 0.0;
  
  //robotの位置・姿勢
  this.vPos = new Vector3(0.0, 0.0, 0.0);
  this.vEuler = new Vector3(0.0, 0.0, 0.0);
  this.vSize = new Vector3(1.0, 1.0, 1.0);//全体のスケール変換
  
  this.parts = [];
  for(var i = 0; i < this.numParts; i++) this.parts[i] = new Rigid_HS();
  //partsの種類や色・サイズなど
  this.parts[0].kind = "CUBE";//Base
  this.parts[0].diffuse = [0.8, 0.3, 0.2, 1.0];
  this.parts[0].ambient = [0.5, 0.2, 0.1, 1.0];
  this.parts[0].vSize = new Vector3(1.0, 1.0, 0.2);
  this.parts[1].kind = "PRISM"//Arm1
  this.parts[1].diffuse = [0.2, 0.2, 0.6, 1.0];
  this.parts[1].ambient = [0.1, 0.1, 0.3, 1.0];
  this.parts[1].nSlice = 5;
  this.parts[1].radiusRatio = 0.8;
  this.parts[1].vSize = new Vector3(0.5, 0.5, 1.0);
  this.parts[2].kind = "CYLINDER_Z"//Arm2
  this.parts[2].diffuse = [0.8, 0.2, 0.2, 1.0];
  this.parts[2].ambient = [0.4, 0.1, 0.1, 1.0];
  this.parts[2].vSize = new Vector3(0.3, 0.3, 1.0);
  
  //関節
  this.joints = [];
  this.joints[0] = new Vector3(0.0, 0.0, 0.0);
  this.joints[1] = new Vector3(0.0, 0.0, 0.0);
} 

ArmRobot.prototype.draw = function(gl)
{
  for(var i = 0; i < this.numParts; i++) 
  {
    this.parts[i].flagSolid = this.flagSolid;
    this.parts[i].shadow = this.shadow;
  }

  //スタック行列の確保
  var stackMat = [];
  for(var i = 0; i < 5; i++) stackMat[i] = new Matrix4();
 
  var modelMatrix = new Matrix4(); //モデル行列の初期化
  if(this.shadow >= 0.01) modelMatrix.dropShadow(plane, light.pos);//簡易シャドウ

  //全体(root)
  modelMatrix.translate(this.vPos.x, this.vPos.y, this.vPos.z);
  modelMatrix.rotate(this.vEuler.z, 0, 0, 1); // z軸周りに回転
  modelMatrix.rotate(this.vEuler.y, 0, 1, 0); // y軸周りに回転
  modelMatrix.rotate(this.vEuler.x, 1, 0, 0); // x軸周りに回転
  modelMatrix.scale(this.vSize.x, this.vSize.y, this.vSize.z);
  stackMat[0].copy(modelMatrix);//モデル行列を保存(ここまでのモデル行列はparts[1]にも影響する)
  //台の描画(この部分はparts[1]には影響しない）
  modelMatrix.translate(0.0, 0.0, this.parts[0].vSize.z / 2);
  modelMatrix.scale(this.parts[0].vSize.x, this.parts[0].vSize.y, this.parts[0].vSize.z);
  var n = this.parts[0].initVertexBuffers(gl);
  this.parts[0].draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//parts[1]に影響するモデル行列をスタックからpop 
  //腕1を台の上に載せjoints[0]で回転
  modelMatrix.translate(0.0, 0.0, this.parts[0].vSize.z);//土台の上に平行移動
  modelMatrix.rotate(this.joints[0].z, 0, 0, 1); // z軸周りに回転
  modelMatrix.rotate(this.joints[0].y, 0, 1, 0); // y軸周りに回転
  modelMatrix.rotate(this.joints[0].x, 1, 0, 0); // x軸周りに回転
  stackMat[0].copy(modelMatrix);//モデル行列を保存(ここまでのモデル行列はparts[2]にも影響する)
  //腕1の描画（この部分はparts[2]に影響しない）
  modelMatrix.scale(this.parts[1].vSize.x, this.parts[1].vSize.y, this.parts[1].vSize.z);
  modelMatrix.translate(0.0, 0.0, this.parts[1].vSize.z/2);//中心位置を持ち上げる
  n = this.parts[1].initVertexBuffers(gl);
  this.parts[1].draw(gl, n, modelMatrix);
  
  modelMatrix.copy(stackMat[0]);//parts[2]に影響するモデル行列をスタックからpop
  //腕2を腕1の上に載せjoints[1]で回転
  modelMatrix.translate(0.0, 0.0, this.parts[1].vSize.z);
  modelMatrix.rotate(this.joints[1].z, 0, 0, 1); // z軸周りに回転
  modelMatrix.rotate(this.joints[1].y, 0, 1, 0); // y軸周りに回転
  modelMatrix.rotate(this.joints[1].x, 1, 0, 0); // x軸周りに回転
  //腕2の描画
  modelMatrix.scale(this.parts[2].vSize.x, this.parts[2].vSize.y, this.parts[2].vSize.z);
  n = this.parts[2].initVertexBuffers(gl);
  this.parts[2].draw(gl, n, modelMatrix);
}

//---------------------------------------------------
//イベント処理
function onClickC_Size()
{
  canvas.width = form1.c_sizeX.value;
  canvas.height = form1.c_sizeY.value;
  display();
}

function onClickWire()
{
  if(form2.wireframe.checked) robot.flagSolid = false;
  else                        robot.flagSolid = true;
  display(); 
}

function onChangeMouse()
{
  if(form2.object.checked) m_flagObject = true;
  else                     m_flagObject = false;
  mouseOperation(canvas, camera);//support.js
}

function onClickTranslate()
{
  robot.vPos.x = parseFloat(form2.translateX.value);
  robot.vPos.y = parseFloat(form2.translateY.value);
  robot.vPos.z = parseFloat(form2.translateZ.value);
  display();
}   

function onClickScale()
{
  robot.vSize.x = parseFloat(form2.scaleX.value);
  robot.vSize.y = parseFloat(form2.scaleY.value);
  robot.vSize.z = parseFloat(form2.scaleZ.value);
  display();
}   

function onClickRotate1()
{
  robot.joints[0].x = parseFloat(form2.rotateX1.value);
  robot.joints[0].y = parseFloat(form2.rotateY1.value);
  robot.joints[0].z = parseFloat(form2.rotateZ1.value);
  display();
}
function onClickRotate2()
{
  robot.joints[1].x = parseFloat(form2.rotateX2.value);
  robot.joints[1].y = parseFloat(form2.rotateY2.value);
  robot.joints[1].z = parseFloat(form2.rotateZ2.value);
  display();
}

function onClickLight()
{
  light.pos[0] = parseFloat(form2.lightX.value);
  light.pos[1] = parseFloat(form2.lightY.value);
  light.pos[2] = parseFloat(form2.lightZ.value);
  display();
}

function onClickCoord()
{
  if(form2.world.checked) flagWorld = true;
  else                    flagWorld = false;
  if(form2.c_object.checked) flagObject = true;
  else                     flagObject = false;
  if(form2.inertial.checked) flagInertial = true;
  else                    flagInertial = false;
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
