var canvas; //canvas要素
var gl;     //WebGL描画用コンテキスト
var dog = new Dog();//イヌ型ロボットのインスタンス
var floor0 = new Rigid();
var shadow_value = 0.3;
var plane = [0.0, 0.0, 1.0, 0.0];//床平面
var camera, light;
//animation
var fps = 0;
var lastTime = new Date().getTime();
var elapseTime = 0.0;
var flagStart = false;
var frameCount = 0;

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
  m_rigid = dog;
  
  //initDog();
  makeAnimationData();
  
  init();
  display();
  mouseOperation(canvas, camera);//kwgSupport.js

  var animeStart = function()
  {
    var n, k;
  
    //繰り返し呼び出す関数を登録
    requestAnimationFrame(animeStart); //webgl-utilsで定義
    //時間計測
    var currentTime = new Date().getTime();
    var frameTime = (currentTime - lastTime) / 1000.0;//時間刻み[sec]
    elapseTime += frameTime;
    fps ++;
    if(elapseTime >= 0.5)
    {
      fps *= 2;
      form1.fps.value = fps.toString(); //0.5秒間隔で表示
      form1.timestep.value = 1.0/fps;
      fps = 0;
      elapseTime = 0.0;
    }
    lastTime = currentTime;
    　
    if(flagStart)
    {
      // カラーバッファとデプスバッファをクリアする
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      dog.vPos.v3_copy(dog.f_vPos[frameCount]);
	  dog.vEuler.v3_copy(dog.f_vEuler[frameCount]);
      for(k = 0; k < dog.numJoints; k++) 
          dog.vJoints[k].v3_copy(dog.f_vJoints[frameCount*dog.numJoints + k]);

      dog.draw(gl);
            
      form2.translateX.value = dog.vPos.x;//現在の位置を表示
      form2.translateY.value = dog.vPos.y;
      form2.translateZ.value = dog.vPos.z;
      form2.rotateX0.value = dog.vEuler.x;//現在の姿勢角度を表示
      form2.rotateY0.value = dog.vEuler.y;
      form2.rotateZ0.value = dog.vEuler.z;
      //フロア表示
      n = floor0.initVertexBuffers(gl);
      floor0.draw(gl, n);
      drawShadow();//影表示   
      frameCount ++; 
      if(frameCount >= dog.numFrame) flagStart = false;
    }      
  }
  animeStart();
}

function makeAnimationData()
{
  //アニメーション準備
  dog.numFrame = 0;
  frameCount = 0;
  dog.unitTime = 0.02;//タイムステップ
  //あらかじめフレームデータを作成
  dog.walk(2.0, 0.4, 2.0);
  dog.turn(90.0, 1.0);
  dog.swingTail(5, 2);
  dog.walk(2.0, 0.5, 4.0);
  dog.stand(0.3);
  dog.wait(1.0);
  dog.initPose(0.8);
}

function initDog()
{
  //robotの初期設定
  dog.vPos = new Vector3(-1.0, -1.0, 0.0);
  dog.vSize = new Vector3(1.0, 1.0, 1.0);
  dog.vEuler = new Vector3(0.0, 0.0, 0.0);
  for(var i = 0; i < dog.numJoints; i++) dog.vJoints[i] = new Vector3();
}
//--------------------------------------------
function init()
{
  //Canvasをクリアする色を設定し、隠面消去機能を有効にする
  gl.clearColor(0.62, 0.6, 0.6, 1.0);
  gl.enable(gl.DEPTH_TEST);

　//光源インスタンスを作成
  light = new Light();
  //初期設定値をHTMLのフォームに表示
  form2.lightX.value = light.pos[0];
  form2.lightY.value = light.pos[1];
  form2.lightZ.value = light.pos[2];
　//カメラ・インスタンスを作成
  camera = new Camera(); 
  camera.cnt[2] = 2.0;
  camera.getPos();//カメラ位置を計算
  
  initDog();

  //HTMLのフォームをリセット
  form2.scaleX.value = 1.0;
  form2.scaleY.value = 1.0;
  form2.scaleZ.value = 1.0;
  form2.rotateX0.value = 0.0;
  form2.rotateY0.value = 0.0;
  form2.rotateZ0.value = 0.0;
  form2.rotateX1.value = 0.0;
  form2.rotateY1.value = 0.0;
  form2.rotateZ1.value = 0.0;
  form2.translateX.value = dog.vPos.x;
  form2.translateY.value = dog.vPos.y;
  form2.translateZ.value = dog.vPos.z;

  //フロア
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
  //光源
  var lightPosLoc = gl.getUniformLocation(gl.program, 'u_lightPos');
  gl.uniform4fv(lightPosLoc, light.pos);
  var lightColLoc = gl.getUniformLocation(gl.program, 'u_lightColor');
  gl.uniform4fv(lightColLoc, light.color);
  
  var cameraLoc = gl.getUniformLocation(gl.program, 'u_cameraPos');
  gl.uniform3fv(cameraLoc, camera.pos);
  
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

  // カラーバッファとデプスバッファをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);

  dog.draw(gl);

  var n = floor0.initVertexBuffers(gl);
  floor0.draw(gl, n);
  
  //影
  drawShadow();
  
  form2.rotateX0.value = m_rigid.vEuler.x;
  form2.rotateY0.value = m_rigid.vEuler.y;
  form2.rotateZ0.value = m_rigid.vEuler.z;

}

function drawShadow()
{
  gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA);
  gl.enable(gl.BLEND);
  dog.shadow = shadow_value;
  dog.draw(gl);
  dog.shadow = 0.0;
  gl.depthMask(true);
  gl.disable(gl.BLEND);
}

//---------------------------------------------------
//イベント処理
function onClickC_Size()
{
  canvas.width = form1.c_sizeX.value;
  canvas.height = form1.c_sizeY.value;
  display();
}

function onClickWire()
{
  if(form2.wireframe.checked) dog.flagSolid = false;
  else                        dog.flagSolid = true;
  display(); 
}

function onChangeMouse()
{
  if(form2.object.checked) m_flagObject = true;
  else                     m_flagObject = false;
  mouseOperation(canvas, camera);//support.js
}

function onClickTranslate()
{
  dog.vPos.x = parseFloat(form2.translateX.value);
  dog.vPos.y = parseFloat(form2.translateY.value);
  dog.vPos.z = parseFloat(form2.translateZ.value);
  display();
}   

function onClickScale()
{
  dog.vSize.x = parseFloat(form2.scaleX.value);
  dog.vSize.y = parseFloat(form2.scaleY.value);
  dog.vSize.z = parseFloat(form2.scaleZ.value);
  display();
}   

function onClickRotate0()
{//root
  dog.vEuler.x = parseFloat(form2.rotateX0.value);
  dog.vEuler.y = parseFloat(form2.rotateY0.value);
  dog.vEuler.z = parseFloat(form2.rotateZ0.value);
  display();
}
function onClickRotate1()
{//首関節
  dog.vJoints[0].x = parseFloat(form2.rotateX1.value);
  dog.vJoints[0].y = parseFloat(form2.rotateY1.value);
  dog.vJoints[0].z = parseFloat(form2.rotateZ1.value);
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

function onClickStart()
{
  flagStart = true;
  makeAnimationData();
  display();
}
function onClickStop()
{
  flagStart = false;
  display();
}
function onClickReset()
{
  frameCount = 0;
  dog.height = dog.height0;
  init();
  display();
}
