//-------------------------------------------------------
//  kwgSupport.js
//  光源，カメラ，視体積，マウス操作等のパラメータや関数を定義
//------------------------------------------------------------------
var m_flagObject = false;//マウス操作対象をオブジェクトにするときtrue
var m_rigid;//マウス操作の対象となるオブジェクト
var vWorldPos = new Vector3(0.0, 0.0, 0.0);//canvas上の位置（視体積の近平面）に対するワールド座標（m_flagObject=trueでマウスがクリックされたときの位置）
var flagPick = false;
var numObject;
//-------------------------------------------------------------------
//光源
function Light()
{
  this.pos = [8.0, 0.0, 10.0, 1.0];//w=1:点光源，w=0:平行光源(光源方向）
  this.color = [1.0, 1.0, 1.0, 1.0];//拡散光・環境光・鏡面光みな同じ
  this.attenuation = [1.0, 0.0, 0.0];//一定減衰率,1次減衰率,2次減衰率
  this.spotCnt = [0.0, 0.0, 0.0];//スポット光源が照射される中心位置（スポット中心）
  this.spotCutoff = 30.0;//スポットライト・カットオフ
  this.spotExponent = 10.0;//スポットライト指数
};
//---------------------------------------------------
//カメラと視体積
function Camera() 
{
  //カメラ
  this.pos = [10.0, 0.0, 0.0];//位置（視点）
  this.cnt = [0.0, 0.0, 0.0];//注視点
  this.dist= 10.0; //注視点から視点までの距離(R)
  this.theta = 0.0;//仰角（水平面との偏角）
  this.phi = 0.0;  //方位角
  //視体積
  this.fovy = 40.0;//視野角
  this.near = 1.0; //前方クリップ面(近平面)
  this.far = 200.0;//後方クリップ面(遠平面)
};

Camera.prototype.getPos = function()
{
  this.pos[0] = this.cnt[0] + this.dist * Math.cos(DEG_TO_RAD * this.theta) * Math.cos(DEG_TO_RAD * this.phi);//x
  this.pos[1] = this.cnt[1] + this.dist * Math.cos(DEG_TO_RAD * this.theta) * Math.sin(DEG_TO_RAD * this.phi);//y
  this.pos[2] = this.cnt[2] + this.dist * Math.sin(DEG_TO_RAD * this.theta);//z
}

Camera.prototype.getWorldPos = function(x, y, canvas)
{//2次元canvas座標->3次元ワールド座標変換 
  var vPos = new Vector3(this.pos[0], this.pos[1], this.pos[2]);//カメラ位置
  var vCnt = new Vector3(this.cnt[0], this.cnt[1], this.cnt[2]);//注視点
  var vDirView = v3_sub( vCnt, vPos);//視点から注視点へ向かうベクトル
  vDirView.v3_norm();//正規化
  //ウィンドウ(canvas)中心点のワールド座標
  var vCenterWindow = v3_mul(vDirView, this.near);
  vCenterWindow.v3_add(vPos);

  //windowの上方向ベクトル
  var vUp = v3_norm(vDirView);//ベクトルに対してA=Bは使えない
  vUp.v3_rotZ_deg(-this.phi); //-φだけz軸回転してxz平面へ
  vUp.v3_rotY_deg(90.0);      //90°y軸回転
  vUp.v3_rotZ_deg(this.phi);  //視線ベクトルが元の位置になるように回転
  //右方向ベクトル
  var vRight = v3_cross(vDirView, vUp);
  vRight.v3_norm();

  //視体積の近平面の高さ
  var heightNearPlane = 2.0 * this.near * Math.tan(DEG_TO_RAD * this.fovy / 2.0);
  var ratio = heightNearPlane / canvas.height;//ピクセル当たりの長さ

  var rx, ry; //(x,y)点に対する画面中心からの距離(world座標に変換)
  rx = (x - canvas.width / 2.0) * ratio;
  ry = (canvas.height / 2.0 - y) * ratio;

  var vPosWorld = new Vector3(0.0, 0.0, 0.0);
  vPosWorld.x = vRight.x * rx + vUp.x * ry + vCenterWindow.x;
  vPosWorld.y = vRight.y * rx + vUp.y * ry + vCenterWindow.y;
  vPosWorld.z = vRight.z * rx + vUp.z * ry + vCenterWindow.z;
  return vPosWorld ;
}

Camera.prototype.pickObject = function()
{
  //canvasをクリックしたとき最も近いオブジェクト番号を選択する
  var vCameraPos = new Vector3(this.pos[0], this.pos[1], this.pos[2]);
  //視点からマウスカーソル位置へ向かう単位ベクトル（視線ベクトル）
  var unitVector = v3_sub(vWorldPos, vCameraPos);//「-」演算子は使えない
  unitVector.v3_norm();
  var vDir;  //カメラからオブジェクト中心への方向ベクトル
  var vPoint;//オブジェクト中心からunitVectorへ降ろした交点
  var dist = [];//その距離
  var s, i;
  var min = 1000;
  for(i = 0; i < numObject; i++)
  {
    vDir = v3_sub(rigid[i].vPos, vCameraPos);
    s = v3_dot(unitVector, vDir);
    vPoint = v3_mul(unitVector, s);
    vPoint.v3_add(vCameraPos);//交点
    dist[i] = v3_dist(vPoint, rigid[i].vPos);
    if(dist[i] < min)
    {
      min = dist[i]; 
      selectNo = i;
    }
  }
}
//----------------------------------------------------
//マウス操作
function mouseOperation(canvas, camera)
{
  var xStart, yStart;
  var flagMouse = false;
  var flagMove = false;
  var rect;
  if(m_flagObject == false)//全シーン
  {
    canvas.onmousedown = function(ev)
    {
      //Web page左上からの距離
      var x = ev.clientX; // マウスポインタのx座標
      var y = ev.clientY; // マウスポインタのy座標
      var wid = 30;
      var dd = 0.2;//距離増分
      rect = ev.target.getBoundingClientRect() ;//Web page左上を原点にしたピクセル単位のcanvas領域

      if(x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) 
      {//canvas外
        flagMouse = false;  return; 
      }
      
      xStart = x; yStart = y;
	  flagMouse = true;
	  
　　  if(x > rect.left && x < rect.left + wid && y > rect.top && y < rect.top + wid)//canvasの左上
      {//dolly
        camera.dist -= dd;//近づく
      }
      else if(x > rect.right - wid && x < rect.right && y > rect.top && y < rect.top +wid)//右上
      {//dolly
        camera.dist += dd;//遠ざかる
      }
    
      else if(y > rect.top + canvas.height/2 - wid && y < rect.top + canvas.height/2 + wid)
      {//pan
        if(x > rect.left && x < rect.left + wid ) camera.phi -= 1.0;//真左
	    else if(x > rect.right - wid && x < rect.right) camera.phi += 1.0;//真右
	    camera.cnt[0] = camera.pos[0] - camera.dist * Math.cos(DEG_TO_RAD * camera.phi) * Math.cos(DEG_TO_RAD * camera.theta);
	    camera.cnt[1] = camera.pos[1] - camera.dist * Math.sin(DEG_TO_RAD * camera.phi) * Math.cos(DEG_TO_RAD * camera.theta);
      }
      else if(x > rect.left + canvas.width/2 - wid && x < rect.left + canvas.width/2 + wid)
      {//tilt
        if(y < rect.top + wid ) camera.theta += 1.0;//真上
	    else if(y > rect.bottom - wid) camera.theta -= 1.0;//真下
		  
        camera.cnt[0] = camera.pos[0] - camera.dist * Math.cos(DEG_TO_RAD * camera.theta) * Math.cos(DEG_TO_RAD * camera.phi);
        camera.cnt[1] = camera.pos[1] - camera.dist * Math.cos(DEG_TO_RAD * camera.theta) * Math.sin(DEG_TO_RAD * camera.phi);
        camera.cnt[2] = camera.pos[2] - camera.dist * Math.sin(DEG_TO_RAD * camera.theta);
      }    
      else if(x > rect.left && x < rect.left + wid && y > rect.bottom - wid && y < rect.bottom)//左した
      {
        camera.fovy -= 1.0;//zoom in
      }
      else if(x > rect.right - wid && x < rect.right && y > rect.bottom - wid && y < rect.bottom)//右下
      {
        camera.fovy += 1.0;//zoom out
      }
      camera.getPos();
      display();
    }

    canvas.onmouseup = function(ev)
    {
      flagMouse = false;
    }
    canvas.onmousemove = function(ev)
    {
      if(!flagMouse) return;
      //Web page左上からの距離
      var x = ev.clientX; // マウスポインタのx座標
      var y = ev.clientY; // マウスポインタのy座標
      var dd = 0.2;//距離増分
      rect = ev.target.getBoundingClientRect() ;//Web page左上を原点にしたピクセル単位のcanvas領域
  
      if(x < rect.left || x > rect.right || y < rect.top || y > rect.bottom){ flagMouse = false; return;}//canvas外
	
      if(y < rect.top + canvas.height / 2) camera.phi += dd * (x - xStart) ;//tumble
	  else camera.phi -= dd * (x - xStart) ;//tumble

      camera.theta += dd * (y - yStart) ;//crane

      camera.getPos();
      display();
      xStart = x;
      yStart = y;
    }
  }
  
  else//m_flagObject = true 
  {//選択されたオブジェクトだけ回転
    canvas.onmousedown = function(ev)
    {
      //Web page左上からの距離
      var x = ev.clientX; // マウスポインタのx座標
      var y = ev.clientY; // マウスポインタのy座標
      var dd = 1.0;//距離増分
      rect = ev.target.getBoundingClientRect() ;//Web page左上を原点にしたピクセル単位のcanvas領域

      if(x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) 
      { flagMouse = false; return; }//canvas外
	  xStart = x; yStart = y;
	  flagMouse = true;
    }

    canvas.onmouseup = function(ev)
    {
　　　if(!flagMove)
      {
        //移動せずに離したとき
        //canvas座標におけるマウスカーソルの位置
        var xm = xStart-rect.left;
        var ym = yStart-rect.top;
        vWorldPos.v3_copy(camera.getWorldPos(xm, ym, canvas));
        camera.pickObject();display();
      }
      flagMove = false; 
      flagMouse = false;
    }
    
    canvas.onmousemove = function(ev)
    {
      if(!flagMouse) return;

      //Web page左上からの距離
      var x = ev.clientX; // マウスポインタのx座標
      var y = ev.clientY; // マウスポインタのy座標
      var factor = 100.0 / canvas.width;//回転倍率
    　rect = ev.target.getBoundingClientRect() ;//Web page左上を原点にしたピクセル単位のcanvas領域
  
    　if(x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)
      {  flagMouse = false; return;}//canvas外
	　var dx = factor * (x - xStart);
	  var dy = factor * (y - yStart);
	  m_rigid.vEuler.z += dx;
	  m_rigid.vEuler.y += dy;
      display();
      xStart = x;
      yStart = y;
      if(dx != 0.0 || dy != 0.0) flagMove = true;
    }
  }  　
}
