
var gl, canvas, camera, light;
var selectNo = 0;
var rigid = [];
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 45.0;//1秒間の回転角度
var flagStart = false;
//CubeMap
var texCube;
var mode = 0;//合成モード(0:変調，1:混合）
var reflectivity = 0.5;

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

  numObject = 3;//kwgSupport.js

  for(var i = 0; i < numObject; i++) rigid[i] = new Rigid();//Rigidクラス（rigid.js)
  m_rigid = new Rigid();//マウス操作用
  m_rigid = rigid[selectNo];

  init();

  readyTexture(); 
  
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

//------------------------------------------------------------------------
function readyTexture() 
{
  function CubeMapImage()
  {
    this.data = new Image();
    this.flagLoaded = false;
  }
  var cmImage = [];
  //CubeMapImageインスタンスを作成する
  for(var i = 0; i < 6; i++) cmImage[i] = new CubeMapImage();
  cmImage[0].data.src = '../imageJPEG/roomPX.jpg';
  cmImage[1].data.src = '../imageJPEG/roomNX.jpg';
  cmImage[2].data.src = '../imageJPEG/roomPY.jpg';
  cmImage[3].data.src = '../imageJPEG/roomNY.jpg';
  cmImage[4].data.src = '../imageJPEG/roomPZ.jpg';
  cmImage[5].data.src = '../imageJPEG/roomNZ.jpg';
  
  // 画像の読み込み完了時のイベントハンドラを設定する
  cmImage[0].data.onload = function() { loadTexture(0);}
  cmImage[1].data.onload = function() { loadTexture(1);}
  cmImage[2].data.onload = function() { loadTexture(2);}
  cmImage[3].data.onload = function() { loadTexture(3);}
  cmImage[4].data.onload = function() { loadTexture(4);}
  cmImage[5].data.onload = function() { loadTexture(5);}
 
  function loadTexture(i)
 {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);// 画像の上下を反転する
    cmImage[i].flagLoaded = true; 
    //すべてloadしたときsetCubeMap()へ
    if(cmImage[0].flagLoaded && cmImage[1].flagLoaded && cmImage[2].flagLoaded 
       && cmImage[3].flagLoaded && cmImage[4].flagLoaded && cmImage[5].flagLoaded) setCubeMap();
  }   
  
  function setCubeMap()
  {   
    //テクスチャオブジェクトを作成する
    texCube = gl.createTexture();   
      
    var cTarget = [];//キューブマップ用ターゲット配列
    cTarget[0] = gl.TEXTURE_CUBE_MAP_POSITIVE_X;
    cTarget[1] = gl.TEXTURE_CUBE_MAP_NEGATIVE_X;
    cTarget[2] = gl.TEXTURE_CUBE_MAP_POSITIVE_Y;
    cTarget[3] = gl.TEXTURE_CUBE_MAP_NEGATIVE_Y;
    cTarget[4] = gl.TEXTURE_CUBE_MAP_POSITIVE_Z;
    cTarget[5] = gl.TEXTURE_CUBE_MAP_NEGATIVE_Z;

    // テクスチャオブジェクトをターゲットにバインドする
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texCube);
    // テクスチャ画像を設定する
    for(var i = 0; i < 6; i++) gl.texImage2D(cTarget[i], 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cmImage[i].data);

    //ミップマップ自動生成
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    // テクスチャパラメータを設定する
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

    display();
  }
}
//----------------------------------------------------
function init()
{
  light = new Light();
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
 
  camera = new Camera(); 
  camera.getPos();

  // Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.6, 0.6, 0.7, 1.0);
  gl.enable(gl.DEPTH_TEST);

  //オブジェクトの初期状態
  rigid[0].kind = "SPHERE";//"CUBE";//
  //rigid[0].kind = "SUPER";
  rigid[0].diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid[0].ambient = [0.0, 0.4, 0.4, 1.0];
  rigid[0].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[0].shininess = 100.0; 
  rigid[0].vPos = new Vector3(0.0, -1.0, 0.0); 
  rigid[0].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[0].vSize = new Vector3(1.0, 1.0, 1.0); 
  rigid[0].flagTexture = true;
  rigid[0].eps1 = 0.5;
  rigid[0].eps2 = 0.5;
 
  rigid[1].kind = "TORUS";//
//  rigid[1].kind = "CYLINDER";//
//  rigid[1].kind = "CUBE";//
  rigid[1].diffuse = [0.6, 0.8, 0.6, 1.0];
  rigid[1].ambient = [0.3, 0.4, 0.3, 1.0];
  rigid[1].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[1].shininess = 100.0;  
  rigid[1].vPos = new Vector3(0.0, 1.0, 0.0); 
  rigid[1].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[1].vSize = new Vector3(1.0, 1.0, 1.0); 

  //背景画像（環境マップを貼り付ける）
  rigid[2].kind = "SPHERE";//"CUBE";//
  rigid[2].diffuse = [0.9, 0.9, 0.9, 1.0];
  rigid[2].ambient = [0.1, 0.1, 0.1, 1.0];
  rigid[2].specular = [0.0, 0.0, 0.0, 1.0];
  rigid[2].shininess = 0.0;  
  rigid[2].vPos = new Vector3(0.0, 0.0, 0.0); 
  rigid[2].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[2].vSize = new Vector3(350.0, 350.0, 350.0); 

  form2.reflectivity.value = reflectivity;
  mouseOperation(canvas, camera);//kwgSupport.js

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
 
  //合成モード
  var modeLoc = gl.getUniformLocation(gl.program, 'u_mode');
  gl.uniform1i(modeLoc, mode);
  //反射率
  var reflectLoc = gl.getUniformLocation(gl.program, 'u_reflectivity');
  gl.uniform1f(reflectLoc, reflectivity);
 
  //ビュー投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera.fovy, canvas.width/canvas.height, camera.near, camera.far);
  if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

  m_rigid = rigid[selectNo];
  
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
 
}

function drawScene()
{
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texCube);

  gl.activeTexture(gl.TEXTURE0);
  var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
  gl.uniform1i(samplerLoc, 0);
  
  var reverseLoc = gl.getUniformLocation(gl.program, 'u_reverseN');
  
  var i, n;
  for(i = 0; i < numObject; i++)
  {
    if(i < 2) gl.uniform1f(reverseLoc,  1.0);
    else      gl.uniform1f(reverseLoc, -1.0);
    n = rigid[i].initVertexBuffers(gl);
    rigid[i].draw(gl, n);
  }  
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
  

