
var gl, canvas, camera, light;
//var selectNo = 0;
var rigid = new Rigid();
var m_rigid = new Rigid();
var floor0 = new Rigid();//フロア用
var dog = new Dog();
var plane = [0.0, 0.0, 1.0, 1.0];//床平面(z = -1)
var shadow_value = 0.15;
var objectNo = 1;

//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 45.0;//1秒間の回転角度
var flagStart = false;
var flagDogStart = false;
var frameCount = 0;

//cube map
var TEX_WIDTH = 128;
var TEX_HEIGHT = 128;
var texCube;
var nRatio = 1.0;//比屈折率
var transparency = 0.5;//透明度
//var mode = 0;//合成モード(0:変調，1:混合）
//var reflectivity = 0.5;

//Target構造体
function Target()
{
  this.name;//ターゲット名
  this.pos = [];//部分画像の位置
  this.cnt = [];//注視点
  this.up  = [];//アップベクトル
}
var target = [];

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
  initGlsl(gl, VS_SOURCE, FS_SOURCE);


  numObject = 2;//numObjectはkwgSupport.jsで定義
  
  m_rigid = rigid;
  
  makeAnimationData();

  init();
  
  initCubeMap();
  
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
      fps *= 2.0;
      form1.fps.value = fps.toString(); //0.5秒間隔で表示
      form1.timestep.value = 1.0 / fps;
      fps = 0;
      elapseTime = 0.0;
    }
    lastTime = currentTime;　
    
    if(flagStart)
    {
      if(flagDogStart)
      {
        dog.vPos.v3_copy(dog.f_vPos[frameCount]);
	    dog.vEuler.v3_copy(dog.f_vEuler[frameCount]);
        for(var k = 0; k < dog.numJoints; k++) 
          dog.vJoints[k].v3_copy(dog.f_vJoints[frameCount*dog.numJoints + k]);
      
        frameCount ++; 
        if(frameCount >= dog.numFrame) flagDogStart = false;
      }
      makeTexture();
      drawScene();
      rigid.vEuler.y += angleStep * frameTime;//回転角を更新
    }      
  }
  animeStart();
}

function makeAnimationData()
{
  //アニメーション準備
  dog.numFrame = 0;
  frameCount = 0;
  dog.unitTime = 0.05;//タイムステップ
  //あらかじめフレームデータを作成
  dog.walk(4.0, 0.4, 2.0);
  dog.turn(180.0, 1.0);
  dog.swingTail(5, 1.0);
  dog.walk(2.0, 0.5, 4.0);
  dog.stand(0.5);
  dog.wait(1.0);
  dog.initPose(0.8);
}

function initDog()
{
  //robotの初期設定
  dog.vPos = new Vector3(-2.0, -2.0, -1.0);
  dog.vSize = new Vector3(1.0, 1.0, 1.0);
  dog.vEuler = new Vector3(0.0, 0.0, 90.0);
  for(var i = 0; i < dog.numJoints; i++) dog.vJoints[i] = new Vector3();
}

function init()
{
  light = new Light();
  form2.lightX.value = light.pos[0] = 5.0;
  form2.lightY.value = light.pos[1] = 3.0;
  form2.lightZ.value = light.pos[2] = 10.0;
 
  //カメラ
  camera = new Camera();
  camera.dist = 5.0;
  camera.getPos();

  initDog();
  
  //隠面消去機能を有効にする
  gl.enable(gl.DEPTH_TEST);
  
  rigid.kind = "SPHERE";// "CUBE";
  //rigid.kind = "CYLINDER";
  rigid.diffuse = [0.8, 0.2, 0.0, 1.0];
  rigid.ambient = [0.3, 0.1, 0.0, 1.0];
//  rigid.diffuse = [0.6, 0.6, 0.5, 1.0];
//  rigid.ambient = [0.4, 0.4, 0.3, 1.0];
  rigid.specular = [0.6, 0.6, 0.6, 1.0];
  rigid.shininess = 100.0; 
  rigid.vPos = new Vector3(0.0, 0.0, 0.0);
  rigid.vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid.vSize = new Vector3(1.5, 1.5, 1.5);

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
  form2.nRatio.value = nRatio;
  form2.transparency.value = transparency;

  //オブジェクトのpropertyをフォームに表示
  form2.nSlice.value = rigid.nSlice;
  form2.nStack.value = rigid.nStack;
  form2.radiusRatio.value = rigid.radiusRatio;
  form2.eps1.value = rigid.eps1;
  form2.eps2.value = rigid.eps2;
  form2.shadow.value = shadow_value;

  mouseOperation(canvas, camera);//kwgSupport.js
  
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

//---------------------------------------------
function display()
{  
  //光源位置・色をシェーダへアップロード
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightPosLoc, light.pos);
  gl.uniform4fv(lightColLoc, light.color);

  if(objectNo == 0) rigid.kind = "CUBE";
  else if(objectNo == 1) rigid.kind = "SPHERE";
  else if(objectNo == 2) rigid.kind = "CYLINDER";
  else if(objectNo == 3) rigid.kind = "PRISM";
  else if(objectNo == 4) rigid.kind = "TORUS";
  else if(objectNo == 5) rigid.kind = "SUPER";
 
  makeTexture();
  drawScene();
}

function makeTexture()
{
  
  var cubemapLoc = gl.getUniformLocation(gl.program, 'u_flagCubeMap');
  gl.uniform1i(cubemapLoc, false);

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texCube);
 
  gl.clearColor(0.7, 0.8, 0.8, 1.0);
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
 
  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  //ビュー投影行列を計算する
  for(var i = 0; i < 6; i++)
  {
    var vpMatrix = new Matrix4();// 初期化
    vpMatrix.perspective(90.0, 1.0, 0.1, 100.0);
  
    gl.viewport(target[i].pos[0], target[i].pos[1], TEX_WIDTH, TEX_HEIGHT);
    vpMatrix.lookAt(rigid.vPos.x, rigid.vPos.y, rigid.vPos.z , 
          rigid.vPos.x + target[i].cnt[0], rigid.vPos.y + target[i].cnt[1], rigid.vPos.z + target[i].cnt[2], target[i].up[0], target[i].up[1],target[i].up[2]);

    gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

    dog.draw(gl);

    n = floor0.initVertexBuffers(gl);
    floor0.draw(gl, n);
  
    drawShadow();
    gl.copyTexSubImage2D(target[i].name, 0, 0, 0, target[i].pos[0], target[i].pos[1], TEX_WIDTH, TEX_HEIGHT);
  }
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
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
  
  dog.shadow = shadow_value;
  dog.draw(gl);
  dog.shadow = 0;//描画後は元に戻す
  
  gl.disable(gl.BLEND);
  gl.depthMask(true);
}

function drawScene()
{
  //カメラ位置をシェーダへアップロード 
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);

  //比屈折率
  var nRatioLoc = gl.getUniformLocation(gl.program, 'u_nRatio');
  gl.uniform1f(nRatioLoc, nRatio);
  //透明度
  var transparencyLoc = gl.getUniformLocation(gl.program, 'u_transparency');
  gl.uniform1f(transparencyLoc, transparency);
  
  //ビュー投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera.fovy, canvas.width/canvas.height, camera.near, camera.far);
  if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texCube);
  var samplerLoc = gl.getUniformLocation(gl.program, "u_sampler");
  gl.uniform1i(samplerLoc, 0);//gl.TEXTURE0を適用
    
  var cubemapLoc = gl.getUniformLocation(gl.program, 'u_flagCubeMap');

  gl.uniform1i(cubemapLoc, true);  
  n = rigid.initVertexBuffers(gl);
  rigid.draw(gl, n);
  
  gl.uniform1i(cubemapLoc, false);
  dog.draw(gl);

  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  
  drawShadow()
  
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

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
  rigid.eps1 = parseFloat(form2.eps1.value);
  rigid.eps2 = parseFloat(form2.eps2.value);
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

function onClick_nRatio()
{
  nRatio = parseFloat(form2.nRatio.value);
  display();
}

function onClickTransparency()
{
  transparency = parseFloat(form2.transparency.value);
  display();
}

function onClickReset()
{
  frameCount = 0;
  dog.height = dog.height0;
  init();
  display();
}
function onClickStart()
{
  flagStart = true;
  flagDogStart = true;
  makeAnimationData();
  display();
}
function onClickStop()
{
  flagStart = false;
  flagDogStart = false
  display();
}
  

