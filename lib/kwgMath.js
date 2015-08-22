//自作の数学ライブラリ
//kwgMath.js
var DEG_TO_RAD = Math.PI / 180.0;
var RAD_TO_DEG = 180.0 / Math.PI;

/*----------------------------------------------
  3次元ベクトル
----------------------------------------------*/
//コンストラクタ
function Vector3(x, y, z)
{
  if(typeof x === 'number' && typeof y === 'number' && typeof z === 'number' )
  {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  else
  {
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }
}
Vector3.prototype.v3_copy = function(v)
{
  if(typeof v === 'object')
  {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
  }
  else
  {
    alert("Vector3 ERROR --- v3_add()の 引数がベクトルでない！");
  }
}
 

Vector3.prototype.v3_add = function(v)
{
  if(typeof v === 'object')
  {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
  }
  else
  {
    alert("Vector3 ERROR --- v3_add()の 引数がベクトルでない！");
  }
}

function v3_add(a, b)//a,b自身は変化しない
{
  if(typeof a === 'object' && typeof b === 'object')
  {
    var c = new Vector3(a.x, a.y, a.z);
    c.v3_add(b);
    return c;
  }
  else 
  {
    alert("Vector3 ERROR --- v3_add()の 引数がベクトルでない！");
  }
}

Vector3.prototype.v3_sub = function(v)
{
  if(typeof v === 'object')
  {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
  }
  else
  {
    alert("Vector3 ERROR --- v3_sub()の 引数がベクトルでない！");
  }

}

function v3_sub(a, b)//a,b自身は変化しない
{
  if(typeof a === 'object' && typeof b === 'object')
  {
    var c = new Vector3(a.x, a.y, a.z);
    c.v3_sub(b);
    return c;
  }
  else
  {
    alert("Vector3 ERROR --- v3_sub()の 引数がベクトルでない！");
  }
}

Vector3.prototype.v3_mul = function(a)
{
  if(typeof a === 'number')//スカラ乗算
  {//scalar
    this.x *= a;
    this.y *= a;
    this.z *= a;
  }
  else if(typeof a == 'object')//ベクトルどうしの乗算
  {
    this.x *= a.x;
    this.y *= a.y;
    this.z *= a.z;
  }
   
}

function v3_mul(a, b)//自身は変化しない
{
  if(typeof a === 'number' && typeof b === 'object')
  {
    var c = new Vector3(b.x, b.y, b.z);
    c.v3_mul(a);
  }
  else if(typeof a === 'object' && typeof b === 'number')
  {
    var c = new Vector3(a.x, a.y, a.z);
    c.v3_mul(b);
  }
  else if(typeof a === 'object' && typeof b === 'object')//ベクトルどうしの乗算
  {
    c.x = a.x * b.x;
    c.y = a.y * b.y;
    c.z = a.z * b.z;
  }
  return c;
}


Vector3.prototype.v3_div = function(a)//スカラ除算
{
  if(typeof a === 'number' && a != 0)//スカラ除算
  {
    this.x /= a;
    this.y /= a;
    this.z /= a;
  }
  else
  {
    alert("Vector3 ERROR --- v3_div()の 引数がスカラでない，または0です！");
  }
}

function v3_div(a, s)//スカラ除算，自身は変化しない
{
  if(typeof a === 'object' && typeof s === 'number')
  {
    var c = new Vector3(a.x, a.y, a.z);
    c.v3_div(s);
    return c;
  }
  else
  {
    alert("Vector3 ERROR --- v3_div()の 引数が間違い！");
  }
}

function v3_mag(v)
{
  var s = v.x * v.x + v.y * v.y + v.z * v.z;
  return Math.sqrt(s);
}

function v3_mag2(v)
{
  var s = v.x * v.x + v.y * v.y + v.z * v.z;
  return s;
}

//ベクトル間距離
function v3_dist(a, b)
{
  var c = new Vector3(a.x, a.y, a.z);
  c.v3_sub(b);
  return v3_mag(c);
}
//ベクトル間2乗距離
function v3_dist2(a, b)
{
  var c = new Vector3(a.x, a.y, a.z);
  c.v3_sub(b);
  return v3_mag2(c);
}
//内積
function v3_dot(a, b)
{
  return a.x * b.x + a.y * b.y + a.z * b.z;
} 
//外積
function v3_cross(a, b)
{
  var c = new Vector3();
  c.x = a.y * b.z - a.z * b.y;
  c.y = a.z * b.x - a.x * b.z;
  c.z = a.x * b.y - a.y * b.x;
  return c;
}

Vector3.prototype.v3_norm = function()
{//自身の単位ベクトル
  var x = this.x; var y = this.y; var z = this.z;
  var s = x*x + y*y + z*z;
  if(s == 0) 
  { alert("Vector3 ERROR --- v3_norm() 大きさ0のため正規化できない！"); return; }
  s = Math.sqrt(s);
  this.x = x/s; this.y = y/s; this.z = z/s;
}

function v3_norm(a)
{
  if(typeof a === 'object')
  {
    var s = a.x*a.x + a.y*a.y + a.z*a.z;
    s = Math.sqrt(s);
    var b = new Vector3();
    b.x = a.x/s; b.y = a.y/s; b.z = a.z/s;
    return b;
  }
  else
  {
    alert("Vector3 ERROR --- v3_norm()の 引数が間違い！");
  }
}
  
Vector3.prototype.v3_rotX_deg = function(angle)
{//angle:deg
  var y = this.y; var z = this.z;

  this.y = y * Math.cos(DEG_TO_RAD * angle) - z * Math.sin(DEG_TO_RAD * angle);
  this.z = y * Math.sin(DEG_TO_RAD * angle) + z * Math.cos(DEG_TO_RAD * angle);
}
Vector3.prototype.v3_rotY_deg = function(angle)
{
  var x = this.x; var z = this.z;

  this.x =  x * Math.cos(DEG_TO_RAD * angle) + z * Math.sin(DEG_TO_RAD * angle);
  this.z =- x * Math.sin(DEG_TO_RAD * angle) + z * Math.cos(DEG_TO_RAD * angle);
}
Vector3.prototype.v3_rotZ_deg = function(angle)//ｚ軸回転（角度はdeg)
{
  var x = this.x; var y = this.y;
  this.x = x * Math.cos(DEG_TO_RAD * angle) - y * Math.sin(DEG_TO_RAD * angle);
  this.y = x * Math.sin(DEG_TO_RAD * angle) + y * Math.cos(DEG_TO_RAD * angle);
}
Vector3.prototype.v3_rotX_rad = function(angle)
{//angle:deg
  var y = this.y; var z = this.z;

  this.y = y * Math.cos(angle) - z * Math.sin(angle);
  this.z = y * Math.sin(angle) + z * Math.cos(angle);
}
Vector3.prototype.v3_rotY_rad = function(angle)
{
  var x = this.x; var z = this.z;

  this.x =  x * Math.cos(angle) + z * Math.sin(angle);
  this.z =- x * Math.sin(angle) + z * Math.cos(angle);
}
Vector3.prototype.v3_rotZ_rad = function(angle)//ｚ軸回転（角度はrad)
{
  var x = this.x; var y = this.y;
  this.x = x * Math.cos(angle) - y * Math.sin(angle);
  this.y = x * Math.sin(angle) + y * Math.cos(angle);
}

//-----------------------------------------------------------------------------
function v3_getAngle_rad( a, b)//ベクトルa,b間の角度
{
  var ang;
  var c = (a.x*b.x+a.y*b.y+a.z*b.z)/(v3_mag(a)*v3_mag(b));
  if(c >= 1.0) ang = 0.0;
  else if (c <= -1.0) ang = Math.PI;
  else ang = Math.acos(c);
  return ang;//rad単位で返す
}
//-----------------------------------------------------------------------------
function v3_getAngle_deg( a, b)//ベクトルa,b間の角度
{
  var ang;
  var c = (a.x*b.x+a.y*b.y+a.z*b.z)/(v3_mag(a)*v3_mag(b));
  if(c >= 1.0) ang = 0.0;
  else if (c <= -1.0) ang = Math.PI;
  else ang = Math.acos(c);
  return ang * RAD_TO_DEG;//度単位で返す
}

//-----------------------------------------------------------------------------
function v3_getEulerX(a, b)
{//基本姿勢で中心軸がｘ軸方向であるオブジェクトのオイラー角(deg)
    var cx, cy, cz, len;
    var e = new Vector3();
    cx = b.x - a.x;
    cy = b.y - a.y;
    cz = b.z - a.z;
    len = v3_dist(a, b);
    e.x = 0.0;
    if(cz >= len) e.y = -90.0;
    else if(cz <= -len) e.y = 90.0;
    else e.y = - Math.asin(cz / len) * RAD_TO_DEG;
    if(Math.abs(cx) <= 0.0001 && Math.abs(cy) <= 0.0001) e.z = 0.0;
    else e.z = Math.atan2(cy, cx) * RAD_TO_DEG;
    return e;
}
//------------------------------------------------------------------------------
function v3_getEulerZ(a, b)
{//基本姿勢で中心軸がz軸方向であるオブジェクトのオイラー角(deg)
    var cx, cy, cz, len;
    var e = new Vector3();
    cx = b.x - a.x;
    cy = b.y - a.y;
    cz = b.z - a.z;
    len = v3_dist(a, b);
    e.x = 0.0;
    if(cz >= len) e.y = 0.0;
    else if(cz <= -len) e.y = 180.0;
    else e.y = Math.acos(cz / len) * RAD_TO_DEG;
    if(Math.abs(cx) <= 0.0001 && Math.abs(cy) <= 0.0001) e.z = 0.0;
    else e.z = Math.atan2(cy, cx) * RAD_TO_DEG ;
    return e;
}


//---------------------------------------------------------------------------
//------------------------------------------------------
//乱数
function getRandom(fMin, fMax)
{//一様乱数
  return fMin + (fMax - fMin) * Math.random();
}

//XY平面における放射状の一様乱数
function getRandomVectorXY(r0)
{
  vPos = new Vector3();
  var r = getRandom(0.0, r0);
  var theta = getRandom(-Math.PI, Math.PI);
  vPos.x = Math.cos(theta) * r;
  vPos.y = Math.sin(theta) * r;
  return vPos;
}
//リング状に分布する乱数(中心ほど密度は高い)
function getRandomRingVectorXY(minR, maxR)
{
  vPos = new Vector3();
  var r = getRandom(minR, maxR);
  var theta = getRandom(-Math.PI, Math.PI);
  vPos.x = Math.cos(theta) * r;
  vPos.y = Math.sin(theta) * r;
  return vPos;
}
