
var canvas, gl,  camera, light;
var rigid = new Rigid();//Rigidクラス（rigid.js)
var m_rigid = new Rigid();//マウス操作用
var dummy = new Rigid();
var floor0 = new Rigid();
var selectNo = 1;
var plane = [0.0, 0.0, 1.0, 1.0];//床平面(z = -1)
var shadow_value = 0.2;
//bump mapping
var repeatS = 1;
var repeatT = 1;
var inverse = 1;
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 45.0;//1秒間の回転角度
var flagStart = false;
//cube mapping
var TEX_WIDTH = 128;
var TEX_HEIGHT = 128;
var texCube;
var mode = 0;//合成モード(0:変調，1:混合）
var reflectivity = 0.5;

//Target構造体
function Target()
{
  this.name;//ターゲット名
  this.pos = [];//部分画像の位置
  this.cnt = [];//注視点
  this.up  = [];//アップベクトル
}
var target = [];

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

  numObject = 3;//numObjectはkwgSupport.jsで定義
  
  for(var i = 0; i < numObject; i++) rigid[i] = new Rigid();//Rigidクラス（kwgRigid.js)
  m_rigid = rigid[selectNo];

  // Canvasをクリアする色を設定し、隠面消去機能を有効にする
  init();
  initCubeMap();
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
           
      rigid[selectNo].vEuler.x += angleStep * frameTime;//回転角を更新
      form2.rotateX.value = rigid[selectNo].vEuler.x;//現在の角度を表示     
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
  
  //rigid[0].kind = "SPHERE";// "CUBE";
  rigid[0].kind = "CYLINDER";
  rigid[0].diffuse = [0.8, 0.2, 0.2, 1.0];
  rigid[0].ambient = [0.4, 0.1, 0.1, 1.0];
  rigid[0].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[0].shininess = 100.0; 
  rigid[0].vPos = new Vector3(0.0, -1.5, 0.0);
  rigid[0].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[0].vSize = new Vector3(1.0, 1.0, 1.0);
  rigid[0].radiusRatio = 1.0;
//  rigid[0].flagCubemap = false;

  rigid[1].kind = "SPHERE";;
  //rigid[1].kind = "CUBE";
  rigid[1].diffuse = [0.8, 0.6, 0.2, 1.0];
  rigid[1].ambient = [0.5, 0.3, 0.1, 1.0];
  rigid[1].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[1].shininess = 100.0;  
  rigid[1].vPos = new Vector3(0.0, 0.0, 0.0);
  rigid[1].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[1].vSize = new Vector3(1.0, 1.0, 1.0);
  rigid[1].nSlice = 25;
  rigid[1].nStack = 25;
//  rigid[1].flagCubemap = false;
  
  rigid[2].kind = "TORUS";
  //rigid[2].kind = "SUPER";
  rigid[2].diffuse = [0.9, 0.6, 0.6, 1.0];
  rigid[2].ambient = [0.6, 0.4, 0.4, 1.0];
  rigid[2].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[2].shininess = 100.0; 
  rigid[2].vPos = new Vector3(0.0, 1.5, 0.0);
  rigid[2].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[2].vSize = new Vector3(1.0, 1.0, 1.0);
  rigid[2].nSlice = 25;
  rigid[2].nStack = 25;
  //rigid[2].eps1 = 0.1;
  //rigid[2].eps2 = 0.1;

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

  form2.shadow.value = shadow_value;
  form2.reflectivity.value = reflectivity;

  mouseOperation(canvas, camera);
}
function initCubeMap()
{
  //ターゲット
  for(var i = 0; i < 6; i++) target[i] = new Target();
  //手前
  target[0].name = gl.TEXTURE_CUBE_MAP_POSITIVE_X;
  target[0].pos = [0, TEX_HEIGHT];
  target[0].cnt = [1.0, 0.0, 0.0];
  target[0].up  = [0.0, -1.0, 0.0];
  //奥
  target[1].name = gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
  target[1].pos = [0.0, 0.0];
  target[1].cnt = [-1.0, 0.0, 0.0];
  target[1].up  = [0.0, -1.0, 0.0];
  //右
  target[2].name = gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
  target[2].pos = [TEX_WIDTH, TEX_HEIGHT];
  target[2].cnt = [0.0, 1.0, 0.0];
  target[2].up  = [0.0, 0.0, 1.0];
  //左  
  target[3].name = gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
  target[3].pos = [TEX_WIDTH, 0];
  target[3].cnt = [0.0, -1.0, 0.0];
  target[3].up  = [0.0, 0.0, -1.0];
  //上
  target[4].name = gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
  target[4].pos = [2*TEX_WIDTH, TEX_HEIGHT];
  target[4].cnt = [0.0, 0.0, 1.0];
  target[4].up  = [0.0, -1.0, 0.0];
  //下
  target[5].name = gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;
  target[5].pos = [2*TEX_WIDTH, 0];
  target[5].cnt = [0.0, 0.0, -1.0];
  target[5].up  = [0.0, -1.0, 0.0];

  texCube = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texCube);

  for(var i = 0; i < 6; i++)
    gl.texImage2D(target[i].name, 0, gl.RGBA, TEX_WIDTH, TEX_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);//ミップマップ自動生成
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
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
    gl.activeTexture(gl.TEXTURE1);
    // テクスチャオブジェクトをターゲットにバインドする
    gl.bindTexture(gl.TEXTURE_2D, texBump);
    // テクスチャ画像を設定する
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    // テクスチャパラメータを設定する
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
    var samplerBumpLoc = gl.getUniformLocation(gl.program, 'u_samplerBump');
    gl.uniform1i(samplerBumpLoc, 1);

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
  
  makeTexture();
  drawScene();
  
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
  
function makeTexture()
{
  var cubemapLoc = gl.getUniformLocation(gl.program, 'u_flagCubeMap');
  gl.uniform1i(cubemapLoc, false);

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texCube);
 
  gl.clearColor(0.2, 0.8, 0.8, 1.0);
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
 
  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  //ビュー投影行列を計算する
  for(var i = 0; i < 6; i++)
  {
    var vpMatrix = new Matrix4();// 初期化
    vpMatrix.perspective(90.0, TEX_WIDTH/TEX_HEIGHT, 0.1, 100.0);
  
    gl.viewport(target[i].pos[0], target[i].pos[1], TEX_WIDTH, TEX_HEIGHT);
    vpMatrix.lookAt(rigid[selectNo].vPos.x, rigid[selectNo].vPos.y, rigid[selectNo].vPos.z, 
    rigid[selectNo].vPos.x + target[i].cnt[0], rigid[selectNo].vPos.y + target[i].cnt[1], rigid[selectNo].vPos.z + target[i].cnt[2],
      target[i].up[0], target[i].up[1],target[i].up[2]);

    gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);
    
    for(var k = 0; k < numObject; k++) 
    {
      if(k == selectNo) continue;
      n = rigid[k].initVertexBuffers(gl);
      rigid[k].draw(gl, n);
    }
    n = floor0.initVertexBuffers(gl);
    floor0.draw(gl, n);
  
    drawShadow()
    gl.copyTexSubImage2D(target[i].name, 0, 0, 0, target[i].pos[0], target[i].pos[1], TEX_WIDTH, TEX_HEIGHT);
  }
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}


function drawScene()
{
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);

  //合成モード
  var modeLoc = gl.getUniformLocation(gl.program, 'u_mode');
  gl.uniform1i(modeLoc, mode);
  //反射率
  var reflectLoc = gl.getUniformLocation(gl.program, 'u_reflectivity');
  gl.uniform1f(reflectLoc, reflectivity);

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

  var flagTorus = false;
  if(rigid[selectNo].kind == "TORUS") flagTorus = true;
  var torusLoc = gl.getUniformLocation(gl.program, 'u_flagTorus');
  gl.uniform1i(torusLoc, flagTorus);

  var inverseLoc = gl.getUniformLocation(gl.program, 'u_inverse');
  gl.uniform1f(inverseLoc, inverse);
   
  rigid[selectNo].nRepeatS = repeatS;
  rigid[selectNo].nRepeatT = repeatT;

  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);
  //cube map
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texCube);
  var samplerLoc = gl.getUniformLocation(gl.program, "u_samplerCube");
  gl.uniform1i(samplerLoc, 0);//gl.TEXTURE0を適用
    
  var cubemapLoc = gl.getUniformLocation(gl.program, 'u_flagCubeMap');

  var n = dummy.initVertexBuffers(gl);//ダミー
  for(var k = 0; k < numObject; k++) 
  {
    if(k == selectNo) { gl.uniform1i(cubemapLoc, true); rigid[k].flagTexture = true;}
    else { gl.uniform1i(cubemapLoc, false); rigid[k].flagTexture = false;}
    rigid[selectNo].flagTexture = true;
    
    n = rigid[k].initVertexBuffers(gl);
    rigid[k].draw(gl, n);
    n = dummy.initVertexBuffers(gl);//ダミー
  }
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
 
  gl.uniform1i(cubemapLoc, false);
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
  var i, n;
  for(i = 0; i < numObject; i++) 
  {
    rigid[i].shadow = shadow_value;
    n = rigid[i].initVertexBuffers(gl);
    rigid[i].draw(gl, n);
    rigid[i].shadow = 0;//描画後は元に戻す
    n = dummy.initVertexBuffers(gl);//ダミー
  }  
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

function onChangeNo()
{
  var radio1 =  document.getElementsByName("radio1");
  for(var i = 0; i < radio1.length; i++)
  {
     if(radio1[i].checked) selectNo = i;
  }
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
function onChangeMode()
{
  var radioM =  document.getElementsByName("radioM");
  if(radioM[0].checked) mode = 0;
  else mode = 1;
  display();
}

function onClickReflectivity()
{
  reflectivity = parseFloat(form2.reflectivity.value);
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
