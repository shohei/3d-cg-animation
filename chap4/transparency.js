
var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var camera, light;
var selectNo = 0;
var rigid = [];
var numObject = 2;
var floor0;
var plane = [0.0, 0.0, 1.0, 2.0];//床平面(z = -2)
var shadow_value = 0.3;
var transparency = 0.5;
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

  for(var i = 0; i < numObject; i++) rigid[i] = new Rigid();//Rigidクラス（rigid.js)
  m_rigid = new Rigid();//マウス操作用
  m_rigid = rigid[selectNo];
  floor0 = new Rigid();

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
        if(i === selectNo) continue;//selectNoのオブジェクトは透明体
        n = rigid[i].initVertexBuffers(gl);
        rigid[i].draw(gl, n);
      }
      rigid[selectNo].vEuler.x += angleStep * frameTime;//回転角を更新
      form2.rotateX.value = rigid[selectNo].vEuler.x;//現在の位置を表示
      n = floor0.initVertexBuffers(gl);
      floor0.draw(gl, n);
     
      //影の表示  
      drawShadow();
  　　//透明物体の表示
  　　drawTransparency();
    }      
  }
  animeStart();
}

function init()
{
  light = new Light();
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
 
  camera = new Camera(); 
  camera.getPos();

  // Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  //透明物体の背面を消去
  gl.cullFace(gl.BACK);
  gl.enable(gl.CULL_FACE);

  //オブジェクトの初期状態
  rigid[0].kind = "CUBE";
  rigid[0].diffuse = [0.0, 0.4, 0.4, 1.0];
  rigid[0].ambient = [0.0, 0.4, 0.4, 1.0];
  rigid[0].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[0].shininess = 100.0; 
  rigid[0].vPos = new Vector3(1.0, 0.0, 0.0); 
  rigid[0].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[0].vSize = new Vector3(1.0, 1.0, 1.0); 
  
  rigid[1].kind = "TORUS";
  rigid[1].diffuse = [0.6, 0.2, 0.2, 1.0];
  rigid[1].ambient = [0.5, 0.1, 0.1, 1.0];
  rigid[1].specular = [0.8, 0.8, 0.8, 1.0];
  rigid[1].shininess = 100.0;  
  rigid[1].vPos = new Vector3(-1.0, 0.0, 0.0); 
  rigid[1].vEuler = new Vector3(0.0, 0.0, 0.0);
  rigid[1].vSize = new Vector3(1.0, 1.0, 1.0); 
  rigid[1].nSlice = 10;
  rigid[1].nStack = 10;
 
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
  form2.transparency.value = transparency;
  
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
    if(i === selectNo) continue;//selectNoのオブジェクトは透明体
  　rigid[i].diffuse[3] = 1.0;
    rigid[i].ambient[3] = 1.0;
    n = rigid[i].initVertexBuffers(gl);
    rigid[i].draw(gl, n);
  }
 
  n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);

  //影の表示
  drawShadow();
  //透明物体の表示
  drawTransparency();
  
  var radio1 =  document.getElementsByName("radio1");
  radio1[selectNo].checked = true;
}
function drawShadow()
{
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA_SATURATE, gl.ONE_MINUS_SRC_ALPHA);
//  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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

function drawTransparency()
{
  //透明物体
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);

  for(var i = 0; i < numObject; i++)
  {
    //selectNoのオブジェクトを透明体とする
    if(i !== selectNo) continue;
  　rigid[i].diffuse[3] = 1.0 - transparency;
    rigid[i].ambient[3] = 1.0 - transparency;
    n = rigid[i].initVertexBuffers(gl);
    rigid[i].draw(gl, n);
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
function onClickTransparency()
{
  transparency = parseFloat(form2.transparency.value);
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
  dsplay();
}
  

