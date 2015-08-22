var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera, light;
var rigid = new Rigid();//Rigidクラス（kwgRigid.js)
var objectNo = 0;

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
  m_rigid = rigid;

  init();
  display();
}

function init()
{
　//光源のインスタンスを作成
  light = new Light();
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];

　//カメラのインスタンスを作成
  camera = new Camera(); 
  camera.getPos();//光源の位置を計算

  // Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
 
  //オブジェクトの初期設定
  rigid.vPos = new Vector3();
  rigid.vEuler = new Vector3();
  rigid.vSize = new Vector3(1, 1, 1); 
  //オブジェクトのマテリアルを決定する
  rigid.diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid.ambient = [0.0, 0.4, 0.4, 1.0];
  rigid.specular = [0.5, 0.5, 0.5, 1.0];
  rigid.shininess = 100.0; 
  form2.shininess.value = 100.0;
  mouseOperation(canvas, camera);//kwgSupport.js 
}
//---------------------------------------------
function display()
{  
  //光源の位置・色をシェーダへアップロード
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  gl.uniform4fv(lightPosLoc, light.pos);
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightColLoc, light.color);
  //カメラ位置をシェーダへアップロード
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);
  
  //ビュー投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera.fovy, canvas.width/canvas.height, camera.near, camera.far);
  if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
    vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else
    vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);

　//ビュー投影行列をシェーダへ
  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

  // カラー・バッファとデプス・バッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //ビューポート変換
  gl.viewport(0, 0, canvas.width, canvas.height);

  if(objectNo == 0) rigid.kind = "CUBE";
  else if(objectNo == 1) rigid.kind = "SPHERE";
  else if(objectNo == 2) rigid.kind = "CYLINDER";
  else if(objectNo == 3) rigid.kind = "PRISM";
  else if(objectNo == 4) rigid.kind = "TORUS";
  else if(objectNo == 5) rigid.kind = "SUPER";
  
  var n = rigid.initVertexBuffers(gl);
  rigid.draw(gl, n);
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
function onClickLight()
{
  light.pos[0] = parseFloat(form2.lightX.value);
  light.pos[1] = parseFloat(form2.lightY.value);
  light.pos[2] = parseFloat(form2.lightZ.value);
  display();
}
function onClickShininess()
{
  rigid.shininess = parseFloat(form2.shininess.value);
  display();
}

function onClickReset()
{
  init();
  display();
}
