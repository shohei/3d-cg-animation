
var canvas, gl, camera, light;     
var selectNo = 1;
var rigid = [];
var dog = new Dog();
var m_rigid = new Rigid();//マウス操作用
var floor0;
var plane = [0.0, 0.0, 1.0, 1.0];//床平面(z = -1)
var shadow_value = 0.3;

//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 45.0;//1秒間の回転角度
var flagStart = false;
var flagDogStart = false;
//cube map
var TEX_WIDTH = 128;
var TEX_HEIGHT = 128;
var texCube;
var nRatio = 10.0;
var transparency = 0.5;

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

  numObject = 3;
  for(var i = 0; i < numObject; i++) rigid[i] = new Rigid();//Rigidクラス（rigid.js)
  m_rigid = rigid[selectNo];
  floor0 = new Rigid();

  makeAnimationData();
  init();
  initCubeMap();
  display();

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
      
      for(var i = 0; i < numObject; i++)
      {//選択されていない2個を回転
        if(i == selectNo) continue;
        rigid[i].vEuler.x += angleStep * frameTime;
      }
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
  dog.vPos = new Vector3(-5.0, -2.0, -1.0);
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
  //camera.cnt = [0.0, 0.0, 1.0];
  camera.getPos();

  initDog();
  
  //隠面消去機能を有効にする
  gl.enable(gl.DEPTH_TEST);
  //透明物体の背面を消去
  gl.cullFace(gl.BACK);
  gl.enable(gl.CULL_FACE);
 
  rigid[0].kind = "SUPER";
  rigid[0].diffuse = [0.8, 0.2, 0.2, 1.0];
  rigid[0].ambient = [0.4, 0.1, 0.1, 1.0];
  rigid[0].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[0].shininess = 100.0; 
  rigid[0].vPos = new Vector3(-0.0, -1.5, 0.0);
  rigid[0].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[0].vSize = new Vector3(1.0, 1.0, 1.0);
  rigid[0].eps1 = 0.2;
  rigid[0].eps2 = 1.0;

  rigid[1].kind = "SPHERE";;
  //rigid[1].kind = "CUBE";
  rigid[1].diffuse = [0.8, 0.8, 0.7, 1.0];
  rigid[1].ambient = [0.5, 0.5, 0.4, 1.0];
  rigid[1].specular = [0.5, 0.5, 0.5, 1.0];
  rigid[1].shininess = 100.0;  
  rigid[1].vPos = new Vector3(0.0, 0.0, 0.0);
  rigid[1].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[1].vSize = new Vector3(1.0, 1.0, 1.0);
  
  rigid[2].kind = "TORUS";
  rigid[2].diffuse = [0.9, 0.6, 0.6, 1.0];
  rigid[2].ambient = [0.6, 0.4, 0.4, 1.0];
  rigid[2].specular = [0.5, 0.5, 0.5, 1.0];
  rigid[2].shininess = 100.0; 
  rigid[2].vPos = new Vector3(0.0, 1.5, 0.0);
  rigid[2].vEuler = new Vector3(90.0, 0.0, 0.0);
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
  form2.nRatio.value = nRatio;
  form2.transparency.value = transparency;
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
  //光源の位置・色をシェーダへアップロード
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightPosLoc, light.pos);
  gl.uniform4fv(lightColLoc, light.color);
  //カメラ位置をシェーダへアップロード 
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);
  
  //比屈折率
  var reflectLoc = gl.getUniformLocation(gl.program, 'u_nRatio');
  gl.uniform1f(reflectLoc, nRatio);

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
    var xx = rigid[selectNo].vPos.x;
    var yy = rigid[selectNo].vPos.y;
    var zz = rigid[selectNo].vPos.z;
    var cx = target[i].cnt[0];
    var cy = target[i].cnt[1];
    var cz = target[i].cnt[2];
    vpMatrix.lookAt(xx, yy, zz, xx + cx, yy + cy, zz + cz, target[i].up[0], target[i].up[1],target[i].up[2]);

    gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);
    
    for(var k = 0; k < numObject; k++) 
    {
      if(k == selectNo) continue;
      n = rigid[k].initVertexBuffers(gl);
      rigid[k].draw(gl, n);
    }
    dog.draw(gl);

    n = floor0.initVertexBuffers(gl);
    floor0.draw(gl, n);
    drawShadow()
    gl.copyTexSubImage2D(target[i].name, 0, 0, 0, target[i].pos[0], target[i].pos[1], TEX_WIDTH, TEX_HEIGHT);
  }
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}

function drawScene()
{
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

  for(var i = 0; i < numObject; i++) 
  {
    if(i == selectNo) continue;
    else
    {
      gl.uniform1i(cubemapLoc, false);
  　  rigid[i].diffuse[3] = 1.0;
      rigid[i].ambient[3] = 1.0;
      n = rigid[i].initVertexBuffers(gl); 
      rigid[i].draw(gl, n);
    }
  }
  gl.uniform1i(cubemapLoc, false);
  dog.draw(gl);

  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  
  drawShadow(); 
  drawTransparency(cubemapLoc);//透明物体の表示
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}

function drawTransparency(cubemapLoc)
{
  //透明物体
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  for(var i = 0; i < numObject; i++)
  {
    //selectNoのオブジェクトを透明体とする
    if(i !== selectNo) continue;
    gl.uniform1i(cubemapLoc, true);
  　rigid[i].diffuse[3] = 1.0 - transparency;
    rigid[i].ambient[3] = 1.0 - transparency;
    n = rigid[i].initVertexBuffers(gl);
    rigid[i].draw(gl, n);
  }
  gl.disable(gl.BLEND);
  gl.depthMask(true);
}

function drawShadow()
{
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA_SATURATE, gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  for(var i = 0; i < numObject; i++) 
  {
    rigid[i].shadow = shadow_value;
    n = rigid[i].initVertexBuffers(gl);
    rigid[i].draw(gl, n);
    rigid[i].shadow = 0;//描画後は元に戻す
  }
  dog.shadow = shadow_value;
  dog.draw(gl);
  dog.shadow = 0.0;
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
  mouseOperation(canvas, camera);//kwgSupport.js
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
function onChangeLight()
{
  var radioL =  document.getElementsByName("radioL");
  if(radioL[0].checked) light.pos[3] = 1;
  else light.pos[3] = 0;
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
  init();
  dog.height = dog.height0;
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

