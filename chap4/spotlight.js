
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera, light;
var selectNo = 0;
var rigid = [];
var floor0;//フロアオブジェクト
var light0; //スポットライト光源を発光体のように表示
var spotlight;//spotlightから出る光の広がりを表すオブジェクト
//var transparency = 0.8;//その透明度
var plane = [0.0, 0.0, 1.0, 0.0];//床平面(z = 0)
var shadow_value = 0.7;
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var angleStep = 45.0;//1秒間の回転角度
var flagStart = false;

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
  floor0 = new Rigid();
  light0 = new Rigid();
  spotlight = new Rigid();//光を透明体で表示するときのRigidクラスのオブジェクト

  init();
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
      // カラーバッファとデプスバッファをクリアする
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      for(i = 0; i < numObject; i++) 
      {
        //rigid[i].shadow = 0.0;
        n = rigid[i].initVertexBuffers(gl);
        rigid[i].draw(gl, n);
      }
      rigid[selectNo].vEuler.x += angleStep * frameTime;//回転角を更新
      form2.rotateX.value = rigid[selectNo].vEuler.x;//現在の位置を表示
      n = floor0.initVertexBuffers(gl);
      floor0.draw(gl, n);
    
      drawShadow();//影   
      drawLight(); //光源  
    }      
  }
  animeStart();
}

function init()
{
  light = new Light();
  light.color = [1.0, 0.8, 0.2, 1.0];
  light.pos = [0.0, 0.0, 5.0, 1.0];
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
  form2.spotX.value = light.spotCnt[0];
  form2.spotY.value = light.spotCnt[1];
  //form2.spotZ.value = light.spotCnt[2];
  form2.cutoff.value = light.spotCutoff;
  form2.exponent.value = light.spotExponent;
  
 
  camera = new Camera();
  camera.theta = 30; 
  camera.cnt = [0.0, 0.0, 2.0];
  camera.getPos();

  // Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  //透明物体の背面を消去
  gl.cullFace(gl.BACK);
  gl.enable(gl.CULL_FACE);

  //オブジェクトの初期状態
  rigid[0].kind = "CUBE";
  rigid[0].diffuse = [0.0, 0.6, 0.6, 1.0];
  rigid[0].ambient = [0.0, 0.4, 0.4, 1.0];
  rigid[0].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[0].shininess = 100.0; 
  rigid[0].vPos = new Vector3(0.0, -1.5, 1.0); 
  rigid[0].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[0].vSize = new Vector3(1.0, 1.0, 1.0); 
  
  rigid[1].kind = "TORUS";
  rigid[1].diffuse = [0.9, 0.2, 0.2, 1.0];
  rigid[1].ambient = [0.5, 0.1, 0.1, 1.0];
  rigid[1].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[1].shininess = 100.0;  
  rigid[1].vPos = new Vector3(0.0, 1.5, 1.0); 
  rigid[1].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[1].vSize = new Vector3(1.0, 1.0, 1.0); 
  rigid[1].nSlice = 20;
  rigid[1].nStack = 20;
  
  //フロアの初期設定
  floor0.kind = "CHECK_PLATE";
  floor0.vPos = new Vector3(0.0, 0.0, -plane[3]-0.01);
  floor0.vSize = new Vector3(20, 20, 20);
  floor0.nSlice = 20;//x方向分割数
  floor0.nStack = 20;//y方向分割数
  floor0.col1 = [0.6, 0.5, 0.3, 1.0];
  floor0.col2 = [0.3, 0.4, 0.6, 1.0];
  floor0.specular = [0.1, 0.1, 0.1, 1.0];
  floor0.shininess = 50;
  floor0.flagCheck = true;

  //光源オブジェクト
  light0.kind = "SPHERE";
  light0.diffuse = [1, 1, 1, 1];
  light0.ambient = [1, 1, 1, 1];
  light0.vSize = new Vector3(0.2, 0.2, 0.2);
  //spotlight光透明体
  spotlight.kind = "CYLINDER";
  spotlight.specular = [1, 1, 1, 1];
  spotlight.shininess = 10.0; 
  spotlight.radiusRatio = 0.0;
  
  form2.shadow.value = shadow_value;
  
  //選択オブジェクトの位置・角度・スケールをフォームに表示
  form2.translateX.value = rigid[selectNo].vPos.x;//現在の位置を表示
  form2.translateY.value = rigid[selectNo].vPos.y;
  form2.translateZ.value = rigid[selectNo].vPos.z;
  form2.rotateX.value = rigid[selectNo].vEuler.x;//現在の角度を表示
  form2.rotateY.value = rigid[selectNo].vEuler.y;
  form2.rotateZ.value = rigid[selectNo].vEuler.z;
  mouseOperation(canvas, camera);//support.js

}

//---------------------------------------------
function display()
{  
  //光源の位置・色をシェーダへアップロード
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightPosLoc, light.pos);
  gl.uniform4fv(lightColLoc, light.color);
  var spotCntLoc = gl.getUniformLocation(gl.program, 'u_spotCnt');
  gl.uniform3fv(spotCntLoc, light.spotCnt);
  var spotCutLoc = gl.getUniformLocation(gl.program, 'u_cutoff');
  gl.uniform1f(spotCutLoc, light.spotCutoff);
  var spotExpLoc = gl.getUniformLocation(gl.program, 'u_exponent');
  gl.uniform1f(spotExpLoc, light.spotExponent);
 
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

  var vpMatrixLoc = gl.getUniformLocation(gl.program, 'u_vpMatrix');
  gl.uniformMatrix4fv(vpMatrixLoc, false, vpMatrix.elements);

  m_rigid = rigid[selectNo];

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
  drawLight();
  var radio1 =  document.getElementsByName("radio1");
  radio1[selectNo].checked = true;
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
  }
  gl.disable(gl.BLEND);
  gl.depthMask(true);

}

function drawLight()
{ 
  var vLightPos = new Vector3(light.pos[0], light.pos[1], light.pos[2]);//光源位置
  var vLightCnt = new Vector3(light.spotCnt[0], light.spotCnt[1], light.spotCnt[2]);//スポット中心
  var vLightDir = v3_sub(vLightCnt, vLightPos);
  vLightDir.v3_norm();

  //光源オブジェクト
  light0.vPos = v3_add(vLightPos, v3_mul(0.4, vLightDir));
  var n = light0.initVertexBuffers(gl);
  light0.draw(gl, n);

  //スポットライトの広がりを表すオブジェクト
  var h =1.0;//spotlightオブジェクトの高さ   
  var r = h * Math.tan(light.spotCutoff * DEG_TO_RAD);//その底辺の半径
  spotlight.vSize = new Vector3(2*r, 2*r, h);
  spotlight.vPos = v3_add(vLightPos, v3_mul(h/2 + 0.3, vLightDir));
  spotlight.vEuler = v3_getEulerZ(vLightCnt, vLightPos);
  spotlight.diffuse = light.color;
  spotlight.ambient = light.color;
  n = spotlight.initVertexBuffers(gl);
  spotlight.draw(gl, n);
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
function onClickSpot()
{
  light.spotCnt[0] = parseFloat(form2.spotX.value);
  light.spotCnt[1] = parseFloat(form2.spotY.value);
  //light.spotCnt[2] = parseFloat(form2.spotZ.value);
  display();
}

function onClickCutoff()
{
  light.spotCutoff = parseFloat(form2.cutoff.value);
  display();
}

function onClickExponent()
{
  light.spotExponent = parseFloat(form2.exponent.value);
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
  //init();
//  light.color = [1.0, 0.8, 0.2, 1.0];
  display();
}
function onClickStop()
{
  flagStart = false;
  dsplay();
}
  

