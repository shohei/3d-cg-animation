
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var program;
var rigid  = new Rigid();
var objectNo = 0;
var camera, light;
//テクスチャ
var repeatS = 1;
var repeatT = 1;
var mode = 0;//合成モード(0:変調，1:混合）
var mixK = 0.5;//混合モードのときの混合係数
var flagMipmap = true;
var flagMirrorS = false;//鏡像フラグ
var flagMirrorT = false;
var image = new Image();
//var tex;

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
  readyTexture();
}

function init()
{
　//光源のインスタンスを作成
  light = new Light();
  light.pos[0] = 5;
  light.pos[1] = 3;
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];

　//カメラのインスタンスを作成
  camera = new Camera(); 
  camera.dist = 5;
  camera.getPos();//カメラの位置を計算

  // Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
 
  //オブジェクトの初期設定
  rigid.flagTexture = true;
  rigid.vPos = new Vector3();
  rigid.vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid.vSize = new Vector3(1, 1, 1); 
  //オブジェクトのマテリアルを決定する
  rigid.diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid.ambient = [0.0, 0.4, 0.4, 1.0];
  rigid.specular = [0.8, 0.8, 0.8, 1.0];
  rigid.shininess = 100.0;
  rigid.nRepeatS = repeatS;
  rigid.nRepeatT = repeatT;
  
  form2.objectNo.value = objectNo;
  mouseOperation(canvas, camera);//kwgSupport.js 
}

//------------------------------------------------------------------------
function readyTexture() 
{
  var tex = gl.createTexture();// テクスチャオブジェクトを作成する

  image.src = '../imageJPEG/tiger.jpg';
  // 画像の読み込み完了時のイベントハンドラを設定する
  image.onload = function(){ setTexture(); }

  function setTexture() 
  {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);// 画像のY軸を反転する
    // テクスチャユニット0を有効にする
    gl.activeTexture(gl.TEXTURE0);
    // テクスチャオブジェクトをターゲットにバインドする
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // テクスチャ画像を設定する
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    //シェーダのユニフォーム変数u_samplerにユニット0を渡す
    var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
    gl.uniform1i(samplerLoc, 0);
    display();
  }
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
　//テクスチャの繰り返し数の設定
  rigid.nRepeatS = repeatS;
  rigid.nRepeatT = repeatT;
  //ミップマップ自動生成
  if(flagMipmap) 
  {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  }
  else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  //鏡映
  if(flagMirrorS) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  if(flagMirrorT) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  //合成モード
  var modeLoc = gl.getUniformLocation(gl.program, 'u_mode');
  gl.uniform1i(modeLoc, mode);
  //混合モードのときの係数
  var mixKLoc = gl.getUniformLocation(gl.program, 'u_mixK');
  gl.uniform1f(mixKLoc, mixK);

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

function onClickMipmap()
{
  if(form2.mipmap.checked) flagMipmap = true;
  else                     flagMipmap = false;
  display(); 
}

function onChangeMouse()
{
  if(form2.object.checked) m_flagObject = true;
  else                     m_flagObject = false;
  mouseOperation(canvas, camera);//kwgSupport.js  
}
function onChangeImage()
{
  var radioI =  document.getElementsByName("radioI");
  if(radioI[0].checked) image.src =  '../imageJPEG/tiger.jpg';
  else  image.src = '../imageJPEG/zone.jpg';
  
  display();
}

function onClickRepeat()
{
  repeatS = parseFloat(form2.repeatS.value);
  repeatT = parseFloat(form2.repeatT.value);
  display();
}

function onClickMirror()
{
  flagMirrorS = form2.mirrorS.checked;
  flagMirrorT = form2.mirrorT.checked;
  display(); 
}

function onChangeMode()
{
  var radioM =  document.getElementsByName("radioM");
  if(radioM[0].checked) mode = 0;
  else mode = 1;
  display();
}

function onClickMixK()
{
  mixK = parseFloat(form2.mixK.value);
  display();
}

function onClickLight()
{
  light.pos[0] = parseFloat(form2.lightX.value);
  light.pos[1] = parseFloat(form2.lightY.value);
  light.pos[2] = parseFloat(form2.lightZ.value);
  display();
}

function onClickReset()
{
  init();
  display();
}
