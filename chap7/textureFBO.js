var gl_L, gl_R;//WebGL描画用のコンテキスト
var canvasL, canvasR;//canvas要素
var cameraL, cameraR;//左右カメラ
var light;           //光源は共通
var selectNo = 0;
var rigid = [];
var floor0 = new Rigid();//フロア用
var dummy = new Rigid();
var plane = [0.0, 0.0, 1.0, 2.0];//床平面(z = -2)
var shadow_value = 0.3;
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 45.0;//1秒間の回転角度
var flagStart = false;
var light;
//off screen rendering
var OS_WIDTH = 256;
var OS_HEIGHT = 256;
var fbObj;//フレームバッファ・オブジェクト

function webMain()
{
  //Canvas要素を取得する
  canvasL = document.getElementById('WebGL_Left');
  canvasR = document.getElementById('WebGL_Right');

  //WebGL描画用のコンテキストを取得する
  gl_L = WebGLUtils.setupWebGL(canvasL);//左側(texture作成側）
  gl_R = WebGLUtils.setupWebGL(canvasR);//右側(FBO側)
  //シェーダ・プログラムのソースを読み込む
  var VS_SOURCE = document.getElementById("vs").textContent;
  var FS_SOURCE = document.getElementById("fs").textContent;
  //シェーダを初期化する
  initGlsl(gl_L, VS_SOURCE, FS_SOURCE);
  initGlsl(gl_R, VS_SOURCE, FS_SOURCE);//shaderのソースは同じ

  numObject = 4;//numObjectはkwgSupport.jsで定義
  //実際は3個であるが，見かけの個数は4個にする(マウス操作を正常にするため)
  
  //0,1は左側キャンバス，2は右側キャンバス
  for(var i = 0; i < numObject; i++) rigid[i] = new Rigid();//Rigidクラス（kwgRigid.js)
  m_rigid = new Rigid();//マウス操作用
  m_rigid = rigid[selectNo];
 
  init();
  
  initFramebuffer(gl_R);
  
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
      uploadToShader(gl_L, canvasL, cameraL);
      drawSceneLeft(gl_L);
      makeTexture(gl_R, cameraL);
      uploadToShader(gl_R, canvasR, cameraR);
      drawSceneRight(gl_R);
     
      if(selectNo < 2) rigid[selectNo].vEuler.x += angleStep * frameTime;//回転角を更新
      //右側はｙ軸回転
      else if(selectNo == 2) rigid[selectNo].vEuler.y += angleStep * frameTime;//回転角を更新
      else //for all
      {
        for(var i = 0; i < 2; i++) rigid[i].vEuler.x += angleStep * frameTime;
        rigid[2].vEuler.y += angleStep * frameTime;
      }
  
      form2.rotateX.value = rigid[selectNo].vEuler.x;//現在の角度を表示
      form2.rotateY.value = rigid[selectNo].vEuler.y;//現在の角度を表示
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
  cameraL = new Camera();//左側canvasのカメラ 
  cameraL.dist = 5.0;
  cameraL.getPos();
  cameraR = new Camera();//右側canvasのカメラ 
  cameraR.dist = 5.0;
  //cameraR.phi = 180.0;//負のx軸方向
  cameraR.getPos();

  //隠面消去機能を有効にする
  gl_L.enable(gl_L.DEPTH_TEST);
  gl_R.enable(gl_R.DEPTH_TEST);
  
  //rigid[0].kind = "CUBE";
  rigid[0].kind = "CYLINDER";
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
  
  rigid[2].kind = "CUBE";
  //rigid[2].kind = "CYLINDER";
  rigid[2].diffuse = [0.6, 0.6, 0.6, 1.0];
  rigid[2].ambient = [0.4, 0.4, 0.4, 1.0];
  rigid[2].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[2].shininess = 100.0; 
  rigid[2].vPos = new Vector3(0.0, 0.0, 0.0);
  rigid[2].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[2].vSize = new Vector3(1.0, 1.0, 1.0);
  rigid[2].flagTexture = true;
  
  dummy.kind = "SPHERE";
  dummy.flagTexture = true;
  dummy.nSlice = 30;
  dummy.nStack = 30;

  //フロア
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(20, 20, 20);
  floor0.specular = [0.2, 0.2, 0.2, 1.0];
  floor0.shininess = 50;
  floor0.col1 = [0.6, 0.5, 0.5, 1.0];
  floor0.col2 = [0.4, 0.4, 0.6, 1.0];
  floor0.flagCheck = true;
  floor0.nSlice = 20;
  floor0.nStack = 20;

  form2.shadow.value = shadow_value;
  mouseOperation(canvasL, cameraL);//kwgSupport.js
  mouseOperation(canvasR, cameraR);
}

function initFramebuffer(gl) 
{
  var f_texObj, rbObj;

  // フレームバッファ・オブジェクトを作成する
  fbObj = gl.createFramebuffer();
  //ターゲットにバインドする
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbObj);
  //フレームバッファオブジェクト用テクスチャ・オブジェクトを作成する
  f_texObj = gl.createTexture(); 
  // テクスチャ・オブジェクトをターゲットにバインド
  gl.bindTexture(gl.TEXTURE_2D, f_texObj); 
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OS_WIDTH, OS_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  fbObj.texture = f_texObj; //f_texObjをfbObjのプロパティとして格納しておく(makeTexture()ルーチンで使用)

  //レンダーバッファオブジェクトを作成する
  rbObj = gl.createRenderbuffer(); 
  gl.bindRenderbuffer(gl.RENDERBUFFER, rbObj);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OS_WIDTH, OS_HEIGHT);

  //テクスチャ・オブジェクトとレンダーバッファ・オブジェクトをFBOへアタッチする
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, f_texObj, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rbObj);

  //バインドをすべて解除する
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
}

//---------------------------------------------
function display()
{  
  uploadToShader(gl_L, canvasL, cameraL);
  drawSceneLeft(gl_L);
  makeTexture(gl_R, cameraL);
  uploadToShader(gl_R, canvasR, cameraR);
  drawSceneRight(gl_R);

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

function uploadToShader(gl, canvas0, camera0)
{
  //光源位置・色をシェーダへアップロード
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightPosLoc, light.pos);
  gl.uniform4fv(lightColLoc, light.color);
  //カメラ位置をシェーダへアップロード 
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera0.pos);
  
  //ビュー投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera0.fovy, canvas0.width/canvas0.height, camera0.near, camera0.far);
  if(Math.cos(Math.PI * camera0.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera0.pos[0], camera0.pos[1], camera0.pos[2], camera0.cnt[0], camera0.cnt[1], camera0.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera0.pos[0], camera0.pos[1], camera0.pos[2], camera0.cnt[0], camera0.cnt[1], camera0.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);
}

function makeTexture(gl, camera0)
{//左側のシーンをテクスチャにするためにフレームバッファ・オブジェクトへ描画
  //光源位置・色をシェーダへアップロード
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightPosLoc, light.pos);
  gl.uniform4fv(lightColLoc, light.color);
  //カメラ位置をシェーダへアップロード 
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera0.pos);
  
  //ビュー投影行列を計算する
  var vpMatrix = new Matrix4();// 初期化
  vpMatrix.perspective(camera0.fovy, OS_WIDTH/OS_HEIGHT, camera0.near, camera0.far);
  if(Math.cos(Math.PI * camera0.theta /180.0) >= 0.0)//カメラ仰角90度でﾋﾞｭｰｱｯﾌﾟﾍﾞｸﾄﾙ切替
	  vpMatrix.lookAt(camera0.pos[0], camera0.pos[1], camera0.pos[2], camera0.cnt[0], camera0.cnt[1], camera0.cnt[2], 0.0, 0.0, 1.0);
  else
	  vpMatrix.lookAt(camera0.pos[0], camera0.pos[1], camera0.pos[2], camera0.cnt[0], camera0.cnt[1], camera0.cnt[2], 0.0, 0.0, -1.0);

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);
  
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbObj);//FBO側に描画
  gl.clearColor(0.7, 0.8, 0.8, 1.0);
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, OS_WIDTH, OS_HEIGHT);

  var n = dummy.initVertexBuffers(gl);//ダミー
  n = rigid[0].initVertexBuffers(gl);
  rigid[0].draw(gl, n);
  n = rigid[1].initVertexBuffers(gl);
  rigid[1].draw(gl, n);
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  
  drawShadowLeft(gl)

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);//カラーバッファ描画に戻す
 
}

function drawSceneLeft(gl)
{
  gl.clearColor(0.7, 0.8, 0.8, 1.0);
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvasL.width, canvasL.height);

  var n = rigid[0].initVertexBuffers(gl);
  rigid[0].draw(gl, n);
  n = rigid[1].initVertexBuffers(gl);
  rigid[1].draw(gl, n);
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  
  drawShadowLeft(gl)
}

function drawShadowLeft(gl)
{
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  for(var i = 0; i < 2; i++) 
  {
    rigid[i].shadow = shadow_value;
    n = rigid[i].initVertexBuffers(gl);
    rigid[i].draw(gl, n);
    rigid[i].shadow = 0;//描画後は元に戻す
  }
  gl.disable(gl.BLEND);
  gl.depthMask(true);
}

function drawSceneRight(gl)
{
  //makeTexture()で作成したテクスチャをrigid[2]に描画
  gl.clearColor(0.0, 0.3, 0.5, 1.0);
  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvasR.width, canvasR.height);
  //テクスチャをシェーダへアップロード
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fbObj.texture);
  var samplerLoc = gl.getUniformLocation(gl.program, "u_sampler");
  gl.uniform1i(samplerLoc, 0);//gl.TEXTURE0を適用
  //オブジェクトを描画
  n = rigid[2].initVertexBuffers(gl);
  rigid[2].draw(gl, n);
  var n = dummy.initVertexBuffers(gl);//ダミー
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  
  drawShadowRight(gl)
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function drawShadowRight(gl)
{
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  rigid[2].shadow = shadow_value;
  n = rigid[2].initVertexBuffers(gl);
  rigid[2].draw(gl, n);
  rigid[2].shadow = 0;//描画後は元に戻す
  gl.disable(gl.BLEND);
  gl.depthMask(true);
}

//---------------------------------------------------
//イベント処理
function onClickC_Size()
{
  canvasL.width = form1.c_sizeX.value;
  canvasL.height = form1.c_sizeY.value;
  canvasR.width = form1.c_sizeX.value;
  canvasR.height = form1.c_sizeY.value;
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
  mouseOperation(canvasL, cameraL);//kwgSupport.js
  mouseOperation(canvasR, cameraR);
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
  

