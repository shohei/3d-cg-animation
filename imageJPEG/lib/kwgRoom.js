//kwgRoom.js


function Table()
{
  this.numParts = 2;
  //this.flagSolid = true;
  //this.shadow = 0.0;
  
  //位置・姿勢（root位置）
  this.vPos = new Vector3(0.0, 0.0, 0.0);//Topの中心の(x,y)，脚の下端
  this.vEuler = new Vector3(0.0, 0.0, 0.0);
  this.vSize = new Vector3(1.0, 1.0, 1.0);//全体のスケール変換に使用
  
  var i;
  this.parts = [];
  for(i = 0; i < this.numParts; i++)
  {
    this.parts[i] = new Rigid_HS();
    this.parts[i].kind = "SUPER";
    this.parts[i].nSlice = 10;
    this.parts[i].nStack = 10;
    this.parts[i].eps1 = 0.2;
    this.parts[i].eps2 = 0.2;
    this.parts[i].flagSolid = flagSolid;
    this.shadow = shadow_value;
  }
  for(var i = 0; i < this.numParts; i++)
  { 
    this.parts[i].diffuse = [0.8, 0.5, 0.2, 1.0];
    this.parts[i].ambient = [0.5, 0.3, 0.1, 1.0];
  }
    
  //サイズ
  this.vTop = new Vector3(1.0, 2.0, 0.1);//天板
  this.vLeg = new Vector3(0.2, 0.2, 0.7);
  
  //------------------------------
  Table.prototype.draw = function(gl)
  {
    for(var i = 0; i < this.numParts; i++)
    {
      this.parts[i].flagSolid = this.flagSolid;
      this.parts[i].shadow = this.shadow;
    }
    var n = this.parts[0].initVertexBuffers(gl);//1種類のプリミティブを使うので1回だけでよい
  
    //スタック行列の確保
    var stackMat = new Matrix4();//テーブルのときは1個でよい
    //for(var i = 0; i < 5; i++) stackMat[i] = new Matrix4();
    // モデル行列の初期化
    var modelMatrix = new Matrix4();
  
    if(this.shadow >= 0.01) modelMatrix.dropShadow(plane, light.pos);//簡易シャドウ
  
    //全体(root)
    modelMatrix.translate(this.vPos.x, this.vPos.y, this.vPos.z);
    modelMatrix.rotate(this.vEuler.z, 0, 0, 1); // z軸周りに回転
    modelMatrix.rotate(this.vEuler.y, 0, 1, 0); // y軸周りに回転
    modelMatrix.rotate(this.vEuler.x, 1, 0, 0); // x軸周りに回転
    modelMatrix.scale(this.vSize.x, this.vSize.y, this.vSize.z);
  
    stackMat.copy(modelMatrix);//rootのモデル行列を保存
　
    //天板
  　modelMatrix.translate(0.0, 0.0, this.vLeg.z);
    modelMatrix.scale(this.vTop.x, this.vTop.y, this.vTop.z);
    this.parts[0].draw(gl, n, modelMatrix);
  
    modelMatrix.copy(stackMat);//rootのモデル行列に戻す
    //前右脚
  　modelMatrix.translate(0.4 * this.vTop.x, -0.4 * this.vTop.y, 0.5 * this.vLeg.z);
    modelMatrix.scale(this.vLeg.x, this.vLeg.y, this.vLeg.z);
    this.parts[1].draw(gl, n, modelMatrix);

    modelMatrix.copy(stackMat);//rootのモデル行列に戻す
    //前左脚
  　modelMatrix.translate(-0.4 * this.vTop.x, -0.4 * this.vTop.y, 0.5 * this.vLeg.z);
    modelMatrix.scale(this.vLeg.x, this.vLeg.y, this.vLeg.z);
    this.parts[1].draw(gl, n, modelMatrix);

    modelMatrix.copy(stackMat);//rootのモデル行列に戻す
    //後右脚
  　modelMatrix.translate(0.4 * this.vTop.x, 0.4 * this.vTop.y, 0.5 * this.vLeg.z);
    modelMatrix.scale(this.vLeg.x, this.vLeg.y, this.vLeg.z);
    this.parts[1].draw(gl, n, modelMatrix);

    modelMatrix.copy(stackMat);//rootのモデル行列に戻す
    //後左脚
  　modelMatrix.translate(-0.4 * this.vTop.x, 0.4 * this.vTop.y, 0.5 * this.vLeg.z);
    modelMatrix.scale(this.vLeg.x, this.vLeg.y, this.vLeg.z);
    this.parts[1].draw(gl, n, modelMatrix);
  }
}
//-------------------------------------------------------------------
function Chair()
{
  this.numParts = 2;
  this.flagSolid = true;
  this.shadow = 0.0;
  
  //位置・姿勢（root位置）
  this.vPos = new Vector3(0.0, 0.0, 0.0);//Topの中心の(x,y)，脚の下端
  this.vEuler = new Vector3(0.0, 0.0, 0.0);
  this.vSize = new Vector3(1.0, 1.0, 1.0);//全体のスケール変換に使用
  
  var i;
  this.parts = [];
  for(i = 0; i < this.numParts; i++)
  {
    this.parts[i] = new Rigid_HS();
    this.parts[i].kind = "SUPER";
    this.parts[i].nSlice = 10;
    this.parts[i].nStack = 10;
    this.parts[i].eps1 = 0.2;
    this.parts[i].eps2 = 1.0;
  }
  for(var i = 0; i < this.numParts; i++)
  { 
    this.parts[i].diffuse = [0.8, 0.2, 0.2, 1.0];
    this.parts[i].ambient = [0.4, 0.1, 0.1, 1.0];
  }
    
  //サイズ
  this.vTop = new Vector3(0.5, 0.5, 0.05);//天板
  this.vLeg = new Vector3(0.1, 0.1, 0.4);
  
  //------------------------------
  Chair.prototype.draw = function(gl)
  {
    for(var i = 0; i < this.numParts; i++)
    {
      this.parts[i].flagSolid = this.flagSolid;
      this.parts[i].shadow = this.shadow;
    }
    var n = this.parts[0].initVertexBuffers(gl);//1種類のプリミティブを使うので1回だけでよい
  
    //スタック行列の確保
    var stackMat = new Matrix4();//テーブルのときは1個でよい
    // モデル行列の初期化
    var modelMatrix = new Matrix4();
  
    if(this.shadow >= 0.01) modelMatrix.dropShadow(plane, light.pos);//簡易シャドウ
  
    //全体(root)
    modelMatrix.translate(this.vPos.x, this.vPos.y, this.vPos.z);
    modelMatrix.rotate(this.vEuler.z, 0, 0, 1); // z軸周りに回転
    modelMatrix.rotate(this.vEuler.y, 0, 1, 0); // y軸周りに回転
    modelMatrix.rotate(this.vEuler.x, 1, 0, 0); // x軸周りに回転
    modelMatrix.scale(this.vSize.x, this.vSize.y, this.vSize.z);
  
    stackMat.copy(modelMatrix);//rootのモデル行列を保存
　
    //天板
  　modelMatrix.translate(0.0, 0.0, this.vLeg.z);
    modelMatrix.scale(this.vTop.x, this.vTop.y, this.vTop.z);
    this.parts[0].draw(gl, n, modelMatrix);
  
    modelMatrix.copy(stackMat);//rootのモデル行列に戻す
    //前脚
  　modelMatrix.translate(0.4 * this.vTop.x, 0.0, 0.5 * this.vLeg.z);
    modelMatrix.scale(this.vLeg.x, this.vLeg.y, this.vLeg.z);
    this.parts[1].draw(gl, n, modelMatrix);

    modelMatrix.copy(stackMat);//rootのモデル行列に戻す
    //後脚
  　modelMatrix.translate(-0.4 * this.vTop.x, 0.0, 0.5 * this.vLeg.z);
    modelMatrix.scale(this.vLeg.x, this.vLeg.y, this.vLeg.z);
    this.parts[1].draw(gl, n, modelMatrix);

    modelMatrix.copy(stackMat);//rootのモデル行列に戻す
    //右脚
  　modelMatrix.translate(0.0, -0.4 * this.vTop.y, 0.5 * this.vLeg.z);
    modelMatrix.scale(this.vLeg.x, this.vLeg.y, this.vLeg.z);
    this.parts[1].draw(gl, n, modelMatrix);

    modelMatrix.copy(stackMat);//rootのモデル行列に戻す
    //左脚
  　modelMatrix.translate(0.0, 0.4 * this.vTop.y, 0.5 * this.vLeg.z);
    modelMatrix.scale(this.vLeg.x, this.vLeg.y, this.vLeg.z);
    this.parts[1].draw(gl, n, modelMatrix);
  }
}



