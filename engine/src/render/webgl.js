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
uniform vec4 uWind;     // x: sway in metres at the reference height, y: 1 / reference height, z: speed, w: share of the fast flutter
uniform float uTime;
out vec3 vN; out vec3 vL; out vec3 vW; out float vSeed; out vec2 vG; out vec3 vS;
void main(){
  vec4 w = uModel * vec4(aPos, 1.0);
  vW = w.xyz; vL = aLoc; vSeed = aSeed; vN = mat3(uModel) * aNrm;
  vec3 p = w.xyz;
  if (uWind.x > 0.0) {
    // plants lean along the screen's horizontal: slow sway plus a gusty flutter that rolls across the yard
    float k = clamp(p.y * uWind.y, 0.0, 1.6); k *= k;
    float ph = dot(p.xz, vec2(0.37, 0.23)) + aSeed * 6.2831;
    float gust = 0.55 + 0.45 * sin(uTime * 0.55 + p.x * 0.13 - p.z * 0.09);
    float s = sin(uTime * uWind.z + ph) * (1.0 - uWind.w) * gust + sin(uTime * uWind.z * 2.7 + ph * 1.9) * uWind.w * gust;
    p += vec3(0.7071, 0.0, -0.7071) * (uWind.x * k * s);
  }
  vS = p;
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
uniform vec3 uPU;
uniform vec3 uPV;
uniform sampler2D uLeaf;
uniform int uShadowOn;
uniform mat4 uLVP;
uniform highp sampler2DShadow uShadowTex;
uniform vec3 uSun;
uniform vec3 uAmb;      // shade level: base, extra for faces looking at the sky, depth bias of the sun lookup
// the time of day: tints of the sunlit and the shaded parts, how strong shadows are, lit windows, lamps
uniform vec3 uSunTint;
uniform vec3 uShadeTint;
uniform float uShadowK;
uniform float uSat;     // colour saturation of the hour: grey-blue at night, a little richer in the golden hour
uniform vec4 uWin;      // x: share of lit windows, y: time in seconds, z: night 0…1
uniform int uNL;
uniform vec4 uLP[12];   // lamp: position, reach in metres
uniform vec4 uLC[12];   // colour, strength
uniform vec4 uLD[12];   // the way it shines, cosine of the edge of its cone (−2: all round)
in vec3 vS;
layout(location=0) out vec4 o;
layout(location=1) out vec4 oId;
float h3(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
// smooth value noise (camouflage blotches)
float vn3(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y);
  float b = mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y);
  return mix(a, b, f.z);
}
const float BY4[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
float bayer(){ ivec2 q = ivec2(gl_FragCoord.xy) & 3; return (BY4[q.y * 4 + q.x] + 0.5) / 16.0; }
// light of the lamps at a point, in three steps with a dithered edge, like the rest of the palette
vec3 lampsAt(vec3 p, vec3 n){
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    if (i >= uNL) break;
    vec3 d = uLP[i].xyz - p; float dist = length(d), r = uLP[i].w;
    if (dist >= r) continue;
    vec3 l = d / max(dist, 1e-4);
    float att = 1.0 - dist / r; att *= att;
    float lam = clamp(dot(n, l) * 0.7 + 0.3, 0.0, 1.0);
    float cone = uLD[i].w < -1.5 ? 1.0 : smoothstep(uLD[i].w, uLD[i].w + 0.1, dot(-l, uLD[i].xyz));
    acc += uLC[i].rgb * (uLC[i].w * att * lam * cone);
  }
  float m = max(acc.r, max(acc.g, acc.b));
  if (m <= 0.002) return vec3(0.0);
  return acc * (floor(m * 3.0 + bayer()) / 3.0 / m);
}
// a window lit from inside at night: warm light, now and then the blue flicker of a television; each window decides by its own seed
bool windowLit(float share){ return share > 0.0 && fract(vSeed * 91.7 + floor(uWin.y / 47.0 + vSeed * 7.0) * 0.371) < share; }
vec3 roomLight(float y){
  if (fract(vSeed * 53.3) < 0.2) { float f = h3(vec3(floor(uWin.y * 3.0 + vSeed * 17.0), vSeed * 31.0, 2.0)); return mix(vec3(0.42, 0.56, 0.95), vec3(0.78, 0.84, 1.0), f) * (0.72 + 0.28 * f); }
  return mix(vec3(1.0, 0.8, 0.48), vec3(1.0, 0.9, 0.66), fract(vSeed * 13.1)) * (0.9 + 0.1 * y);
}
// 1 where the sun reaches this point, 0 in shade. uS.z = 1: thin stuff (grass) that is lit from both sides
float sunVis(vec3 n){
  float ndl = dot(n, uSun);
  bool thin = uS.z > 0.5;
  if (ndl <= 0.0 && !thin) return 0.0;
  vec3 wp = vS + (thin ? uSun * 0.05 : n * 0.045 + uSun * 0.012);
  vec4 lp = uLVP * vec4(wp, 1.0);
  vec3 sc = lp.xyz * 0.5 + 0.5;
  if (sc.x < 0.0 || sc.y < 0.0 || sc.x > 1.0 || sc.y > 1.0 || sc.z > 1.0) return 1.0;
  return texture(uShadowTex, vec3(sc.xy, sc.z - uAmb.z));
}
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
  float nz = (h3(floor(vL * uQ.y + 0.5)) - 0.5) * uQ.x;
  float v = dot(n, uLight) * 0.5 + 0.5 + nz;
  float sv = 1.0;
  if (uShadowOn == 1 && uMode == 0) {
    sv = mix(1.0, sunVis(n), uShadowK);
    v = min(v, mix(uAmb.x + uAmb.y * n.y + nz, v, sv));
  }
  int idx = v < 0.30 ? 0 : (v < 0.46 ? 1 : (v < 0.64 ? 2 : (v < 0.82 ? 3 : 4)));
  int li = idx;
  bool useB = false, forced = false, isDecal = false, glow = false, lit = false; int shift = 0;
  vec3 gcol = vec3(0.0), lcol = vec3(0.0);
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
  } else if (uPat == 10) {            // flat; tone 4 glows (lamps, lenses, the cigarette tip) and keeps its colour at night
    idx = int(uP.x); forced = true;
    if (uP.x > 3.5) { glow = true; gcol = uRampA[4]; }
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
    if (vL.x * uQ.z > uP.x && vL.y > uP.y && vL.y < uP.z && abs(vL.z) < uP.w) { useB = true; idx = 4; forced = true; glow = true; gcol = uRampB[4]; }
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
      float dirt = uR.x + 0.9 - vW.y;                              // damp and dirt over the plinth
      if (dirt > 0.0 && h3(floor(vW * 26.0)) < dirt * 0.55) shift = -1;
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
  } else if (uPat == 35) {            // foliage: separate leaves as seen from the eye (or the sun), lit on their upper-left side, dark gaps, ragged edge
    vec2 q = vec2(dot(uPU, vW), dot(uPV, vW)) * uP.y + vSeed * 31.7;
    vec4 lt = texelFetch(uLeaf, ivec2(fract(q / 16.0) * 256.0), 0);  // r: cell hash, g: how much the pixel faces the light, b: distance to the leaf centre, a: leaf hash
    float best = lt.b, lit = lt.g * 2.0 - 1.0, bh = lt.a;
    float edge = clamp(dot(n, uView) / max(uP.z, 0.01), 0.0, 1.0);   // 0 at the silhouette of the clump
    float rr = uP.w;
    if (best > rr) {                                                    // between leaves: a hole near the edge or now and then, a dark gap inside
      if (edge < 0.9 || lt.r > uR.x) discard;
      idx = max(idx - 2, 0); forced = true;
    } else {
      if (edge < 0.55 && best > rr * (0.35 + edge)) discard;              // leaves thin out towards the edge
      if (best > rr * 0.42 && lit > 0.3) shift = 1; else if (best > rr * 0.55 && lit < -0.5) shift = -1;
      if (bh < 0.12) shift -= 1; else if (bh > 0.92) shift += 1;
    }
    if (bh < uP.x * (vSeed < uP.x ? 2.6 : 0.6)) useB = true;           // turning leaves, more of them on some clumps
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
  } else if (uPat == 49) {            // window glass, vL in −1…1: sky streaks over a dark room; tulle, drapes or blinds in the curtain colour (ramp B)
    float ty = fract(vSeed * 13.7);
    float st = fract((vL.x * 0.55 + vL.y) * 1.15 + vSeed * 7.0);
    idx = st < 0.07 ? 4 : (st < 0.12 ? 3 : 1);
    if (vL.y < -0.5 && st >= 0.12) idx = 0;
    forced = true;
    if (ty < 0.3) { if (vL.y < 0.9) { useB = true; idx = fract(vL.x * 9.0) < 0.5 ? 3 : 2; if (vL.y < -0.85) idx = 1; } }
    else if (ty < 0.56) { if (abs(vL.x) > 0.6) { useB = true; idx = fract(vL.x * 7.0) < 0.5 ? 2 : 3; } }
    else if (ty < 0.68) { useB = true; idx = fract(vL.y * 12.0) < 0.5 ? 3 : 2; }
    else if (ty < 0.76) { if (vL.y > 0.35 && abs(vL.x + 0.3) < 0.18) { useB = true; idx = 4; } }
    if (windowLit(uWin.x)) { lit = true; vec3 rl = roomLight(vL.y); lcol = useB ? uRampB[4] * mix(vec3(1.0), rl, 0.6) * (idx < 3 ? 0.82 : 1.0) : rl; }
  } else if (uPat == 50) {            // machine armour in part-local space, so it travels with the part: plate seams, rivets along them, chipped paint, rust runs, mud
    float hs = uP.x > 0.0 ? abs(fract(vL.y * uP.x + 0.5) - 0.5) / uP.x : 9.0;
    float vs = uP.y > 0.0 ? abs(fract((vL.x + vL.z) * uP.y + 0.5) - 0.5) / uP.y : 9.0;
    float sd = min(hs, vs);
    if (sd < 0.01) { idx = max(idx - 2, 0); forced = true; }
    else if (uP.z > 0.0 && sd < 0.032 && sd > 0.016 && fract((hs < vs ? (vL.x + vL.z) : vL.y) * uP.z) < 0.25) { idx = min(idx + 1, 4); forced = true; }
    if (!forced) {
      float ch = h3(floor(vL * 37.0) + vSeed * 7.0);
      if (ch > 1.0 - uP.w * 0.06) useB = true;
      else if (ch < uP.w * 0.05) shift = 1;
      float rs = h3(vec3(floor((vL.x + vL.z) * 32.0), 3.0, floor(vSeed * 50.0)));
      if (uP.x > 0.0 && rs > 0.86 && fract(vL.y * uP.x + 0.5) > 0.55 && fract(vL.y * uP.x + 0.5) < 0.55 + uP.w * 0.35) useB = true;
      if (uR.y > 0.0 && h3(floor(vL * 24.0) + 1.7) < uR.y) shift = -1;
    }
  } else if (uPat == 51) {            // car greenhouse: roof, pillars and window line in body colour (B), glass with sky streaks elsewhere
    float sx = abs(n.x), sz = abs(n.z);
    bool roof = n.y > 0.72;
    bool pillar = (sx > 0.22 && sz > 0.22 && abs(sx - sz) < 0.45) || (sx > 0.6 && abs(vL.z - uP.x) < uP.y) || (sx > 0.6 && uP.z > -9.0 && abs(vL.z - uP.z) < uP.y * 0.8);
    if (roof || pillar || vL.y < uP.w + 0.03) useB = true;
    else {
      forced = true;
      float st = fract((vL.z * 0.6 + vL.y * 1.3) * 1.6 + vSeed * 5.0);
      idx = st < 0.09 ? 4 : (st < 0.15 ? 3 : 1);
      if (vL.y < uP.w + 0.17 && st >= 0.15) idx = 0;
    }
  } else if (uPat == 52) {            // car body: door shut lines at local z = p.x, p.y, p.z above y = r.y; road grime below y = r.x
    if (abs(n.x) > 0.5 && vL.y > uR.y) {
      float d1 = min(abs(vL.z - uP.x), min(abs(vL.z - uP.y), abs(vL.z - uP.z)));
      if (d1 < 0.014) { idx = max(idx - 2, 0); forced = true; }
    }
    if (!forced && vL.y < uR.x && h3(floor(vL * 30.0)) < (uR.x - vL.y) * 3.0) shift = -1;
  } else if (uPat == 39) {            // a grass tuft on a card facing the camera: a blade per screen column, dome-shaped, lighter tips, some dry
    float col = floor(dot(uRV, vW) * uSc);
    float hb = h3(vec3(col, floor(vSeed * 97.0), 5.0));
    float u = vL.x * 2.0;
    if (abs(u) > 0.55 && h3(vec3(col, 4.0, floor(vSeed * 71.0))) > 0.5) discard;
    float top = (0.3 + 0.7 * hb) * (1.0 - u * u * 0.7);
    if (vL.y > top) discard;
    float f = vL.y / max(top, 0.01);
    idx = f > 0.86 ? 4 : (f > 0.62 ? 3 : (f > 0.3 ? 2 : (f > 0.12 ? 1 : 0)));
    if (h3(vec3(col, 9.0, floor(vSeed * 31.0))) > 0.74 && idx > 1) idx -= 1;
    forced = true;
    if (f > 0.5 && h3(vec3(col, 2.0, floor(vSeed * 50.0))) < uP.z) useB = true;
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
      if (windowLit(uWin.x * 1.15)) { lit = true; lcol = roomLight(vL.y / max(uP.w, 0.01)) * (fy < fw * 2.4 && vL.y > 0.0 ? 0.8 : 1.0); }
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
  } else if (uPat == 53) {            // camouflage in part-local space: blotches of ramp B and of dark brown over the base, light flecks
                                      // p: blotches per metre, thresholds for B and for brown, how rare the flecks are; r.x: webbing rows per metre (0: none)
    vec3 q = vL * uP.x + vec3(vSeed * 17.0, vSeed * 5.0, vSeed * 11.0);
    float n1 = vn3(q), n2 = vn3(q * 1.37 + 31.7);
    if (n1 > uP.y) useB = true;
    else if (n2 > uP.z) shift = -2;
    else if (h3(floor(vL * uP.x * 2.7) + 5.1) > uP.w) shift = 1;
    if (uR.x > 0.0 && fract(vL.y * uR.x) < 0.2) shift = min(shift, 0) - 1;
  } else if (uPat == 54) {            // smoked visor: dark glass with a band of sky reflection across it (p.xy: its direction, p.z: where, p.w: half width)
    if (abs(vL.x * uP.x + vL.y * uP.y - uP.z) < uP.w) shift = 2;
  } else if (uPat == 55) {            // a box with a louvred vent on its +z face: p.x where the face is, p.y half width, p.zw rows from … to in y; r.x louvres per metre
    if (vL.z > uP.x && ax < uP.y && vL.y > uP.z && vL.y < uP.w) { idx = fract(vL.y * uR.x) < 0.5 ? 0 : 1; forced = true; }
    else if (h3(floor(vL * 30.0)) > 0.93) shift = -1;
  }
  if (uMode == 3) { o = vec4(0.0); oId = vec4(0.0); return; }
  if (uMode == 2) { o = vec4(0.0, 0.0, 0.0, 0.32); oId = vec4(0.0); return; }
  if (forced && !isDecal && uPat != 10 && sv < 0.5) idx = max(idx - 2, 0);
  vec3 hv = normalize(uLight + uView);
  float sp = uS.x > 0.0 ? pow(max(dot(n, hv), 0.0), uS.y) * uS.x * sv : 0.0;
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
  if (glow) c = gcol;
  else {
    // the hour: sunlit and shaded parts take their tints, lamps nearby add their light to the colour of the thing itself
    vec3 base = isDecal ? decal : (useB ? uRampB[3] : uRampA[3]);
    vec3 tint = mix(uShadeTint, uSunTint, sv);
    int flg = int(uId.y * 255.0 + 0.5);
    if (abs(uId.x * 255.0 - 1.0) < 0.5 || (flg & 16) != 0) tint = max(tint, vec3(0.6, 0.64, 0.78));     // the hero (id 1) and other people (flag 16) stay readable at night
    c = mix(vec3(dot(c, vec3(0.3, 0.59, 0.11))), c, uSat) * tint;
    if (uNL > 0) c += base * lampsAt(vS, n) * 0.9;
    if (lit) c = mix(c, lcol, clamp(0.35 + uWin.z * 0.8, 0.0, 1.0));     // a lit window: faint by day, bright at night
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
uniform int uGroundOn;                 // 0: no ground here, 1: texel-exact, 2: filtered (overview)
uniform sampler2D uGroundTex;
uniform vec4 uGMap;                    // ground canvas origin and size, world art px
uniform vec4 uView2;                   // view offset (ax, ay), world art px per target px, view height
uniform int uSunOn;
uniform mat4 uLVP;
uniform highp sampler2DShadow uShadowTex;
uniform float uBias;
uniform vec3 uShadeMul;                // ground colour in the shade
uniform vec4 uTarget;                  // walk target: x, z, radius, on
uniform int uGrid;
uniform vec2 uMapWH;
uniform vec3 uSunTint;
uniform vec3 uShadeTint;
uniform float uShadowK;
uniform float uSat;
uniform int uNL;
uniform vec4 uLP[12];
uniform vec4 uLC[12];
uniform vec4 uLD[12];
uniform vec4 uMist;                    // x: how thick, y: time in seconds, z: metres per target px, w: on
uniform vec3 uMistCol;
uniform vec3 uRV3;
uniform vec3 uUV3;
uniform vec3 uFV3;
uniform float uDZ;
out vec4 o;
const float BY4[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
float bayer(){ ivec2 q = ivec2(gl_FragCoord.xy) & 3; return (BY4[q.y * 4 + q.x] + 0.5) / 16.0; }
vec3 lampsAt(vec3 p, vec3 n){
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    if (i >= uNL) break;
    vec3 d = uLP[i].xyz - p; float dist = length(d), r = uLP[i].w;
    if (dist >= r) continue;
    vec3 l = d / max(dist, 1e-4);
    float att = 1.0 - dist / r; att *= att;
    float lam = clamp(dot(n, l) * 0.7 + 0.3, 0.0, 1.0);
    float cone = uLD[i].w < -1.5 ? 1.0 : smoothstep(uLD[i].w, uLD[i].w + 0.1, dot(-l, uLD[i].xyz));
    acc += uLC[i].rgb * (uLC[i].w * att * lam * cone);
  }
  float m = max(acc.r, max(acc.g, acc.b));
  if (m <= 0.002) return vec3(0.0);
  return acc * (floor(m * 3.0 + bayer()) / 3.0 / m);
}
float hh2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hh2(i), hh2(i + vec2(1.0, 0.0)), f.x), mix(hh2(i + vec2(0.0, 1.0)), hh2(i + vec2(1.0, 1.0)), f.x), f.y); }
// the world point under this pixel at a depth (window range), and on the ground
vec3 worldAt(float d){ vec2 fp = vec2(gl_FragCoord.x, uView2.w - gl_FragCoord.y); return uRV3 * ((fp.x - uView2.x) * uMist.z) + uUV3 * ((uView2.y - fp.y) * uMist.z) + uFV3 * ((2.0 * d - 1.0) * uDZ); }
vec3 groundPt(){ vec2 fp = vec2(gl_FragCoord.x, uView2.w - gl_FragCoord.y); vec2 wp = (fp - uView2.xy) * uView2.z; float a = wp.x / 54.0, b = wp.y / 27.0; return vec3((a + b) * 0.5, 0.0, (b - a) * 0.5); }
// low mist that lies in hollows and thins out upwards, drifting slowly; dithered in four steps
vec4 misty(vec4 col, vec3 P){
  if (uMist.w < 0.5 || col.a < 0.5) return col;
  float n = vn2(P.xz * 0.23 + vec2(uMist.y * 0.045, uMist.y * 0.017)) * 0.6 + vn2(P.xz * 0.61 - vec2(uMist.y * 0.03, 0.0)) * 0.4;
  float m = uMist.x * exp(-max(P.y, 0.0) / 0.85) * smoothstep(0.22, 0.72, n);
  float q = floor(m * 4.0 + bayer()) / 4.0;
  return vec4(mix(col.rgb, uMistCol, q * 0.62), col.a);
}
const ivec2 OFF[4] = ivec2[4](ivec2(1,0), ivec2(-1,0), ivec2(0,1), ivec2(0,-1));
int idOf(vec4 t){ return int(t.r * 255.0 + 0.5); }
int flOf(vec4 t){ return int(t.g * 255.0 + 0.5); }
// the painted ground under a pixel no object covers, in the shade where the sun is blocked
vec4 groundHere(){
  vec2 fp = vec2(gl_FragCoord.x, uView2.w - gl_FragCoord.y);
  vec2 wp = (fp - uView2.xy) * uView2.z;
  vec2 g = wp - uGMap.xy;
  vec4 gc;
  if (uGroundOn == 1) {
    ivec2 gi = ivec2(floor(g));
    if (gi.x < 0 || gi.y < 0 || gi.x >= int(uGMap.z) || gi.y >= int(uGMap.w)) return vec4(0.0);
    gc = texelFetch(uGroundTex, gi, 0);
    if (gc.a < 0.5) return vec4(0.0);
  } else {
    if (g.x < 0.0 || g.y < 0.0 || g.x > uGMap.z || g.y > uGMap.w) return vec4(0.0);
    gc = texture(uGroundTex, g / uGMap.zw);
    if (gc.a < 0.02) return vec4(0.0);
  }
  float a = wp.x / 54.0, b = wp.y / 27.0;
  vec2 xz = vec2(a + b, b - a) * 0.5;
  vec3 c = mix(vec3(dot(gc.rgb, vec3(0.3, 0.59, 0.11))), gc.rgb, uSat);
  if (uSunOn == 1) {
    vec4 lp = uLVP * vec4(xz.x, 0.0, xz.y, 1.0);
    vec3 sc = lp.xyz * 0.5 + 0.5;
    float lit = (sc.x < 0.0 || sc.y < 0.0 || sc.x > 1.0 || sc.y > 1.0) ? 1.0 : texture(uShadowTex, vec3(sc.xy, sc.z - uBias));
    lit = mix(1.0, lit, uShadowK);
    c = c * mix(uShadeMul * uShadeTint, uSunTint, lit);
  } else c *= uSunTint;
  if (uNL > 0) c += gc.rgb * lampsAt(vec3(xz.x, 0.0, xz.y), vec3(0.0, 1.0, 0.0)) * 0.9;
  float pw = 0.0105 * uView2.z;
  if (uGrid == 1 && xz.x >= -pw && xz.y >= -pw && xz.x <= uMapWH.x + pw && xz.y <= uMapWH.y + pw) {
    vec2 d = abs(xz - floor(xz + 0.5));
    if (min(d.x, d.y) < pw) c = mix(c, vec3(1.0, 1.0, 0.94) * gc.a, 0.28);
  }
  if (uTarget.w > 0.5 && abs(length(xz - uTarget.xy) - uTarget.z) < pw * 1.6) c = vec3(0.886, 0.627, 0.282) * gc.a;
  return vec4(c, gc.a);
}
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 c = texelFetch(uCol, p, 0);
  bool obj = c.a > 0.5, sh = !obj && c.a > 0.1;
  if (uRaw == 1) { o = obj ? misty(vec4(c.rgb, 1.0), worldAt(texelFetch(uDep, p, 0).r)) : misty(uGroundOn > 0 ? groundHere() : (sh ? uShadowCol : vec4(0.0)), groundPt()); return; }
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
    if (line) { o = misty(vec4(nsoft > 0 ? mix(uLine, soft / float(nsoft) * 0.32, 0.55) : uLine, 1.0), groundPt()); return; }
    if (uGroundOn > 0) { o = misty(groundHere(), groundPt()); return; }
    o = sh ? uShadowCol : vec4(0.0); return;
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
  o = misty(vec4((edge && !(inFade && (myFl & 8) != 0)) ? mix(rgb, uLine, 0.5) : rgb, 1.0), worldAt(d));
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
  const TOD_U = ['uSunTint', 'uShadeTint', 'uShadowK', 'uSat', 'uNL', 'uLP', 'uLC', 'uLD'];
  const P3 = program(VS, FS, ['uVP', 'uModel', 'uShadow', 'uLight', 'uView', 'uRampA', 'uRampB', 'uPat', 'uP', 'uQ', 'uR', 'uS', 'uRaw', 'uMode', 'uRV', 'uSc', 'uDecal', 'uId', 'uGround', 'uFade', 'uFadeOn', 'uSil', 'uWind', 'uTime', 'uShadowOn', 'uLVP', 'uShadowTex', 'uSun', 'uAmb', 'uPU', 'uPV', 'uLeaf', 'uWin', ...TOD_U]);
  const PP = program(PVS, PFS, ['uCol', 'uIdT', 'uDep', 'uSize', 'uLine', 'uEps', 'uAO', 'uRaw', 'uHover', 'uAccent', 'uShadowCol', 'uFade', 'uGroundOn', 'uGroundTex', 'uGMap', 'uView2', 'uSunOn', 'uLVP', 'uShadowTex', 'uBias', 'uShadeMul', 'uTarget', 'uGrid', 'uMapWH', 'uMist', 'uMistCol', 'uRV3', 'uUV3', 'uFV3', 'uDZ', ...TOD_U]);
  // every sampler gets its own texture unit from the start: left at 0 together, a 2D and a shadow sampler make the first draws fail
  gl.useProgram(P3.p); gl.uniform1i(P3.u.uDecal, 3); gl.uniform1i(P3.u.uShadowTex, 4); gl.uniform1i(P3.u.uLeaf, 6);
  gl.useProgram(PP.p); gl.uniform1i(PP.u.uCol, 0); gl.uniform1i(PP.u.uIdT, 1); gl.uniform1i(PP.u.uDep, 2); gl.uniform1i(PP.u.uShadowTex, 4); gl.uniform1i(PP.u.uGroundTex, 5);
  gl.useProgram(null);
  // the light of the hour for one program (see daytime.js); without it everything looks as at noon (catalog cards, the portrait)
  const TOD_NONE = { sunTint: [1, 1, 1], shadeTint: [1, 1, 1], shadowK: 1, sat: 1, win: [0, 0, 0, 0], nl: 0, LP: new Float32Array(48), LC: new Float32Array(48), LD: new Float32Array(48), mist: 0, mistCol: [0.86, 0.88, 0.9], time: 0 };
  function setTod(u, t) {
    gl.uniform3fv(u.uSunTint, t.sunTint); gl.uniform3fv(u.uShadeTint, t.shadeTint); gl.uniform1f(u.uShadowK, t.shadowK); gl.uniform1f(u.uSat, t.sat ?? 1);
    gl.uniform1i(u.uNL, t.nl);
    if (t.nl > 0) { gl.uniform4fv(u.uLP, t.LP); gl.uniform4fv(u.uLC, t.LC); gl.uniform4fv(u.uLD, t.LD); }
  }
  const fsVAO = gl.createVertexArray();
  // the light that picks each face's tone: from the upper left of the screen and a little from the viewer;
  // a location may mirror it to come from the upper right (see setSun) — then leaf highlights move to the right too
  const LIGHT_LEFT = nrm(add(add(scl(RV, -0.9), [0, 0.9, 0]), scl(FV, -0.25)));
  const LIGHT_RIGHT = nrm(add(add(scl(RV, 0.9), [0, 0.9, 0]), scl(FV, -0.25)));
  let LIGHT = LIGHT_LEFT, LEAF_PU = RV;
  let SUN = nrm([-0.15, 1, 0.72]);             // the sun stands over the front of the yard, shadows fall up and to the right; each location may move it
  const LINE = [22 / 255, 16 / 255, 14 / 255];
  const GROUND_SHADE = [0.6, 0.66, 0.8];        // ground colour multiplier in the shade: darker and cooler
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
        gl.uniform4fv(u.uWind, m.w || NO_WIND);
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
  const NO_WIND = new Float32Array(4);

  // ---- the sun: a depth map seen from the sun, fitted to what the camera sees ----
  let LZ = scl(SUN, -1), LX = nrm(cross([0, 1, 0], LZ)), LY = cross(LZ, LX);
  function setSun(dir, light) {
    SUN = nrm(dir); LZ = scl(SUN, -1); LX = nrm(cross([0, 1, 0], LZ)); LY = cross(LZ, LX);
    LIGHT = light === 'right' ? LIGHT_RIGHT : Array.isArray(light) ? nrm(light) : LIGHT_LEFT;
    const side = dot(LIGHT, RV);
    if (Math.abs(side) > 0.12 || !LEAF_PU) LEAF_PU = side > 0 ? scl(RV, -1) : RV;
  }
  const SHADOW = { res: Math.min(2048, gl.getParameter(gl.MAX_TEXTURE_SIZE)), fbo: null, tex: null, vp: new Float32Array(16), bias: 0.0005, texel: 0.02 };
  {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW.res, SHADOW.res);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0);
    gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    SHADOW.tex = t; SHADOW.fbo = f;
  }
  // world point at height y under a point of the screen (world art px)
  function screenToWorld(sx, sy, y) { const d = SQ2 * sx / S, s2 = 2 * SQ2 * (sy / S + (SQ3 / 2) * y); return [(s2 + d) / 2, y, (s2 - d) / 2]; }
  // everything the camera can see — the ground and anything up to hmax metres tall — must land on the map;
  // the map keeps one size per view size and moves in whole texels, so shadows don't shimmer while the camera pans
  function fitShadow(rect, hmax) {
    let u0 = Infinity, u1 = -Infinity, w0 = Infinity, w1 = -Infinity, e0 = Infinity, e1 = -Infinity;
    for (const sx of [rect[0], rect[2]]) for (const sy of [rect[1], rect[3]]) for (const y of [0, hmax]) {
      const P = screenToWorld(sx, sy, y), q0 = dot(LX, P), q1 = dot(LY, P), q2 = dot(LZ, P);
      u0 = Math.min(u0, q0); u1 = Math.max(u1, q0); w0 = Math.min(w0, q1); w1 = Math.max(w1, q1); e0 = Math.min(e0, q2); e1 = Math.max(e1, q2);
    }
    const size = Math.ceil(Math.max(u1 - u0, w1 - w0) + 2), tx = size / SHADOW.res;
    const U0 = Math.floor(((u0 + u1) / 2 - size / 2) / tx) * tx, W0 = Math.floor(((w0 + w1) / 2 - size / 2) / tx) * tx;
    const D0 = e0 - Math.max(40, 22 / Math.max(SUN[1], 0.12)), D1 = e1 + 2, kx = 2 / size, kz = 2 / (D1 - D0), m = SHADOW.vp;
    m[0] = LX[0] * kx; m[4] = LX[1] * kx; m[8] = LX[2] * kx; m[12] = -U0 * kx - 1;
    m[1] = LY[0] * kx; m[5] = LY[1] * kx; m[9] = LY[2] * kx; m[13] = -W0 * kx - 1;
    m[2] = LZ[0] * kz; m[6] = LZ[1] * kz; m[10] = LZ[2] * kz; m[14] = -D0 * kz - 1;
    m[3] = m[7] = m[11] = 0; m[15] = 1;
    SHADOW.bias = 0.018 / (D1 - D0); SHADOW.texel = tx;
  }
  function renderShadowMap(list, time) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, SHADOW.fbo);
    gl.viewport(0, 0, SHADOW.res, SHADOW.res);
    gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
    gl.clearBufferfv(gl.DEPTH, 0, [1]);
    gl.useProgram(P3.p);
    const u = P3.u;
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, null);
    gl.uniformMatrix4fv(u.uVP, false, SHADOW.vp);
    gl.uniform1i(u.uMode, 3); gl.uniform1i(u.uShadowOn, 0); gl.uniform1i(u.uRaw, 0);
    gl.uniform4f(u.uShadow, 0, 1, 0, 0); gl.uniform3fv(u.uView, SUN); gl.uniform3fv(u.uLight, LIGHT);
    gl.uniform1f(u.uTime, time); gl.uniform4f(u.uFade, 0, 0, 0, 0);
    gl.uniform3fv(u.uPU, LX); gl.uniform3fv(u.uPV, LY);
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, leafTex); gl.uniform1i(u.uLeaf, 6);
    drawList(list);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  // ---- leaf atlas: a seamless tile of 16 × 16 leaves, 16 texels per leaf cell (worked out once instead of per pixel) ----
  const leafTex = gl.createTexture();
  {
    const T = 16, PX = 16, N = T * PX, data = new Uint8Array(N * N * 4);
    const hw = (x, y, sd) => hash2(((x % T) + T) % T, ((y % T) + T) % T, sd);
    for (let py = 0; py < N; py++) for (let px_ = 0; px_ < N; px_++) {
      const qx = (px_ + 0.5) / PX, qy = (py + 0.5) / PX, cx = Math.floor(qx), cy = Math.floor(qy), fx = qx - cx, fy = qy - cy;
      let best = 9, bx = 0, by = 0, bh = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const ha = hw(cx + i, cy + j, 7), hb = hw(cx + i, cy + j, 13);
        const dx = fx - (i + 0.15 + ha * 0.7), dy = fy - (j + 0.15 + hb * 0.7);
        const an = ha * 6.2831, ca = Math.cos(an), sa = Math.sin(an);
        const dd = Math.hypot(ca * dx + sa * dy, (ca * dy - sa * dx) * 1.75);
        if (dd < best) { best = dd; bx = dx; by = dy; bh = hb; }
      }
      const l = Math.hypot(bx, by) || 1, lit = (-0.6 * bx + 0.8 * by) / l, k = (py * N + px_) * 4;
      data[k] = Math.round(hw(cx, cy, 3) * 255); data[k + 1] = Math.round((lit * 0.5 + 0.5) * 255);
      data[k + 2] = Math.min(255, Math.round(best * 255)); data[k + 3] = Math.round(bh * 255);
    }
    gl.bindTexture(gl.TEXTURE_2D, leafTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }
  // ---- the painted ground as a texture, so the scene can shade it ----
  const groundTex = gl.createTexture();
  function uploadGround(cv) {
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, groundTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0);
  }

  // a few pixels of the ground changed (a footprint): send just them; the overview's mipmaps are redone lazily
  let groundMipsStale = false;
  function groundPatch(img, x, y) {
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, groundTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, img.width, img.height, gl.RGBA, gl.UNSIGNED_BYTE, img.data);
    gl.activeTexture(gl.TEXTURE0);
    groundMipsStale = true;
  }
  function freshGroundMips() {
    if (!groundMipsStale) return;
    groundMipsStale = false;
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, groundTex); gl.generateMipmap(gl.TEXTURE_2D); gl.activeTexture(gl.TEXTURE0);
  }
  // L = { shadow: [...], main: [...], hero: [...] }
  // o = { xray, hover, fade: [x, y, r2, depth], time, sun: { rect, hmax } (real shadows from L.shadow),
  //       ground: { x0, y0, w, h, mode } (draw the ground under the scene), target: [x, z], grid }
  function render3D(T, v, L, raw, ctx, dx, dy, o = {}) {
    const sunOn = !!o.sun;
    if (sunOn) { fitShadow(o.sun.rect, o.sun.hmax || 18); renderShadowMap(L.shadow || [], o.time || 0); }
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
    gl.uniform1f(u.uTime, o.time || 0);
    gl.uniform1i(u.uShadowOn, sunOn ? 1 : 0);
    gl.uniformMatrix4fv(u.uLVP, false, SHADOW.vp);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, SHADOW.tex); gl.uniform1i(u.uShadowTex, 4);
    gl.uniform3fv(u.uSun, SUN); gl.uniform3f(u.uAmb, 0.36, 0.14, SHADOW.bias);
    const tod = o.tod || TOD_NONE;
    setTod(u, tod); gl.uniform4fv(u.uWin, tod.win);
    gl.uniform3fv(u.uPU, LEAF_PU); gl.uniform3fv(u.uPV, UV);
    gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, leafTex); gl.uniform1i(u.uLeaf, 6);
    if (!sunOn && L.shadow && L.shadow.length) {
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
    const gr = o.ground;
    if (gr && gr.mode === 2) freshGroundMips();
    gl.uniform1i(PP.u.uGroundOn, gr ? gr.mode : 0);
    gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, groundTex); gl.uniform1i(PP.u.uGroundTex, 5);
    if (gr) { gl.uniform4f(PP.u.uGMap, gr.x0, gr.y0, gr.w, gr.h); gl.uniform4f(PP.u.uView2, v.ax, v.ay, S / v.s, v.h); }
    gl.uniform1i(PP.u.uSunOn, sunOn ? 1 : 0);
    gl.uniformMatrix4fv(PP.u.uLVP, false, SHADOW.vp);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, SHADOW.tex); gl.uniform1i(PP.u.uShadowTex, 4);
    gl.uniform1f(PP.u.uBias, SHADOW.bias * 0.5);
    gl.uniform3fv(PP.u.uShadeMul, GROUND_SHADE);
    const tg = o.target;
    gl.uniform4f(PP.u.uTarget, tg ? tg[0] : 0, tg ? tg[1] : 0, 0.32, tg ? 1 : 0);
    gl.uniform1i(PP.u.uGrid, o.grid ? 1 : 0);
    gl.uniform2f(PP.u.uMapWH, GW, GH);
    setTod(PP.u, tod);
    gl.uniform4f(PP.u.uMist, tod.mist, tod.time, 1 / v.s, tod.mist > 0.01 && !(o.ground && o.ground.mode === 2) ? 1 : 0); gl.uniform3fv(PP.u.uMistCol, tod.mistCol);
    gl.uniform3fv(PP.u.uRV3, RV); gl.uniform3fv(PP.u.uUV3, UV); gl.uniform3fv(PP.u.uFV3, FV); gl.uniform1f(PP.u.uDZ, DZ);
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

