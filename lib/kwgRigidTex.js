//RigidTexクラス（テクスチャ用3Dオブジェクトの定義と描画）
function Rigid()
{
  //プロパティ
  this.kind = "SPHERE";
  this.diffuse = [0.6, 0.6, 0.6, 1.0];
  this.ambient = [0.4, 0.4, 0.4, 1.0];
  this.specular = [0.8, 0.8, 0.8, 1.0];
  this.shininess = 100.0;  
  this.vPos = new Vector3();//位置
  this.vEuler = new Vector3();//回転角度（オイラー角で指定）
  this.vSize = new Vector3(1.0, 1.0, 1.0);//スケーリング
  this.nSlice = 30;
  this.nStack = 30;
  this.radiusRatio = 0.5;//上底半径/下底半径
  this.eps1 = 1.0;//"SUPER"のパラメータ
  this.eps2 = 1.0;//"SUPER"のパラメータ
  this.flagSolid = true;//ソリッドかワイヤーフレームモデルか
  this.shadow = 0.0;
  //フロア表示のチェック模様
  this.flagCheck = false;
  this.col1 = [0.7, 0.5, 0.3, 1.0];
  this.col2 = [0.3, 0.4, 0.6, 1.0];
  //テクスチャ
  this.flagTexture = false;
  this.nRepeatS = 1;
  this.nRepeatT = 1;
}

Rigid.prototype.initVertexBuffers = function(gl)
{
//頂点データをシェーダへアップロードするメソッド
  var n;
  var vertices = [];//頂点座標
  var texCoords = [];//テクスチャ座標
  var normals = []; //法線ベクトル
  var indices = []; //頂点番号
  var colors = [];//check模様のときだけ

  if(this.flagTexture == false)
  {
    if     (this.kind == "CUBE")    n = makeCube(vertices, normals, indices, this.flagSolid);
    else if(this.kind == "SPHERE")  n = makeSphere(vertices, normals, indices, this.nSlice, this.nStack);
    else if(this.kind == "CYLINDER")n =  makeCylinder(vertices, normals, indices, this.radiusRatio, this.nSlice, this.flagSolid);
    else if(this.kind == "PRISM")   n = makePrism(vertices, normals, indices, this.radiusRatio, this.nSlice, this.flagSolid);
    else if(this.kind == "TORUS")   n = makeTorus(vertices, normals, indices, this.radiusRatio, this.nSlice, this.nStack);
    else if(this.kind == "SUPER")   n = makeSuper(vertices, normals, indices, this.nSlice, this.nStack, this.eps1, this.eps2);
    else if(this.kind == "CYLINDER_X") n = makeCylinderX(vertices, normals, indices, this.nSlice, this.flagSolid);
    else if(this.kind == "CYLINDER_Y") n = makeCylinderY(vertices, normals, indices, this.nSlice, this.flagSolid);
    else if(this.kind == "CYLINDER_Z") n = makeCylinderZ(vertices, normals, indices, this.nSlice, this.flagSolid);
    else if(this.kind == "PLATE_Z")    n = makePlateZ(vertices, normals, indices, this.flagSolid);
    else if(this.kind == "GRID_PLATE") n = makeGridPlate(vertices, texCoords, normals, indices, this.nSlice, this.nStack, this.flagSolid);
    else if(this.kind == "CHECK_PLATE") n = makeCheckedPlate(vertices, colors, normals, indices, this.nSlice, this.nStack, this.col1, this.col2) ;  
  }
  else
  {//テクスチャ用
    if     (this.kind == "CUBE")    n = makeCubeTex(vertices, texCoords, normals, indices, this.flagSolid, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "CUBE_BUMP") n = makeCubeBump(vertices, texCoords, normals, indices, this.flagSolid, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "SPHERE")  n = makeSphereTex(vertices, texCoords, normals, indices, this.nSlice, this.nStack, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "CYLINDER")n =  makeCylinderTex(vertices, texCoords, normals, indices, this.radiusRatio, this.nSlice, this.flagSolid, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "PRISM")   n = makePrismTex(vertices, texCoords, normals, indices, this.radiusRatio, this.nSlice, this.flagSolid, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "TORUS")   n = makeTorusTex(vertices, texCoords, normals, indices, this.radiusRatio, this.nSlice, this.nStack, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "SUPER")   n = makeSuperTex(vertices, texCoords, normals, indices, this.nSlice, this.nStack, this.eps1, this.eps2, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "PLATE_Z") n = makePlateZTex(vertices, texCoords, normals, indices, this.flagSolid, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "GRID_PLATE") n = makeGridPlateTex(vertices, texCoords, normals, indices, this.nSlice, this.nStack, this.flagSolid, this.nRepeatS, this.nRepeatT);
    else if(this.kind == "CHECK_PLATE") n = makeCheckedPlateTex(vertices, texCoords, colors, normals, indices, this.nSlice, this.nStack, this.col1, this.col2, this.flagSolid, this.nRepeatS, this.nRepeatT) ;  
  }
  gl.disableVertexAttribArray(colorLoc);//colorのバッファオブジェクトの割り当てを無効化
  //フロアを表示したとき，フロアのインデックス以上の球やトーラスを描画できなくなることを防ぐため
//gl.disableVertexAttribArray(vertexLoc);
//gl.disableVertexAttribArray(normalLoc);

  // バッファオブジェクトを作成する
  var vertexBuffer = gl.createBuffer();
  if(this.flagTexture) {var texCoordBuffer = gl.createBuffer();}//追加
  var normalBuffer = gl.createBuffer();
  if(this.flagCheck) {var colorBuffer = gl.createBuffer()};
  var indexBuffer = gl.createBuffer();
  if (!vertexBuffer || !normalBuffer || !indexBuffer) return -1;
  
  // 頂点の座標をバッファオブジェクトに書き込む
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  //gl.bufferData(gl.ARRAY_BUFFER,  new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bufferData(gl.ARRAY_BUFFER,  new Float32Array(vertices), gl.DYNAMIC_DRAW);
  // vertexLocにバッファオブジェクトを割り当て、有効化する
  var vertexLoc = gl.getAttribLocation(gl.program, 'a_vertex');
  gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vertexLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  if(this.flagTexture)
  {
    // 頂点のテクスチャ座標をバッファオブジェクトに書き込む(追加）
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER,  new Float32Array(texCoords), gl.STATIC_DRAW);
    gl.bufferData(gl.ARRAY_BUFFER,  new Float32Array(texCoords), gl.DYNAMIC_DRAW);
    // texLocにバッファオブジェクトを割り当て、有効化する
    var texLoc = gl.getAttribLocation(gl.program, 'a_texCoord');
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texLoc);
    // バッファオブジェクトのバインドを解除する
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  if(this.flagCheck)
  {
    // 頂点の色をバッファオブジェクトに書き込む
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    // a_colorの格納場所を取得し、バッファオブジェクトを割り当て、有効化する
    var colorLoc = gl.getAttribLocation(gl.program, 'a_color');
    gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);//有効化
    // バッファオブジェクトのバインドを解除する
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // 法線データをバッファオブジェクトに書き込む
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
//  gl.bufferData(gl.ARRAY_BUFFER,  new Float32Array(normals), gl.STATIC_DRAW);//法線は頂点データと同じ
  gl.bufferData(gl.ARRAY_BUFFER,  new Float32Array(normals), gl.DYNAMIC_DRAW);//法線は頂点データと同じ
  // normalLocにバッファオブジェクトを割り当て、有効化する
  var normalLoc = gl.getAttribLocation(gl.program, 'a_normal');
  gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(normalLoc);
  // バッファオブジェクトのバインドを解除する
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // インデックスをバッファオブジェクトに書き込む
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  
  if(this.kind == "SPHERE" || this.kind == "TORUS" || this.kind == "SUPER"  || this.kind == "CHECK_PLATE" || this.kind == "GRID_PLATE" )
  {
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
  }

  else
  {
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,  new Uint8Array(indices), gl.STATIC_DRAW);
  }

  return n;
}

Rigid.prototype.draw = function(gl, n)
{
  //マテリアル特性のユニフォーム変数格納場所を取得し値を設定する
  var diffLoc = gl.getUniformLocation(gl.program, 'u_diffuseColor');
  gl.uniform4fv(diffLoc, new Float32Array(this.diffuse));
  var ambiLoc = gl.getUniformLocation(gl.program, 'u_ambientColor');
  gl.uniform4fv(ambiLoc, new Float32Array(this.ambient));
  var specLoc = gl.getUniformLocation(gl.program, 'u_specularColor');
  gl.uniform4fv(specLoc, new Float32Array(this.specular));
  var shinLoc = gl.getUniformLocation(gl.program, 'u_shininess');
  gl.uniform1f(shinLoc, this.shininess);
　var checkLoc = gl.getUniformLocation(gl.program, 'u_flagCheck');
　gl.uniform1i(checkLoc, this.flagCheck);

  var shadowLoc = gl.getUniformLocation(gl.program, 'u_shadow');
  gl.uniform1f(shadowLoc, this.shadow);
  var flagTexLoc = gl.getUniformLocation(gl.program, 'u_flagTexture');
  gl.uniform1f(flagTexLoc, this.flagTexture);
  
  // モデル行列を計算する
  var modelMatrix = new Matrix4(); // モデル行列の初期化
  if(this.shadow >= 0.01) modelMatrix.dropShadow(plane, light.pos);//簡易シャドウ
  modelMatrix.translate(this.vPos.x, this.vPos.y, this.vPos.z);
  modelMatrix.rotate(this.vEuler.z, 0, 0, 1); // z軸周りに回転
  modelMatrix.rotate(this.vEuler.y, 0, 1, 0); // y軸周りに回転
  modelMatrix.rotate(this.vEuler.x, 1, 0, 0); // x軸周りに回転
  modelMatrix.scale(this.vSize.x, this.vSize.y, this.vSize.z);

  // 法線変換行列を計算する
  var normalMatrix = new Matrix4();// 初期化
  if(this.shadow < 0.01)//影でないときだけ
  {
    normalMatrix.setInverseOf(modelMatrix);//モデルリング行列の逆行列を求め
    normalMatrix.transpose();              //さらに転置する
  }
  //それぞれの行列のuniform変数の格納場所を取得し値を設定する
  var modelMatrixLoc = gl.getUniformLocation(gl.program, 'u_modelMatrix');
  gl.uniformMatrix4fv(modelMatrixLoc, false, modelMatrix.elements);
  var normalMatrixLoc = gl.getUniformLocation(gl.program, 'u_normalMatrix');
  gl.uniformMatrix4fv(normalMatrixLoc, false, normalMatrix.elements);
  //物体を描画する
  if(this.kind == "SPHERE" || this.kind == "TORUS" || this.kind == "SUPER" || this.kind == "CHECK_PLATE" || this.kind == "GRID_PLATE" )
  {
    if(this.flagSolid == true)
      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);
    else
      gl.drawElements(gl.LINE_STRIP, n, gl.UNSIGNED_SHORT, 0);
    //球のようにインデックスデータが多いときはUint16Array(indices)を使用する．このときUNSIGNED_SHORTとする
  }
  else
  {
    if(this.flagSolid == true)
      gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
    else{
      gl.drawElements(gl.LINE_STRIP, n, gl.UNSIGNED_BYTE, 0);}
  }
}
