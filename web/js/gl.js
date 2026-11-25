// Motor gráfico WebGL: reencuadre, cámara, color pro, efectos, transiciones y textos, en la GPU.
(function () {
  const VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main(){ v_uv = a_pos * 0.5 + 0.5; gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  // Capa: un clip con su encuadre, cámara, color y efectos.
  const LAYER_FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_texSize, u_outSize, u_focus;
uniform vec4 u_cam;          // escala, dx, dy, giro
uniform float u_time, u_frame;
uniform float u_exposure, u_contrast, u_highlights, u_shadows, u_whites, u_blacks;
uniform float u_temp, u_tint, u_sat, u_vib, u_fade, u_splitAmt, u_skin;
uniform vec4 u_lift, u_gamma, u_gain;
uniform vec3 u_splitS, u_splitH;
uniform float u_rgb, u_glitch, u_vhs, u_old, u_pixel, u_mirror, u_kaleido, u_poster;
uniform float u_duo, u_thermal, u_invert, u_hue, u_blur, u_glow, u_sharpen;
uniform vec3 u_duoA, u_duoB;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 rgb2hsv(vec3 c){
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y); float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec2 coverUV(vec2 uv){
  float outA = u_outSize.x / u_outSize.y, texA = u_texSize.x / u_texSize.y;
  vec2 vis = outA > texA ? vec2(1.0, texA / outA) : vec2(outA / texA, 1.0);
  vec2 f = vec2(u_focus.x, 1.0 - u_focus.y);
  vec2 c = clamp(f, vis * 0.5, 1.0 - vis * 0.5);
  return c + (uv - 0.5) * vis;
}
vec2 camera(vec2 uv){
  vec2 f = vec2(u_focus.x, 1.0 - u_focus.y);
  vec2 p = (uv - f) * vec2(u_outSize.x / u_outSize.y, 1.0);
  float s = sin(-u_cam.w), c = cos(-u_cam.w);
  p = mat2(c, -s, s, c) * p;
  p /= u_cam.x;
  p /= vec2(u_outSize.x / u_outSize.y, 1.0);
  return p + f - u_cam.yz;
}
vec2 warp(vec2 uv){
  if (u_mirror > 0.0 && uv.x > 0.5) uv.x = 1.0 - uv.x;
  if (u_kaleido > 0.0){
    vec2 p = uv - 0.5; float a = atan(p.y, p.x) + u_time * 0.3; float r = length(p);
    float seg = 6.2831853 / 6.0; a = mod(a, seg); a = abs(a - seg * 0.5);
    uv = mix(uv, 0.5 + r * vec2(cos(a), sin(a)), u_kaleido);
  }
  if (u_pixel > 0.0){ float cells = mix(160.0, 14.0, u_pixel); vec2 g = vec2(cells, cells * u_outSize.y / u_outSize.x); uv = (floor(uv * g) + 0.5) / g; }
  if (u_glitch > 0.0){
    float burst = step(hash(vec2(floor(u_frame / 2.0), 7.0)), 0.3 + 0.45 * u_glitch);
    float band = floor(uv.y * 24.0);
    float on = step(0.72, hash(vec2(band, floor(u_frame))));
    uv.x += burst * on * (hash(vec2(band, u_frame + 3.0)) - 0.5) * 0.14 * u_glitch;
  }
  if (u_vhs > 0.0){ uv.x += (hash(vec2(floor(uv.y * 240.0), u_frame)) - 0.5) * 0.003 * u_vhs; }
  if (u_old > 0.0){ uv.y += (hash(vec2(floor(u_frame / 2.0), 4.0)) - 0.5) * 0.006 * u_old; }
  return uv;
}
vec3 tex(vec2 uv){ return texture2D(u_tex, clamp(coverUV(uv), 0.001, 0.999)).rgb; }
vec3 sampleScene(vec2 uv){
  float split = u_rgb * 0.009 + u_glitch * 0.012 * step(hash(vec2(floor(u_frame / 2.0), 7.0)), 0.3 + 0.45 * u_glitch) + u_vhs * 0.004;
  vec3 c;
  if (split > 0.0001){ c = vec3(tex(uv + vec2(split, 0.0)).r, tex(uv).g, tex(uv - vec2(split, 0.0)).b); }
  else { c = tex(uv); }
  float rad = u_blur * 0.03 + u_vhs * 0.002;
  if (rad > 0.0002){
    vec3 acc = c; float n = 1.0;
    for (int i = 0; i < 12; i++){
      float a = float(i) * 2.399963; float r = rad * sqrt((float(i) + 0.5) / 12.0);
      acc += tex(uv + vec2(cos(a), sin(a) * u_outSize.x / u_outSize.y) * r); n += 1.0;
    }
    c = acc / n;
  }
  if (u_sharpen > 0.0){
    vec2 px = 1.5 / u_outSize;
    vec3 b = (tex(uv + vec2(px.x, 0.0)) + tex(uv - vec2(px.x, 0.0)) + tex(uv + vec2(0.0, px.y)) + tex(uv - vec2(0.0, px.y))) * 0.25;
    c += (c - b) * u_sharpen * 1.2;
  }
  if (u_glow > 0.0){
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 10; i++){
      float a = float(i) * 2.399963; float r = 0.04 * sqrt((float(i) + 0.5) / 10.0);
      vec3 s = tex(uv + vec2(cos(a), sin(a)) * r); acc += max(s - 0.55, 0.0);
    }
    c += acc / 10.0 * u_glow * 2.2;
  }
  return c;
}

vec3 grade(vec3 c){
  float skin = 0.0;
  vec3 hsv0 = rgb2hsv(clamp(c, 0.0, 1.0));
  if (hsv0.y > 0.1 && hsv0.y < 0.7 && hsv0.z > 0.2) skin = max(0.0, 1.0 - abs(hsv0.x * 360.0 - 25.0) / 25.0) * u_skin;
  c *= pow(2.0, u_exposure);
  float t = u_temp * 0.14, m = u_tint * 0.1;
  c *= vec3((1.0 + t) * (1.0 + m * 0.5), (1.0 + t * 0.1) * (1.0 - m), (1.0 - t) * (1.0 + m * 0.5));
  c += (u_lift.rgb + u_lift.a * 0.15) * (1.0 - c);
  c = pow(max(c, 0.0), 1.0 / max(vec3(0.2), 1.0 + u_gamma.rgb * 1.5 + u_gamma.a * 0.5));
  c *= 1.0 + u_gain.rgb * 1.2 + u_gain.a * 0.3;
  float L = luma(c), Lc = clamp(L, 0.0, 1.0);
  float ws = pow(1.0 - Lc, 2.0), wh = Lc * Lc, wb = pow(1.0 - Lc, 5.0), ww = pow(Lc, 5.0);
  float L2 = L + u_shadows * 0.35 * ws * (1.0 - ws * 0.3) + u_highlights * 0.3 * wh + u_whites * 0.25 * ww + u_blacks * 0.2 * wb;
  c = L > 0.0005 ? c * (L2 / L) : c + (L2 - L);
  if (u_contrast > 0.0){ vec3 v = clamp(c, 0.0, 1.0); c += (v * v * (3.0 - 2.0 * v) - v) * u_contrast * 1.6; }
  else { c += (0.5 - c) * (-u_contrast) * 0.5; }
  float amount = u_sat;
  float s0 = rgb2hsv(clamp(c, 0.0, 1.0)).y;
  amount += u_vib * (1.0 - s0) * (1.0 - skin * 0.6);
  if (amount > 0.0) amount *= 1.0 - skin * 0.5;
  L = luma(c); c = L + (c - L) * (1.0 + amount);
  if (u_splitAmt > 0.0){
    float Ls = clamp(luma(c), 0.0, 1.0); float k = u_splitAmt * 0.45;
    c += (u_splitS - 0.5) * pow(1.0 - Ls, 1.5) * k + (u_splitH - 0.5) * pow(Ls, 1.5) * k;
    float L3 = luma(c); if (L3 > 0.001) c *= Ls / L3 * 0.6 + 0.4;
  }
  c = c * (1.0 - u_fade * 0.22) + u_fade * 0.11;
  return c;
}

void main(){
  vec2 uv = warp(camera(v_uv));
  vec3 c = grade(sampleScene(uv));
  if (u_poster > 0.0){ float lv = mix(10.0, 3.0, u_poster); c = floor(c * lv + 0.5) / lv; }
  if (u_duo > 0.0){ c = mix(c, mix(u_duoA, u_duoB, clamp(luma(c), 0.0, 1.0)), u_duo); }
  if (u_thermal > 0.0){
    float l = clamp(luma(c), 0.0, 1.0);
    vec3 th = l < 0.33 ? mix(vec3(0.0, 0.0, 0.4), vec3(0.6, 0.0, 0.7), l * 3.0)
            : l < 0.66 ? mix(vec3(0.6, 0.0, 0.7), vec3(1.0, 0.5, 0.0), (l - 0.33) * 3.0)
            : mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.6), (l - 0.66) * 3.0);
    c = mix(c, th, u_thermal);
  }
  if (u_invert > 0.0) c = mix(c, 1.0 - c, u_invert);
  if (u_hue != 0.0){ vec3 h = rgb2hsv(clamp(c, 0.0, 1.0)); h.x = fract(h.x + u_hue); c = hsv2rgb(h); }
  if (u_old > 0.0){
    float l = luma(c); vec3 sep = vec3(l * 1.07, l * 0.95, l * 0.74);
    c = mix(c, sep, 0.6 * u_old);
    c *= 1.0 + (hash(vec2(floor(u_frame / 2.0), 3.0)) - 0.5) * 0.25 * u_old;
    float sx = hash(vec2(floor(u_frame / 3.0), 70.0));
    if (hash(vec2(floor(u_frame), 60.0)) < 0.6 && abs(v_uv.x - sx) < 0.0012) c = mix(c, vec3(1.0), 0.35 * u_old);
  }
  if (u_vhs > 0.0){
    c = mix(c, vec3(luma(c)), 0.2 * u_vhs);
    c *= 1.0 - 0.22 * u_vhs * step(0.5, fract(v_uv.y * u_outSize.y / 3.0));
    float band = fract(u_time * 0.35);
    if (abs((1.0 - v_uv.y) - band) < 0.025) c += (hash(v_uv * u_outSize + u_frame) - 0.3) * 0.35 * u_vhs;
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

  // Mezcla final: transición entre capas + luces + grano + viñeta + franjas + textos.
  const MIX_FS = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_a, u_b, u_text;
uniform vec2 u_outSize;
uniform float u_p, u_type, u_two, u_time, u_frame, u_hasText;
uniform float u_flash, u_leak, u_letterbox, u_grain, u_vignette, u_bloom;
uniform vec3 u_leakA, u_leakB;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 A(vec2 uv){ return texture2D(u_a, clamp(uv, 0.001, 0.999)).rgb; }
vec3 B(vec2 uv){ return texture2D(u_b, clamp(uv, 0.001, 0.999)).rgb; }
vec2 zoomUV(vec2 uv, float s, float rot){
  vec2 p = (uv - 0.5) * vec2(u_outSize.x / u_outSize.y, 1.0);
  float sn = sin(rot), cs = cos(rot); p = mat2(cs, -sn, sn, cs) * p; p /= s;
  return p / vec2(u_outSize.x / u_outSize.y, 1.0) + 0.5;
}
vec3 blurA(vec2 uv, float r){ vec3 acc = A(uv); for (int i = 0; i < 10; i++){ float a = float(i) * 2.4; acc += A(uv + vec2(cos(a), sin(a)) * r * sqrt((float(i) + 0.5) / 10.0)); } return acc / 11.0; }
vec3 blurB(vec2 uv, float r){ vec3 acc = B(uv); for (int i = 0; i < 10; i++){ float a = float(i) * 2.4; acc += B(uv + vec2(cos(a), sin(a)) * r * sqrt((float(i) + 0.5) / 10.0)); } return acc / 11.0; }

vec3 transition(vec2 uv){
  float p = u_p, e = p * p * (3.0 - 2.0 * p);
  float t = u_type;
  if (t < 0.5) return p < 0.5 ? A(uv) : B(uv);
  if (t < 1.5) return mix(A(uv), B(uv), e);
  if (t < 2.5) return p < 0.5 ? mix(A(uv), vec3(0.0), e * 2.0) : mix(vec3(0.0), B(uv), e * 2.0 - 1.0);
  if (t < 3.5) return p < 0.5 ? mix(A(uv), vec3(1.0), e * 2.0) : mix(vec3(1.0), B(uv), e * 2.0 - 1.0);
  if (t < 4.5) return mix(A(zoomUV(uv, 1.0 + 0.6 * e, 0.0)), B(zoomUV(uv, 1.3 - 0.3 * e, 0.0)), e);
  if (t < 5.5) return mix(A(zoomUV(uv, 1.0 - 0.25 * e, 0.0)), B(zoomUV(uv, 1.4 - 0.4 * e, 0.0)), e);
  if (t < 6.5) return uv.x < 1.0 - e ? A(uv + vec2(e, 0.0)) : B(uv - vec2(1.0 - e, 0.0));
  if (t < 7.5) return uv.x > e ? A(uv - vec2(e, 0.0)) : B(uv + vec2(1.0 - e, 0.0));
  if (t < 8.5) return uv.y > e ? A(uv - vec2(0.0, e)) : B(uv + vec2(0.0, 1.0 - e));
  if (t < 9.5){
    float k = sin(3.14159 * p) * 0.08; vec3 acc = vec3(0.0);
    for (int i = 0; i < 12; i++){
      vec2 q = uv + vec2((float(i) / 11.0 - 0.5) * k, 0.0);
      acc += q.x < 1.0 - e ? A(q + vec2(e, 0.0)) : B(q - vec2(1.0 - e, 0.0));
    }
    return acc / 12.0;
  }
  if (t < 10.5){
    float bl = sin(3.14159 * p) * 0.02;
    return p < 0.5 ? blurA(zoomUV(uv, 1.0 + e * 0.8, e * 1.9), bl) : blurB(zoomUV(uv, 1.8 - e * 0.8, -(1.0 - e) * 1.9), bl);
  }
  if (t < 11.5){
    float k = sin(3.14159 * p); float band = floor(uv.y * 18.0);
    vec2 q = uv + vec2((hash(vec2(band, floor(u_frame))) - 0.5) * 0.25 * k * step(0.6, hash(vec2(band, 9.0 + floor(u_frame)))), 0.0);
    float s = 0.04 * k;
    return p < 0.5 ? vec3(A(q + vec2(s, 0.0)).r, A(q).g, A(q - vec2(s, 0.0)).b) : vec3(B(q + vec2(s, 0.0)).r, B(q).g, B(q - vec2(s, 0.0)).b);
  }
  if (t < 12.5){ float r = sin(3.14159 * p) * 0.04; return p < 0.5 ? blurA(uv, r) : blurB(uv, r); }
  if (t < 13.5){
    vec2 d = (uv - 0.5) * vec2(u_outSize.x / u_outSize.y, 1.0);
    float r = length(d), R = e * 1.05 * length(vec2(u_outSize.x / u_outSize.y, 1.0)) * 0.5;
    return mix(A(uv), B(uv), smoothstep(R + 0.01, R - 0.01, r));
  }
  if (t < 14.5){ float x = e * 1.2 - 0.1; return mix(A(uv), B(uv), smoothstep(x + 0.08, x - 0.08, uv.x)); }
  return mix(A(uv), B(uv), e);
}

void main(){
  vec2 uv = v_uv;
  vec3 c = u_two > 0.5 ? transition(uv) : A(uv);
  float leak = u_leak + (u_two > 0.5 && u_type > 14.5 ? sin(3.14159 * u_p) * 0.9 : 0.0);
  if (leak > 0.0){
    vec2 p1 = vec2(0.5 + 0.55 * sin(u_time * 0.25), 0.5 + 0.45 * cos(u_time * 0.175));
    vec2 p2 = vec2(0.5 + 0.55 * sin(u_time * 0.35 + 2.0), 0.5 + 0.45 * cos(u_time * 0.245 + 1.4));
    vec2 asp = vec2(u_outSize.x / u_outSize.y, 1.0);
    float g1 = max(0.0, 1.0 - length((uv - p1) * asp) / 0.75);
    float g2 = max(0.0, 1.0 - length((uv - p2) * asp) / 0.75);
    vec3 l = u_leakA * g1 * g1 + u_leakB * g2 * g2;
    c = 1.0 - (1.0 - c) * (1.0 - clamp(l * leak, 0.0, 1.0));
  }
  if (u_bloom > 0.0){
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 10; i++){ float a = float(i) * 2.4; acc += max(A(uv + vec2(cos(a), sin(a)) * 0.03 * sqrt((float(i) + 0.5) / 10.0)) - 0.6, 0.0); }
    c += acc / 10.0 * u_bloom * 2.0;
  }
  if (u_vignette > 0.0){
    vec2 d = (uv - 0.5) * vec2(u_outSize.x / u_outSize.y, 1.0) / length(vec2(u_outSize.x / u_outSize.y, 1.0));
    c *= 1.0 - u_vignette * smoothstep(0.25, 0.75, length(d) * 1.4);
  }
  if (u_grain > 0.0){
    float n = hash(floor(uv * u_outSize / 1.5) + vec2(u_frame * 13.0, u_frame * 7.0)) - 0.5;
    c += n * u_grain * 0.22 * (1.0 - abs(c - 0.5));
  }
  if (u_flash > 0.0) c = mix(c, vec3(1.0), clamp(u_flash, 0.0, 1.0));
  if (u_letterbox > 0.0 && (uv.y < u_letterbox || uv.y > 1.0 - u_letterbox)) c = vec3(0.0);
  if (u_hasText > 0.5){ vec4 tx = texture2D(u_text, uv); c = c * (1.0 - tx.a) + tx.rgb; }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Shader: ' + gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'a_pos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Program: ' + gl.getProgramInfoLog(p));
    const uniforms = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      uniforms[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u: uniforms };
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error('Tu navegador no soporta WebGL.');
      this.gl = gl;
      this.layer = program(gl, LAYER_FS);
      this.mix = program(gl, MIX_FS);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      this.srcTex = [this.texture(), this.texture()];
      this.textTex = this.texture();
      this.fbos = [null, null];
      this.resize(canvas.width, canvas.height);
    }
    texture() {
      const gl = this.gl;
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      return t;
    }
    resize(w, h) {
      const gl = this.gl;
      this.canvas.width = w; this.canvas.height = h;
      this.w = w; this.h = h;
      for (let i = 0; i < 2; i++) {
        const tex = this.texture();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        this.fbos[i] = { fb, tex };
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    upload(slot, source, premultiply = false) {
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, slot);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source); return true; }
      catch (e) { return false; }
      finally {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      }
    }

    /// Dibuja una capa (un clip) en el FBO i.
    drawLayer(i, source, srcW, srcH, p) {
      const gl = this.gl;
      const ok = source && srcW > 0 ? this.upload(this.srcTex[i], source) : false;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[i].fb);
      gl.viewport(0, 0, this.w, this.h);
      const { p: prog, u } = this.layer;
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.srcTex[i]);
      gl.uniform1i(u.u_tex, 0);
      gl.uniform2f(u.u_texSize, ok ? srcW : 1, ok ? srcH : 1);
      gl.uniform2f(u.u_outSize, this.w, this.h);
      gl.uniform2f(u.u_focus, p.focusX, p.focusY);
      gl.uniform4f(u.u_cam, p.cam.scale, p.cam.dx, p.cam.dy, p.cam.rot);
      gl.uniform1f(u.u_time, p.time);
      gl.uniform1f(u.u_frame, Math.floor(p.time * 30));
      const g = p.grade;
      const f1 = (name, v) => { if (u[name]) gl.uniform1f(u[name], v || 0); };
      f1('u_exposure', g.exposure); f1('u_contrast', g.contrast); f1('u_highlights', g.highlights);
      f1('u_shadows', g.shadows); f1('u_whites', g.whites); f1('u_blacks', g.blacks);
      f1('u_temp', g.temperature); f1('u_tint', g.tint); f1('u_sat', g.saturation); f1('u_vib', g.vibrance);
      f1('u_fade', g.fade); f1('u_splitAmt', g.splitAmount); f1('u_skin', g.skinProtect); f1('u_sharpen', g.sharpen);
      const wheel = (name, w) => {
        const o = MM.wheelOffset(w);
        if (u[name]) gl.uniform4f(u[name], o[0], o[1], o[2], (w && w.luma) || 0);
      };
      wheel('u_lift', g.lift); wheel('u_gamma', g.gamma); wheel('u_gain', g.gain);
      const sS = MM.hexToRgb(g.splitShadows, [0.5, 0.5, 0.5]), sH = MM.hexToRgb(g.splitHighlights, [0.5, 0.5, 0.5]);
      gl.uniform3f(u.u_splitS, sS[0], sS[1], sS[2]);
      gl.uniform3f(u.u_splitH, sH[0], sH[1], sH[2]);
      const fx = p.fx;
      ['rgb', 'glitch', 'vhs', 'old', 'pixel', 'mirror', 'kaleido', 'poster', 'duo', 'thermal', 'invert', 'hue', 'blur', 'glow']
        .forEach((k) => f1('u_' + k, fx[k]));
      const dA = MM.hexToRgb(fx.duoA || '#1B0B5A'), dB = MM.hexToRgb(fx.duoB || '#FF5F9E');
      gl.uniform3f(u.u_duoA, dA[0], dA[1], dA[2]);
      gl.uniform3f(u.u_duoB, dB[0], dB[1], dB[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /// Mezcla final hacia la pantalla.
    drawMix(m, textCanvas) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.w, this.h);
      const { p: prog, u } = this.mix;
      gl.useProgram(prog);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fbos[0].tex); gl.uniform1i(u.u_a, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.fbos[1].tex); gl.uniform1i(u.u_b, 1);
      let hasText = 0;
      if (textCanvas) {
        gl.activeTexture(gl.TEXTURE2);
        hasText = this.upload(this.textTex, textCanvas, true) ? 1 : 0;
        gl.bindTexture(gl.TEXTURE_2D, this.textTex);
        gl.uniform1i(u.u_text, 2);
      }
      gl.uniform2f(u.u_outSize, this.w, this.h);
      gl.uniform1f(u.u_p, m.progress || 0);
      gl.uniform1f(u.u_type, m.type || 0);
      gl.uniform1f(u.u_two, m.two ? 1 : 0);
      gl.uniform1f(u.u_time, m.time);
      gl.uniform1f(u.u_frame, Math.floor(m.time * 30));
      gl.uniform1f(u.u_hasText, hasText);
      gl.uniform1f(u.u_flash, m.flash || 0);
      gl.uniform1f(u.u_leak, m.leak || 0);
      gl.uniform1f(u.u_letterbox, m.letterbox || 0);
      gl.uniform1f(u.u_grain, m.grain || 0);
      gl.uniform1f(u.u_vignette, m.vignette || 0);
      gl.uniform1f(u.u_bloom, m.bloom || 0);
      const la = MM.hexToRgb(m.leakA || '#FF8A3D'), lb = MM.hexToRgb(m.leakB || '#FF3D7F');
      gl.uniform3f(u.u_leakA, la[0], la[1], la[2]);
      gl.uniform3f(u.u_leakB, lb[0], lb[1], lb[2]);
      gl.activeTexture(gl.TEXTURE0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  }

  MM.TRANSITIONS = ['none', 'crossfade', 'fade_black', 'flash_white', 'zoom_in', 'zoom_out', 'slide_left', 'slide_right',
    'slide_up', 'whip_pan', 'spin', 'glitch', 'blur', 'iris', 'wipe', 'light_leak'];
  MM.Renderer = Renderer;
})();
