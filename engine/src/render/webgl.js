  // ================= WebGL =================
  const glc = document.createElement('canvas');
  glc.width = 64; glc.height = 64;
  const gl = glc.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, depth: false, stencil: false });
  if (!gl) { $('glNote').hidden = false; $('loading').hidden = true; return; }

  const VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec3 aLoc;
layout(location=3) in float aSeed;
uniform mat4 uVP; uniform mat4 uModel;
uniform vec4 uShadow;
out vec3 vN; out vec3 vL; out vec3 vW; out float vSeed; out vec2 vG;
void main(){
  vec4 w = uModel * vec4(aPos, 1.0);
  vW = w.xyz; vL = aLoc; vSeed = aSeed; vN = mat3(uModel) * aNrm;
  vec3 p = w.xyz;
  if (uShadow.w > 0.5) p -= uShadow.xyz * (p.y / uShadow.y);
  vG = p.xz;
  gl_Position = uVP * vec4(p, 1.0);
}`;
  const FS = `#version 300 es
precision highp float;
in vec3 vN; in vec3 vL; in vec3 vW; in float vSeed; in vec2 vG;
uniform vec3 uLight;
uniform vec3 uView;
uniform vec3 uRampA[5];
uniform vec3 uRampB[5];
uniform int uPat;
uniform vec4 uP;
uniform vec4 uQ;
uniform vec4 uR;
uniform vec4 uS;
uniform int uRaw;
uniform int uMode;
uniform vec3 uRV;
uniform float uSc;
uniform sampler2D uDecal;
uniform vec2 uId;
uniform vec4 uGround;
uniform vec4 uFade;
uniform int uFadeOn;
uniform vec3 uSil;
layout(location=0) out vec4 o;
layout(location=1) out vec4 oId;
float h3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
void main(){
  if (uMode == 2 && (vG.x < uGround.x || vG.y < uGround.y || vG.x > uGround.z || vG.y > uGround.w)) discard;
  if (uMode == 1) {
    if (((int(gl_FragCoord.x) + int(gl_FragCoord.y)) & 1) == 1) discard;
    o = vec4(uSil, 1.0); oId = vec4(uId, 0.0, 1.0); return;
  }
  if (uFadeOn == 1 && uMode == 0) {
    vec2 dp = gl_FragCoord.xy - uFade.xy;
    if (dot(dp, dp) < uFade.z && gl_FragCoord.z < uFade.w && ((int(gl_FragCoord.x) + int(gl_FragCoord.y)) & 1) == 0) discard;
  }
  vec3 n = normalize(vN);
  float v = dot(n, uLight) * 0.5 + 0.5;
  v += (h3(floor(vL * uQ.y + 0.5)) - 0.5) * uQ.x;
  int idx = v < 0.30 ? 0 : (v < 0.46 ? 1 : (v < 0.64 ? 2 : (v < 0.82 ? 3 : 4)));
  int li = idx;
  bool useB = false, forced = false, isDecal = false; int shift = 0;
  vec3 decal = vec3(0.0);
  float ax = abs(vL.x);
  if (uPat == 1) {                    // face: eye slits, brows, mouth, beard
    if (vL.z > 0.055) {
      if (vL.y > -0.004 && vL.y < 0.024 && ax > 0.014 && ax < 0.057) {
        idx = 1; forced = true;
        if (vL.y > 0.003 && vL.y < 0.015 && ax > 0.02 && ax < 0.05) idx = 0;
      }
      else if (vL.y > 0.03 && vL.y < 0.048 && ax > 0.01 && ax < 0.062) { useB = true; idx = 1; forced = true; }
      else if (vL.y > -0.058 && vL.y < -0.046 && ax < 0.027 && vL.z > 0.075) { idx = 0; forced = true; }
    }
    if (uP.x > 0.5 && vL.z > 0.0 && !forced) {
      bool beard = vL.y < -0.032 || (vL.y < -0.02 && vL.y > -0.046 && ax < 0.036 && vL.z > 0.07);
      if (beard && h3(floor(vL * 80.0)) > 0.45) useB = true;
    }
  } else if (uPat == 3) {             // zip line
    if (vL.z > 0.0 && ax < uP.x) { useB = true; idx = 3; forced = true; }
  } else if (uPat == 5) {             // sole
    if (vL.y < uP.x) useB = true;
  } else if (uPat == 6) {             // band
    if (vL.y > uP.x && vL.y < uP.y) useB = true;
  } else if (uPat == 7) {             // hair cut-outs
    if (vL.z > uP.x && vL.y < uP.y) discard;
    if (vL.y < uP.z && vL.z > uP.w) discard;
    if (vL.y < uQ.w) discard;
  } else if (uPat == 8) {             // darker cuff
    if (vL.y < uP.x) shift = -1;
  } else if (uPat == 10) {            // emissive / flat
    idx = int(uP.x); forced = true;
  } else if (uPat == 11) {            // armour chest: yellow plate with the radiation trefoil
    vec2 c = vec2(vL.x, vL.y - uP.y);
    if (vL.z > 0.05 && abs(c.x) < uP.x && abs(c.y) < uP.x) {
      useB = true;
      float r = length(c), a = atan(c.y, c.x);
      bool blade = r > uP.z * 0.32 && r < uP.z && mod(a + 6.2832, 2.0944) < 1.0472;
      if (blade || r < uP.z * 0.2) { useB = false; idx = 0; forced = true; }
      else if (abs(c.x) > uP.x - 0.008 || abs(c.y) > uP.x - 0.008) { useB = false; idx = 1; forced = true; }
    }
    if (!useB && !forced && h3(floor(vL * 26.0)) > 0.9) shift = -1;
    if (!useB && !forced && abs(abs(vL.x) - 0.2) < 0.008 && fract(vL.y * 14.0) < 0.3) { idx = 4; forced = true; }
  } else if (uPat == 12) {            // grille
    if (vL.z > uP.x && fract(vL.y * uP.y) < 0.45) { idx = 0; forced = true; }
  } else if (uPat == 13) {            // tank top: bare shoulders and neckline
    if (vL.y > uP.x && ax > uP.y) useB = true;
    if (vL.z > 0.0 && vL.y > uP.z && ax < uP.w) useB = true;
  } else if (uPat == 14) {            // biker jacket
    float halfW = uP.x + max(vL.y - uP.z, 0.0) * uP.y;
    if (vL.z > 0.0) {
      if (ax < halfW) useB = true;
      else if (ax < halfW + 0.017) { idx = 4; forced = true; }
      float py = 0.13 - (ax - 0.075) * 0.55;
      if (!useB && !forced && ax > 0.085 && ax < 0.175 && abs(vL.y - py) < 0.0095) { idx = 4; forced = true; }
    }
    if (!useB && !forced && vL.y < uR.x + 0.035) shift = -1;
    if (!useB && vL.y < uR.x + 0.03 && ax > uR.y) { shift = 0; idx = 4; forced = true; }
  } else if (uPat == 15) {            // glowing screen on a forearm
    if (vL.x * uQ.z > uP.x && vL.y > uP.y && vL.y < uP.z && abs(vL.z) < uP.w) { useB = true; idx = 4; forced = true; }
    else if (h3(floor(vL * 26.0)) > 0.9) shift = -1;
  } else if (uPat == 16) {            // round vent on the back of the pack
    if (vL.z < uP.x) {
      vec2 c = vec2(vL.x, vL.y - uP.y); float r = length(c);
      if (r > uP.z * 0.72 && r < uP.z) { idx = 0; forced = true; }
      else if (r < uP.z * 0.72 && mod(atan(c.y, c.x) + 6.2832, 0.7854) < 0.22) { idx = 0; forced = true; }
      else if (r < uP.z * 0.72) shift = -1;
    }
    if (vL.z > uP.x && h3(floor(vL * 26.0)) > 0.9) shift = -1;
  } else if (uPat == 17) {            // helmet: stripe, visor, rivets
    bool visor = vL.z > uP.z && vL.y > uR.x && vL.y < uR.y && ax < uR.z;
    if (ax < uP.x && vL.y > uP.y && !visor) useB = true;
    if (visor) { idx = 0; forced = true; }
    if (!useB && !visor && abs(vL.y + 0.07) < 0.009 && fract(atan(vL.x, vL.z) * 2.6) < 0.25) { idx = 4; forced = true; }
    if (!useB && !forced && h3(floor(vL * 26.0)) > 0.9) shift = -1;
  } else if (uPat == 19) {            // boot laces
    if (vL.z > uP.x && ax < uP.y && vL.y > uP.z && fract((vL.y + vL.z) * uP.w) < 0.5) { useB = true; idx = 3; forced = true; }
  } else if (uPat == 20) {            // worn armour plate with seams and rivets
    if (h3(floor(vL * 22.0)) > 0.93) useB = true;
    if (uP.x > 0.0) {
      float sl = abs(fract(vL.y * uP.x + 0.5) - 0.5);
      if (sl < 0.05) {
        shift = -1;
        if (fract(atan(vL.x, vL.z) * 2.2) < 0.16) { idx = 4; shift = 0; forced = true; useB = false; }
      }
    }
  } else if (uPat == 21) {            // energy drink can
    float ang = atan(vL.x, vL.z);
    if (vL.y > uP.x && vL.y < uP.y && abs(ang) < 1.5 && fract(ang * 3.1 + 0.5) > 0.25) useB = true;
    vec2 c = vec2(vL.x, vL.y - uP.z); float r = length(c);
    if (vL.z > 0.0 && ((r > uP.w * 0.62 && r < uP.w) || r < uP.w * 0.32)) useB = true;
    if (vL.y > uR.x) { idx = 4; forced = true; }
  } else if (uPat == 22) {            // cigarette pack
    if (ax > uP.x || abs(vL.y) > uP.y) useB = true;
    if (vL.z > 0.0 && ((ax < 0.004 && abs(vL.y) < 0.013) || (abs(vL.y) < 0.004 && ax < 0.013))) useB = true;
    if (abs(vL.y - uP.z) < 0.0028) useB = true;
  } else if (uPat == 23) {            // ribs along local y
    if (fract(vL.y * uP.x) < 0.5) shift = -1;
  } else if (uPat == 24) {            // pocket flap / knee seam
    if (vL.y > uP.x) shift = -1;
  } else if (uPat == 25) {            // side vents
    if (ax > uP.x && fract(vL.z * uP.y) < 0.42 && abs(vL.y) < uP.z) { idx = 0; forced = true; }
  } else if (uPat == 26) {            // rail teeth along z
    if (fract(vL.z * uP.x) < 0.5) shift = -1;
  } else if (uPat == 30) {            // brick wall in world space: courses, staggered joints, odd bricks
    if (abs(n.y) < 0.5) {
      float along = abs(n.x) > abs(n.z) ? vW.z : vW.x;
      float row = floor(vW.y / uP.x);
      float bx = along / uP.y + mod(row, 2.0) * 0.5;
      if (fract(vW.y / uP.x) < uP.z) shift = -1;
      else if (fract(bx) < uP.z * uP.x / uP.y) shift = -1;
      else if (h3(vec3(floor(bx), row, 3.0)) > uP.w) useB = true;
    }
  } else if (uPat == 32) {            // louvre: frame in ramp B, slats along local y
    float fr = min(uP.z - ax, uP.w - abs(vL.y));
    if (fr > uP.y) { float f = fract(vL.y * uP.x); if (f < 0.45) { idx = 0; forced = true; } else if (f > 0.84) { idx = 4; forced = true; } }
    else useB = true;
  } else if (uPat == 33) {            // plaster: thin water streaks under the cornice, a ragged dirty plinth, speckles
    if (abs(n.y) < 0.5) {
      float along = abs(n.x) > abs(n.z) ? vW.z : vW.x;
      float col = floor(along * 26.0);
      float st = h3(vec3(col, 3.0, uP.z));
      if (st > 0.88 && vW.y > uP.x - (0.15 + h3(vec3(col, 5.0, uP.z)) * 1.3)) shift = -1;
      if (vW.y < uP.y + h3(vec3(floor(along * 18.0), 1.0, uP.z)) * 0.12) shift = -1;
    }
    float sp = h3(floor(vW * 15.0) + uP.z);
    if (sp > 0.965) useB = true; else if (sp < 0.025) shift = -1;
  } else if (uPat == 34) {            // roofing felt on top faces: strips, speckles, a few patches
    if (n.y > 0.5) {
      if (fract(vW.x * 1.05) < 0.035) shift = -1;
      float sp = h3(floor(vW * 12.0));
      if (sp > 0.94) shift = 1; else if (sp < 0.07) shift = -1;
      if (h3(floor(vW * vec3(0.9, 1.0, 1.7)) + 2.0) > 0.86 && sp > 0.3) shift = -1;
    }
  } else if (uPat == 35) {            // foliage: leaf marks, clumps, ragged silhouette, yellowing branches
    vec3 pf = vL * uP.y + vSeed * 13.7;
    float hc = h3(floor(pf)), hm = h3(floor(pf * 0.42) + 5.3);
    float facing = dot(n, uView);
    if (facing < uP.z * 1.35 && hm > 0.62) discard;
    if (facing < uP.z && hc > 0.38) discard;
    if (facing < uP.z * 0.45 && hc > 0.1) discard;
    if (hm > 0.95 && hc > 0.45 && facing > 0.5) discard;
    if (hc > 0.84) shift = 1; else if (hc < 0.16 || (hm < 0.2 && hc < 0.45)) shift = -1;
    if (vSeed < uP.x && n.y + (hc - 0.5) * 0.7 > 0.12) useB = true;
  } else if (uPat == 36) {            // tall grass: one blade per screen column, each with its own height
    float col = floor(dot(uRV, vW) * uSc * uP.y);
    float hb = h3(vec3(col, floor(vSeed * 97.0), 5.0));
    float top = uP.x * (0.25 + 0.75 * hb);
    if (vW.y > top) discard;
    float f = vW.y / max(top, 0.01);
    idx = f > 0.84 ? 4 : (f > 0.56 ? 3 : (f > 0.28 ? 2 : 1));
    if (h3(vec3(col, 9.0, floor(vSeed * 31.0))) > 0.8 && idx > 1) idx -= 1;
    forced = true;
    if (f > 0.62 && h3(vec3(col, 2.0, floor(vSeed * 50.0))) < uP.z) useB = true;
  } else if (uPat == 37) {            // planks: boards along local x (p.y = 0) or local y (p.y = 1)
    float pc = uP.y > 0.5 ? vL.x : vL.z, pa = uP.y > 0.5 ? vL.y : vL.x;
    float pl = pc / uP.x;
    if (fract(pl) < 0.16) shift = -1;
    else if (h3(vec3(floor(pa * 9.0), floor(pl), 1.0)) > 0.93) shift = -1;
    else if (h3(vec3(floor(pa * 1.5), floor(pl), 2.0)) > 0.93) useB = true;
  } else if (uPat == 38) {            // painted metal: rust patches and chips
    if (h3(floor(vW * uP.x)) > uP.y) useB = true;
    else if (h3(floor(vW * uP.x * 3.0) + 1.3) > 0.94) shift = -1;
  } else if (uPat == 40) {            // decal from the atlas on the local xy plane of a thin plate
    vec2 uv = vec2(vL.x / (2.0 * uP.x) + 0.5, 0.5 - vL.y / (2.0 * uP.y));
    vec4 t = texture(uDecal, uR.xy + clamp(uv, 0.0, 0.999) * uR.zw);
    if (t.a < 0.5) discard;
    decal = t.rgb; isDecal = true; forced = true;
  } else if (uPat == 41) {            // basketball seams
    if (ax < uP.x || abs(vL.y) < uP.x || abs(abs(vL.z) - uP.y) < uP.x) { idx = 0; forced = true; }
  } else if (uPat == 42) {            // birch bark: white with dark dashes
    float a = atan(vL.x, vL.z);
    if (h3(vec3(floor(vL.y * 11.0), floor(a * 1.6), 4.0)) > 0.76) useB = true;
  } else if (uPat == 43) {            // window: frame and mullions in ramp B, glass with sky streaks and curtains
    float fx = uP.z - ax, fy = uP.w - abs(vL.y), fw = uP.y;
    float leaf = 2.0 * uP.z / uP.x;
    float lx = mod(vL.x + uP.z, leaf);
    bool frame = fx < fw || fy < fw || lx < fw * 0.5 || lx > leaf - fw * 0.5 || vL.z < uR.x;
    if (frame) useB = true;
    else {
      forced = true;
      float st = fract((vL.x * 0.75 + vL.y) * 1.4 + vSeed * 7.0);
      idx = st < 0.08 ? 4 : (st < 0.13 ? 3 : 1);
      if (vSeed > 0.6 && st >= 0.13 && vL.y > -uP.w * 0.2) idx = 2;
      if (fy < fw * 2.4 && vL.y > 0.0) idx = 0;
    }
  } else if (uPat == 44) {            // panel with diagonal slots
    if (ax < uP.y && abs(vL.y) < uP.z && fract((vL.x * uP.w + vL.y) * uP.x) < 0.34) { idx = 0; forced = true; }
  } else if (uPat == 45) {            // panel with an arched opening
    vec2 c2 = vec2(vL.x, vL.y - uP.y);
    if ((abs(c2.x) < uP.x && c2.y < 0.0 && c2.y > -uP.z) || (c2.y >= 0.0 && length(c2) < uP.x)) discard;
  } else if (uPat == 46) {            // net: diamond mesh on a cone
    float a = atan(vL.x, vL.z) * uP.x, y = vL.y * uP.y;
    if (min(abs(fract(a + y) - 0.5), abs(fract(a - y) - 0.5)) > 0.13) discard;
  } else if (uPat == 47) {            // two bands of colour B along local y
    if ((vL.y > uP.x && vL.y < uP.y) || (vL.y > uP.z && vL.y < uP.w)) useB = true;
  } else if (uPat == 48) {            // weathered concrete slab (top faces get joints every p.x metres)
    if (n.y > 0.5 && (fract(vW.x / uP.x) < 0.03 || fract(vW.z / uP.x) < 0.03)) shift = -1;
    float sp = h3(floor(vW * 14.0));
    if (sp > 0.96) shift = -1; else if (sp < 0.03) shift = 1;
  }
  if (uMode == 2) { o = vec4(0.0, 0.0, 0.0, 0.32); oId = vec4(0.0); return; }
  vec3 hv = normalize(uLight + uView);
  float sp = uS.x > 0.0 ? pow(max(dot(n, hv), 0.0), uS.y) * uS.x : 0.0;
  vec3 c;
  if (isDecal) {
    float k = li == 0 ? 0.56 : (li == 1 ? 0.7 : (li == 2 ? 0.86 : (li == 3 ? 1.0 : 1.06)));
    c = uRaw == 1 ? decal * mix(0.56, 1.06, clamp(v, 0.0, 1.0)) : decal * k;
  } else if (uRaw == 1 && !forced) {
    float vv = clamp(v, 0.0, 1.0);
    c = useB ? mix(uRampB[0], uRampB[4], vv) : mix(uRampA[0], uRampA[4], vv);
    if (shift < 0) c *= 0.82; else if (shift > 0) c *= 1.08;
    c += vec3(sp * 0.45);
  } else {
    c = useB ? uRampB[clamp(idx + shift, 0, 4)] : uRampA[clamp(idx + shift, 0, 4)];
    if (!forced && !useB && sp > 0.42) c = mix(uRampA[4], vec3(1.0), 0.28 * uS.x);
  }
  o = vec4(c, 1.0);
  oId = vec4(uId, 0.0, 1.0);
}`;
  const PVS = `#version 300 es
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;
  const PFS = `#version 300 es
precision highp float;
uniform sampler2D uCol;
uniform sampler2D uIdT;
uniform highp sampler2D uDep;
uniform ivec2 uSize;
uniform vec3 uLine;
uniform float uEps;
uniform float uAO;
uniform int uRaw;
uniform int uHover;
uniform vec3 uAccent;
uniform vec4 uShadowCol;
uniform vec4 uFade;
out vec4 o;
const ivec2 OFF[4] = ivec2[4](ivec2(1,0), ivec2(-1,0), ivec2(0,1), ivec2(0,-1));
int idOf(vec4 t){ return int(t.r * 255.0 + 0.5); }
int flOf(vec4 t){ return int(t.g * 255.0 + 0.5); }
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 c = texelFetch(uCol, p, 0);
  bool obj = c.a > 0.5, sh = !obj && c.a > 0.1;
  if (uRaw == 1) { o = obj ? vec4(c.rgb, 1.0) : (sh ? uShadowCol : vec4(0.0)); return; }
  vec4 it = texelFetch(uIdT, p, 0);
  int myId = idOf(it), myFl = flOf(it);
  float d = texelFetch(uDep, p, 0).r;
  vec2 fd = gl_FragCoord.xy - uFade.xy;
  bool inFade = uFade.z > 0.0 && dot(fd, fd) < uFade.z * 1.2;
  bool line = false, edge = false, acc = false;
  vec3 soft = vec3(0.0); int nsoft = 0;
  for (int i = 0; i < 4; i++) {
    ivec2 q = p + OFF[i];
    if (q.x < 0 || q.y < 0 || q.x >= uSize.x || q.y >= uSize.y) continue;
    vec4 cq = texelFetch(uCol, q, 0);
    if (cq.a <= 0.5) continue;
    vec4 iq = texelFetch(uIdT, q, 0);
    float dq = texelFetch(uDep, q, 0).r;
    int qid = idOf(iq), qfl = flOf(iq);
    if (uHover > 0 && qid == uHover && myId != uHover && (!obj || dq < d)) acc = true;
    if ((qfl & 1) != 0) continue;
    if (inFade && (qfl & 8) != 0) continue;
    if ((qfl & 4) != 0) {
      if (!obj) { line = true; soft += cq.rgb; nsoft++; }
      else if ((myFl & 4) == 0 && dq < d - uEps) edge = true;
      continue;
    }
    if (!obj) line = true; else if (dq < d - uEps) edge = true;
  }
  if (acc) { o = vec4(uAccent, 1.0); return; }
  if (!obj) {
    vec3 lc = nsoft > 0 ? mix(uLine, soft / float(nsoft) * 0.32, 0.55) : uLine;
    o = line ? vec4(lc, 1.0) : (sh ? uShadowCol : vec4(0.0)); return;
  }
  int occ = 0;
  for (int dy = -2; dy <= 2; dy++) for (int dx = -2; dx <= 2; dx++) {
    ivec2 q = p + ivec2(dx, dy);
    if ((dx == 0 && dy == 0) || q.x < 0 || q.y < 0 || q.x >= uSize.x || q.y >= uSize.y) continue;
    if (texelFetch(uCol, q, 0).a < 0.5) continue;
    int qf = flOf(texelFetch(uIdT, q, 0));
    if ((qf & 1) != 0 || ((qf & 4) != 0 && (myFl & 4) != 0) || (inFade && (qf & 8) != 0)) continue;
    float dq = texelFetch(uDep, q, 0).r;
    if (dq < d - uAO) occ++;
  }
  vec3 rgb = c.rgb;
  if (occ >= 6) rgb *= 0.8;
  o = vec4((edge && !(inFade && (myFl & 8) != 0)) ? mix(rgb, uLine, 0.5) : rgb, 1.0);
}`;
  function compile(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs, names) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; for (const n of names) u[n] = gl.getUniformLocation(p, n);
    return { p, u };
  }
  const P3 = program(VS, FS, ['uVP', 'uModel', 'uShadow', 'uLight', 'uView', 'uRampA', 'uRampB', 'uPat', 'uP', 'uQ', 'uR', 'uS', 'uRaw', 'uMode', 'uRV', 'uSc', 'uDecal', 'uId', 'uGround', 'uFade', 'uFadeOn', 'uSil']);
  const PP = program(PVS, PFS, ['uCol', 'uIdT', 'uDep', 'uSize', 'uLine', 'uEps', 'uAO', 'uRaw', 'uHover', 'uAccent', 'uShadowCol', 'uFade']);
  const fsVAO = gl.createVertexArray();
  const LIGHT = nrm(add(add(scl(RV, -0.9), [0, 0.9, 0]), scl(FV, -0.25)));
  const SUN = nrm([-0.15, 1, 0.72]);           // shadows fall up and to the right on screen
  const LINE = [22 / 255, 16 / 255, 14 / 255];
  const SIL = [0.89, 0.6, 0.27];
  gl.vertexAttrib1f(3, 0.0);

  function upload(m) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const buf = (data, loc, size) => {
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data instanceof Float32Array ? data : new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return b;
    };
    const bp = buf(m.pos, 0, 3); buf(m.nrm, 1, 3);
    if (m.loc) buf(m.loc, 2, 3); else { gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0); }
    if (m.seed) buf(m.seed, 3, 1); else gl.disableVertexAttribArray(3);
    const nv = m.pos.length / 3, big = nv > 65535;
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, big ? new Uint32Array(m.idx) : new Uint16Array(m.idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, n: m.idx.length, type: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, mode: m.lines ? gl.LINES : gl.TRIANGLES };
  }
  const meshCache = new Map();
  const getMesh = (key, fn) => { let m = meshCache.get(key); if (!m) { m = upload(fn()); meshCache.set(key, m); } return m; };
  const rawCache = new Map();
  const rawMesh = (key, fn) => { let m = rawCache.get(key); if (!m) { m = fn(); rawCache.set(key, m); } return m; };

  // ---- decal atlas (filled by the decal module before the first render) ----
  const decalTex = gl.createTexture();
  function uploadDecals(cv) {
    gl.bindTexture(gl.TEXTURE_2D, decalTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // ---- render targets: colour + object ids + depth ----
  const makeTarget = () => ({ fbo: null, col: null, ids: null, dep: null, w: 0, h: 0 });
  function ensureTarget(t, w, h) {
    if (t.fbo && w <= t.w && h <= t.h) return;
    t.w = Math.max(w, t.w, 64); t.h = Math.max(h, t.h, 64);
    if (t.fbo) { gl.deleteFramebuffer(t.fbo); gl.deleteTexture(t.col); gl.deleteTexture(t.ids); gl.deleteTexture(t.dep); }
    const mk = (ifmt, fmt, type) => {
      const x = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, x);
      gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, t.w, t.h, 0, fmt, type, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return x;
    };
    t.col = mk(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    t.ids = mk(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    t.dep = mk(gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT);
    t.fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.col, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, t.ids, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t.dep, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  const TGT_STAGE = makeTarget(), TGT_SMALL = makeTarget();
  function viewProj(v) {
    const s = v.s, A = v.A || [0, 0, 0], m = new Float32Array(16);
    const kx = 2 * s / v.w, ky = 2 * s / v.h;
    m[0] = kx * RV[0]; m[4] = kx * RV[1]; m[8] = kx * RV[2]; m[12] = (2 / v.w) * (v.ax - s * dot(RV, A)) - 1;
    m[1] = ky * UV[0]; m[5] = ky * UV[1]; m[9] = ky * UV[2]; m[13] = 1 - (2 / v.h) * (v.ay + s * dot(UV, A));
    m[2] = FV[0] / DZ; m[6] = FV[1] / DZ; m[10] = FV[2] / DZ; m[14] = -dot(FV, A) / DZ;
    m[15] = 1;
    return m;
  }
  // depth of a world point in the window depth range, as gl_FragCoord.z sees it
  const depthOf = (v, P) => (dot(FV, sub(P, v.A || [0, 0, 0])) / DZ) * 0.5 + 0.5;
  const GROUND_BOUNDS = new Float32Array([0, 0, 30, 30]);
  let drawCalls = 0;
  function drawList(list) {
    const u = P3.u;
    let lastMat = null, lastModel = null, lastId = -1, lastFade = -1;
    for (const it of list) {
      if (it.model !== lastModel) { gl.uniformMatrix4fv(u.uModel, false, it.model); lastModel = it.model; }
      const m = it.mat;
      if (m !== lastMat) {
        gl.uniform3fv(u.uRampA, m.a); gl.uniform3fv(u.uRampB, m.b);
        gl.uniform1i(u.uPat, m.pat); gl.uniform4fv(u.uP, m.p); gl.uniform4fv(u.uQ, m.q); gl.uniform4fv(u.uR, m.r); gl.uniform4fv(u.uS, m.s);
        lastMat = m;
      }
      const idv = (it.id || 0) * 256 + (it.flags || 0);
      if (idv !== lastId) { gl.uniform2f(u.uId, (it.id || 0) / 255, (it.flags || 0) / 255); lastId = idv; }
      const fd = it.fade ? 1 : 0;
      if (fd !== lastFade) { gl.uniform1i(u.uFadeOn, fd); lastFade = fd; }
      gl.bindVertexArray(it.mesh.vao);
      gl.drawElements(it.mesh.mode, it.mesh.n, it.mesh.type, 0);
      drawCalls++;
    }
  }
  // L = { shadow: [...], main: [...], hero: [...] }; o = { xray, hover, fade: [x, y, r2, depth] }
  function render3D(T, v, L, raw, ctx, dx, dy, o = {}) {
    ensureTarget(T, v.w, v.h);
    if (glc.width < v.w || glc.height < v.h) { glc.width = Math.max(glc.width, v.w); glc.height = Math.max(glc.height, v.h); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.fbo);
    gl.viewport(0, 0, v.w, v.h);
    gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, v.w, v.h);
    gl.depthMask(true);
    gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]); gl.clearBufferfv(gl.COLOR, 1, [0, 0, 0, 0]); gl.clearBufferfv(gl.DEPTH, 0, [1]);
    gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
    gl.useProgram(P3.p);
    const u = P3.u;
    gl.uniformMatrix4fv(u.uVP, false, viewProj(v));
    gl.uniform3fv(u.uLight, LIGHT);
    gl.uniform1i(u.uRaw, raw ? 1 : 0);
    gl.uniform3fv(u.uRV, RV); gl.uniform1f(u.uSc, v.s);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, decalTex); gl.uniform1i(u.uDecal, 3);
    gl.uniform4fv(u.uGround, GROUND_BOUNDS);
    const fade = o.fade || [0, 0, 0, 0];
    gl.uniform4f(u.uFade, fade[0], fade[1], fade[2], fade[3]);
    gl.uniform3fv(u.uSil, SIL);
    if (L.shadow && L.shadow.length) {
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
      gl.uniform1i(u.uMode, 2); gl.uniform4f(u.uShadow, SUN[0], SUN[1], SUN[2], 1); gl.uniform3fv(u.uView, SUN);
      drawList(L.shadow);
    }
    gl.uniform4f(u.uShadow, 0, 1, 0, 0); gl.uniform3fv(u.uView, TOCAM);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
    gl.uniform1i(u.uMode, 0);
    // big occluders first, then the hero's see-through silhouette, then everything else, then the hero
    if (L.occ) drawList(L.occ);
    if (L.hero && L.hero.length && o.xray && L.occ && L.occ.length) {
      gl.depthFunc(gl.GREATER); gl.depthMask(false); gl.uniform1i(u.uMode, 1);
      drawList(L.hero);
      gl.depthFunc(gl.LESS); gl.depthMask(true); gl.uniform1i(u.uMode, 0);
    }
    drawList(L.main || []);
    if (L.hero && L.hero.length) drawList(L.hero);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, v.w, v.h); gl.scissor(0, 0, v.w, v.h);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(PP.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.col);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, T.ids);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, T.dep);
    gl.uniform1i(PP.u.uCol, 0); gl.uniform1i(PP.u.uIdT, 1); gl.uniform1i(PP.u.uDep, 2);
    gl.uniform2i(PP.u.uSize, v.w, v.h); gl.uniform3fv(PP.u.uLine, LINE);
    gl.uniform1f(PP.u.uEps, 0.07 / (2 * DZ)); gl.uniform1f(PP.u.uAO, 0.022 / (2 * DZ)); gl.uniform1i(PP.u.uRaw, raw ? 1 : 0);
    gl.uniform1i(PP.u.uHover, o.hover || 0); gl.uniform3fv(PP.u.uAccent, o.accent || [0.89, 0.6, 0.27]);
    gl.uniform4f(PP.u.uShadowCol, 0.035, 0.05, 0.11, 0.3);
    gl.uniform4f(PP.u.uFade, fade[0], fade[1], fade[2], fade[3]);
    gl.bindVertexArray(fsVAO); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindVertexArray(null);
    gl.activeTexture(gl.TEXTURE0);
    if (ctx) ctx.drawImage(glc, 0, glc.height - v.h, v.w, v.h, dx, dy, v.w, v.h);
  }
  // object id under a pixel of the last render into a target (x, y from the top-left)
  const pickBuf = new Uint8Array(4);
  function pickAt(T, v, x, y) {
    if (!T.fbo) return { id: 0, flags: 0 };
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= v.w || y >= v.h) return { id: 0, flags: 0 };
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, T.fbo);
    gl.readBuffer(gl.COLOR_ATTACHMENT1);
    gl.readPixels(x, v.h - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pickBuf);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    return { id: pickBuf[0], flags: pickBuf[1] };
  }

