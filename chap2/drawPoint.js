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
  //Canvasをクリアする色を設定する
  gl.clearColor(1.0, 1.0, 0.0, 1.0);

  //Canvasをクリアする
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  // 描画する
  gl.drawArrays(gl.POINTS, 0, 1);
}
