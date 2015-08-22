var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera;
var light;
var rigid ;
var floor0;
var objectNo = 0;
var coord = [];//座標軸表示用
var lenCoord = 1.5;
var widCoord = 0.05;
var flagWorld = false;
var flagObject = false;
var flagInertial = false;

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
 
　//3Dオブジェクトの作成
  rigid = new Rigid();
  floor0 = new Rigid();
  //座標軸オブジェクト
  for(var i = 0; i < 9; i++) coord[i] = new Rigid();
  m_rigid = new Rigid();//マウス操作用
  m_rigid = rigid;

  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  init();
  display();
}
//--------------------------------------------
function init()
{

　//光源インスタンスを作成
  light = new Light();
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera(); 
  camera.cnt[2] = 2.0;
  camera.getPos();//カメラ位置を計算
  
  //オブジェクトの位置，マテリアルを決定する
  rigid.vPos = new Vector3(0.0, 0.0, 2.0);
  rigid.vEuler = new Vector3();
  rigid.vSize = new Vector3(1.0, 1.0, 1.0);

  //HTMLのフォームをリセット
  form2.scaleX.value = 1.0;
  form2.scaleY.value = 1.0;
  form2.scaleZ.value = 1.0;
  form2.rotateX.value = 0.0;
  form2.rotateY.value = 0.0;
  form2.rotateZ.value = 0.0;
  form2.translateX.value = rigid.vPos.x;
  form2.translateY.value = rigid.vPos.y;
  form2.translateZ.value = rigid.vPos.z;

  //rigid.kind = "CUBE";
  rigid.diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid.ambient = [0.0, 0.4, 0.4, 1.0];
  rigid.specular = [0.99, 0.99, 0.99, 1.0];
  rigid.shininess = 100.0;
  rigid.nSlice = 30;//20;//x方向分割数
  rigid.nStack = 30;//20;//y方向分割数

  //座標軸
  for(var i = 0; i < 9; i++) 
  {
    coord[i].kind = "CYLINDER_Z";
    coord[i].vSize = new Vector3(widCoord, widCoord, lenCoord);
    coord[i].specular = [0.0, 0.0, 0.0, 1.0];
    coord[i].shininess = 10.0;
    coord[i].nSllice = 8;
  }
  coord[0].diffuse = [0.5, 0.0, 0.0, 1.0];//worldX
  coord[0].ambient = [0.5, 0.0, 0.0, 1.0];//worldX
  coord[1].diffuse = [0.0, 0.5, 0.0, 1.0];//worldY
  coord[1].ambient = [0.0, 0.5, 0.0, 1.0];//worldY
  coord[2].diffuse = [0.0, 0.0, 0.5, 1.0];//worldZ
  coord[2].ambient = [0.0, 0.0, 0.5, 1.0];//worldZ
  coord[3].diffuse = [1.0, 0.0, 0.0, 1.0];//objectX
  coord[3].ambient = [1.0, 0.0, 0.0, 1.0];//objectX
  coord[4].diffuse = [0.0, 1.0, 0.0, 1.0];//objectY
  coord[4].ambient = [0.0, 1.0, 0.0, 1.0];//objectY
  coord[5].diffuse = [0.0, 0.0, 1.0, 1.0];//objectZ
  coord[5].ambient = [0.0, 0.0, 1.0, 1.0];//objectZ
  coord[6].diffuse = [1.0, 1.0, 0.0, 1.0];//inertialX
  coord[6].ambient = [1.0, 1.0, 0.0, 1.0];//inertialX
  coord[7].diffuse = [0.0, 1.0, 1.0, 1.0];//inertialY
  coord[7].ambient = [0.0, 1.0, 1.0, 1.0];//inertialY
  coord[8].diffuse = [1.0, 0.0, 1.0, 1.0];//inertialZ
  coord[8].ambient = [1.0, 0.0, 1.0, 1.0];//inertialZ
　//ワールド座標
  coord[0].vPos = new Vector3(0.0, 0.0, 0.0);
  coord[0].vEuler = new Vector3(0.0, 90.0, 0.0);
  coord[1].vPos = new Vector3(0.0, 0.0, 0.0);
  coord[1].vEuler = new Vector3(-90.0, 0.0, 0.0);
  coord[2].vPos = new Vector3(0.0, 0.0, 0.0);

  //フロア
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, 0.0);
  floor0.vSize = new Vector3(20, 20, 20);
  floor0.nSlice = 20;//x方向分割数
  floor0.nStack = 20;//y方向分割数
  floor0.col1 = [0.6, 0.5, 0.5, 1.0];
  floor0.col2 = [0.4, 0.4, 0.6, 1.0];
  floor0.specular = [0.5, 0.5, 0.5, 1.0];
  floor0.shininess = 50;
  floor0.flagCheck = true;
  mouseOperation(canvas, camera);//support.js

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

  if(objectNo == 0)      rigid.kind = "CUBE"; 
  else if(objectNo == 1) rigid.kind = "SPHERE";
  else if(objectNo == 2) rigid.kind = "CYLINDER";
  else if(objectNo == 3) rigid.kind = "PRISM";
  else if(objectNo == 4) rigid.kind = "TORUS";
  else if(objectNo == 5) rigid.kind = "SUPER";

  var n = rigid.initVertexBuffers(gl);
//alert("rigid n="+n);
  rigid.draw(gl, n);

  //オブジェクト座標と回転
  coord[3].vPos = rigid.vPos;//x
  coord[3].vEuler = new Vector3(0.0, 90.0 + rigid.vEuler.y, rigid.vEuler.z);
  coord[4].vPos = rigid.vPos;//y
  coord[4].vEuler = new Vector3(rigid.vEuler.x-90.0, rigid.vEuler.y, rigid.vEuler.z);
  coord[5].vPos = rigid.vPos;//z
  coord[5].vEuler = rigid.vEuler;//new Vector3(rigid.vEuler.x, rigid.vEuler.y, rigid.vEuler.z);
  //慣性座標と回転
  coord[6].vPos = rigid.vPos;//x
  coord[6].vEuler = new Vector3(0.0, 90.0, 0.0);
  coord[7].vPos = rigid.vPos;//y
  coord[7].vEuler = new Vector3(-90.0, 0.0, 0.0);
  coord[8].vPos = rigid.vPos;//z
 
//  coord[8].vEuler = rigid.vEuler;// new Vector3(-90.0, 0.0, 0.0);
  if(flagWorld)
  {
    for(var i = 0; i < 3; i++)
    {
      n = coord[i].initVertexBuffers(gl);
      coord[i].draw(gl, n);
    }
  }
  if(flagObject)
  {
    for(var i = 3; i < 6; i++)
    {
      n = coord[i].initVertexBuffers(gl);
      coord[i].draw(gl, n);
    }
  }
  if(flagInertial)
  {
    for(var i = 6; i < 9; i++)
    {
      n = coord[i].initVertexBuffers(gl);
      coord[i].draw(gl, n);
    }
  }

  form2.rotateX.value = m_rigid.vEuler.x;
  form2.rotateY.value = m_rigid.vEuler.y;
  form2.rotateZ.value = m_rigid.vEuler.z;

  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
}

//---------------------------------------------------
//イベント処理
function onClickC_Size()
{
  canvas.width = form1.c_sizeX.value;
  canvas.height = form1.c_sizeY.value;
  display();
}

function onClickObjNo()
{
  objectNo = form2.objectNo.value;
  display();
}
function onClickWire()
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

function onClickTranslate()
{
  rigid.vPos.x = parseFloat(form2.translateX.value);
  rigid.vPos.y = parseFloat(form2.translateY.value);
  rigid.vPos.z = parseFloat(form2.translateZ.value);
  display();
}   

function onClickScale()
{
  rigid.vSize.x = parseFloat(form2.scaleX.value);
  rigid.vSize.y = parseFloat(form2.scaleY.value);
  rigid.vSize.z = parseFloat(form2.scaleZ.value);
  display();
}   

function onClickRotate()
{
  rigid.vEuler.x = parseFloat(form2.rotateX.value);
  rigid.vEuler.y = parseFloat(form2.rotateY.value);
  rigid.vEuler.z = parseFloat(form2.rotateZ.value);
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

function onClickReset()
{
  init();
  display();
}
