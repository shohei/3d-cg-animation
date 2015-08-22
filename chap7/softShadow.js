
var gl, canvas, camera, light;
var selectNo = 0;
var rigid = [];
var floor0 = new Rigid();//フロア用
var plane = [0.0, 0.0, 1.0, 1.0];//床平面(z = -1)
var shadow_value = 0.5;
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 45.0;//1秒間の回転角度
var flagStart = false;
var light;
//shadow map
var OS_WIDTH  = 1024;
var OS_HEIGHT = 1024;
var fbObj;
var vpMatrixS;// = new Matrix4();
var fovy_shadow = 50.0;
var shadowProgram, normalProgram;
var dis = 0.0;//サンプリング変位

function webMain() 
{
  // Canvas要素を取得する
  canvas = document.getElementById('WebGL');

  //コンテキストを取得する
  gl = WebGLUtils.setupWebGL(canvas);
  
  var VS_SOURCE_S = document.getElementById("vs_S").textContent;
  var FS_SOURCE_S = document.getElementById("fs_S").textContent;
  initGlsl(gl, VS_SOURCE_S, FS_SOURCE_S); 
  shadowProgram = gl.program;//シャドウマップ作成時のプログラムオブジェクト
  
  
  var VS_SOURCE_N = document.getElementById("vs_N").textContent;
  var FS_SOURCE_N = document.getElementById("fs_N").textContent;
  initGlsl(gl, VS_SOURCE_N, FS_SOURCE_N); 
  normalProgram = gl.program;//通常描画時のプログラムオブジェクト

  numObject = 2;//numObjectはkwgSupport.jsで定義
  
  for(var i = 0; i < numObject; i++) rigid[i] = new Rigid();//Rigidクラス（kwgRigid.js)
  m_rigid = new Rigid();//マウス操作用
  m_rigid = rigid[selectNo];
 
  init();
  
  initFramebuffer();
  
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
      form1.fps.value = 2.0 * fps.toString(); //0.5秒間隔で表示
      fps = 0;
      elapseTime = 0.0;
    }
    lastTime = currentTime;　
    
    if(flagStart)
    {
      makeShadowMap();
      
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
  form2.lightX.value = light.pos[0] = 5.0;
  form2.lightY.value = light.pos[1] = 3.0;
  form2.lightZ.value = light.pos[2] = 10.0;
 
  //カメラ
  camera = new Camera();//左側canvasのカメラ 
  camera.dist = 8.0;
  camera.getPos();

  rigid[0].kind = "CUBE";
  //rigid[0].kind = "CYLINDER";
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

  //フロア
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]);
  floor0.vSize = new Vector3(20, 20, 20);
  floor0.specular = [0.2, 0.2, 0.2, 1.0];
  floor0.shininess = 50;
  floor0.flagCheck = true;
  floor0.nSlice = 20;
  floor0.nStack = 20;

  form2.shadow.value = shadow_value;
  mouseOperation(canvas, camera);//kwgSupport.js
}

function initFramebuffer() 
{
  var texObj, rbObj;

  // フレームバッファ・オブジェクトを作成する
  fbObj = gl.createFramebuffer();
  //ターゲットにバインドする
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbObj);
  // テクスチャ・オブジェクトを作成する
  texObj = gl.createTexture(); 
  // テクスチャ・オブジェクトをターゲットにバインド
  gl.bindTexture(gl.TEXTURE_2D, texObj); 
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OS_WIDTH, OS_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  fbObj.texture = texObj; // texObjをfbObjのプロパティとして格納しておく

  // レンダーバッファオブジェクトを作成する
  rbObj = gl.createRenderbuffer(); 
  gl.bindRenderbuffer(gl.RENDERBUFFER, rbObj);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OS_WIDTH, OS_HEIGHT);

  // FBOにテクスチャとレンダーバッファオブジェクトをアタッチする
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texObj, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rbObj);

  // バインドを解除する
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
}
//---------------------------------------------
function display()
{  
 
  makeShadowMap();
 
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

function makeShadowMap()
{
  gl.program = shadowProgram;
  gl.useProgram(shadowProgram);
  //隠面消去機能を有効にする
  gl.enable(gl.DEPTH_TEST);

  //シャドウマップ用のビュー投影行列
  vpMatrixS = new Matrix4();
  vpMatrixS.perspective(fovy_shadow, OS_WIDTH/OS_HEIGHT, 1.0, 100.0);
  vpMatrixS.lookAt(light.pos[0], light.pos[1], light.pos[2], 0.0, 0.0, 0.0, 1.0, 0.0, 0.0);
  //シャドウマップ用のビュー投影行列をシェーダへ
  var vpMatrixSLoc = gl.getUniformLocation(gl.program, 'u_vpMatrixS');
  gl.uniformMatrix4fv(vpMatrixSLoc, false, vpMatrixS.elements);
  //フレームバッファ・オブジェクトに描きこむ
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbObj);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clearDepth(1.0);
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, OS_WIDTH, OS_HEIGHT);

  var n = rigid[0].initVertexBuffers(gl);
  rigid[0].draw(gl, n);
  n = rigid[1].initVertexBuffers(gl);
  rigid[1].draw(gl, n);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);//通常のカラーバッファへ戻す
  gl.useProgram(null);

}

function drawScene()
{
  gl.program = normalProgram;
  gl.useProgram(normalProgram);
  
  //光源位置・色をシェーダへアップロード
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightPosLoc, light.pos);
  gl.uniform4fv(lightColLoc, light.color);
  //カメラ位置をシェーダへアップロード 
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);
  //サンプリング変位を追加
  var disLoc = gl.getUniformLocation(gl.program, 'u_dis');
  gl.uniform1f(disLoc, dis);
  
  
  //ビュー投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera.fovy, canvas.width/canvas.height, camera.near, camera.far);
  if(Math.cos(Math.PI * camera.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera.pos[0], camera.pos[1], camera.pos[2], camera.cnt[0], camera.cnt[1], camera.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);
  //シャドウマップ用のビュー投影行列をシェーダへ(makeShadowmap()で作成)
  var vpMatrixSLoc = gl.getUniformLocation(gl.program, 'u_vpMatrixS');
  gl.uniformMatrix4fv(vpMatrixSLoc, false, vpMatrixS.elements);

  //隠面消去機能を有効にする
  gl.enable(gl.DEPTH_TEST);
  
　//通常の描画
  gl.clearColor(0.0, 0.0, 0.3, 1.0);
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fbObj.texture);
  var samplerLoc = gl.getUniformLocation(gl.program, "u_shadowMap");
  gl.uniform1i(samplerLoc, 0);//gl.TEXTURE0を適用
  var shadow0Loc = gl.getUniformLocation(gl.program, 'u_shadow0');
  gl.uniform1f(shadow0Loc, shadow_value);

  var n = rigid[0].initVertexBuffers(gl);
  rigid[0].draw(gl, n);
  n = rigid[1].initVertexBuffers(gl);
  rigid[1].draw(gl, n);
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
   
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.useProgram(null);
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

function onClickShadow()
{
  shadow_value = parseFloat(form2.shadow.value);
  display();
}

function onClickFovyShadow()
{
  fovy_shadow = parseFloat(form2.fovyShadow.value);
  display();
}

function onClickDisplacement()
{
  dis = parseFloat(form2.displacement.value);
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
  

