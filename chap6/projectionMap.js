
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera, light;
var selectNo = 0;
var rigid = [];
//var dummy = new Rigid();
var floor0 = new Rigid();
var plane = [0.0, 0.0, 1.0, 2.0];//床平面(z = -2)
var shadow_value = 0.3;
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 45.0;//1秒間の回転角度
var flagStart = false;
//投影マッピング
var fovy_proj = 30;
var center_proj = 0;//真上（z軸上）
var wrap_mode = 0;//REPEAT
var tex_angle = 0;//テクスチャの回転角度
var flagTexRotation = false;

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

  numObject = 2;//kwgSupport.js

  for(var i = 0; i < numObject; i++) rigid[i] = new Rigid();//Rigidクラス（rigid.js)
  m_rigid = new Rigid();//マウス操作用
  m_rigid = rigid[selectNo];

  init();
  
  readyTexture();
  
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
      drawScene();
           
      rigid[selectNo].vEuler.x += angleStep * frameTime;//回転角を更新
      form2.rotateX.value = rigid[selectNo].vEuler.x;//現在の角度を表示     
    }
       
    if(flagTexRotation)
    {
      tex_angle += angleStep*frameTime;
      projectTexture();
   
      drawScene();
    }   
  }
  animeStart();
}

//------------------------------------------------------------------------
function readyTexture() 
{
  var tex = gl.createTexture();   // テクスチャオブジェクトを作成する

  var image = new Image();  // 画像オブジェクトを作成する
  image.src = '../imageJPEG/tiger.jpg';
  
  // 画像の読み込み完了時のイベントハンドラを設定する
  image.onload = function(){ setTexture(tex, image); };
}

function setTexture(tex, image) 
{
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // 画像のY軸を反転する
  // テクスチャユニット0を有効にする
  gl.activeTexture(gl.TEXTURE0);
  // テクスチャオブジェクトをターゲットにバインドする
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // テクスチャ画像を設定する
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

  // テクスチャパラメータを設定する
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  
  // u_samplerの格納場所を取得する
  var samplerLoc = gl.getUniformLocation(gl.program, 'u_sampler');
  // サンプラにテクスチャユニット0を設定する
  gl.uniform1i(samplerLoc, 0);
    
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);// Canvasをクリアする
  
  var n = rigid[0].initVertexBuffers(gl);
  rigid[0].draw(gl, n);
  //このタイミングで他のオブジェクトも表示
  n = rigid[1].initVertexBuffers(gl);
  rigid[1].draw(gl, n);
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  drawShadow();
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
  gl.clearColor(0.6, 0.5, 0.4, 1.0);
  gl.enable(gl.DEPTH_TEST);

  //オブジェクトの初期状態
//  rigid[0].kind = "TORUS";//"SPHERE";
  rigid[0].kind = "CUBE";//
//  rigid[0].kind = "CYLINDER";
  rigid[0].diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid[0].ambient = [0.0, 0.4, 0.4, 1.0];
  rigid[0].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[0].shininess = 100.0; 
  rigid[0].vPos = new Vector3(0.0, -1.0, 0.0); 
  rigid[0].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[0].vSize = new Vector3(1.0, 1.0, 1.0); 
  
  rigid[1].kind = "TORUS";//
  //rigid[1].kind = "SPHERE";//
  //rigid[1].kind = "CYLINDER";//
  rigid[1].diffuse = [0.6, 0.4, 0.4, 1.0];
  rigid[1].ambient = [0.3, 0.2, 0.2, 1.0];
  rigid[1].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[1].shininess = 100.0;  
  rigid[1].vPos = new Vector3(0.0, 1.0, 0.0); 
  rigid[1].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[1].vSize = new Vector3(1.0, 1.0, 1.0); 

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

  projectTexture();
   
  //通常のビュー投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera.fovy, canvas.width/canvas.height, camera.near, camera.far);
  if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);
  //ビュー投影行列をシェーダへ
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

function projectTexture()
{
  //テクスチャのビュー投影行列
  var texVpMatrix = new Matrix4();
  texVpMatrix.translate(0.5, 0.5, 0.0);
  texVpMatrix.rotate(tex_angle, 0, 0, 1);
  texVpMatrix.perspective(fovy_proj, 1, 0.1, 100);
  if(center_proj == 0) texVpMatrix.lookAt(0.0, 0.0, 10.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0);//真上
  else if(center_proj == 1) texVpMatrix.lookAt(10.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0);//正のｘ軸上
  else if(center_proj == 2) texVpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else texVpMatrix.lookAt(light.pos[0], light.pos[1], light.pos[2], 0.0, 0.0, 0.0, -1.0, 0.0, 0.0);
  //テクスチャのビュー投影行列をシェーダへ
  var texVpMatrixLoc = gl.getUniformLocation(gl.program, 'u_texVpMatrix');
  gl.uniformMatrix4fv(texVpMatrixLoc, false, texVpMatrix.elements);
}

function drawScene()
{
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  var i, n;

  for(i = 0; i < numObject; i++)
  {
    n = rigid[i].initVertexBuffers(gl);
    rigid[i].draw(gl, n);
  }
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
  for(var i = 0; i < numObject; i++) 
  {
    rigid[i].shadow = shadow_value;
    n = rigid[i].initVertexBuffers(gl);
    rigid[i].draw(gl, n);
    rigid[i].shadow = 0;//描画後は元に戻す
//  　n = dummy.initVertexBuffers(gl);//ダミー
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
function onClickFovyProj()
{
  fovy_proj = parseFloat(form2.fovyProj.value);
  display();
}

function onChangeCntProj()
{
  var radioP =  document.getElementsByName("radioP");
  for(var i = 0; i < radioP.length; i++)
  {
     if(radioP[i].checked) center_proj = i;
  }
  display();
}

function onChangeWrapMode()
{
  var radioR =  document.getElementsByName("radioR");
  for(var i = 0; i < radioR.length; i++)
  {
     if(radioR[i].checked) wrap_mode = i;
  }
  //テクスチャのラップモード
  if(wrap_mode == 0)
  {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }
  else if(wrap_mode == 1)
  {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  }
  else
  {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  display();
}

function onChangeTexRotation()
{
  if(form2.texRotation.checked) flagTexRotation = true;
  else                          flagTexRotation = false;
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
  selectNo = 0;
  init();
  display();
}
  

