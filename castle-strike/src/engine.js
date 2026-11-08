import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { setAniso } from './textures.js';
import { setEnv } from './decor.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, vig: { value: 0.55 }, hurt: { value: 0 }, flash: { value: new THREE.Vector3() }, time: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float vig; uniform float hurt; uniform vec3 flash; uniform float time;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; float r = dot(d, d);
      c.rgb *= 1.0 - vig * smoothstep(0.10, 0.50, r * 1.5);
      c.rgb = mix(c.rgb, vec3(0.9,0.04,0.04) * (0.35 + r * 2.0), hurt * (0.18 + r * 1.6));
      c.rgb += flash;
      float g = fract(sin(dot(vUv * vec2(1920.0,1080.0) + time, vec2(12.9898,78.233))) * 43758.5453);
      c.rgb += (g - 0.5) * 0.010;
      gl_FragColor = c;
    }`,
};

export function createEngine(canvas, quality = 'high') {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  setAniso(Math.min(16, renderer.capabilities.getMaxAnisotropy()));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  setEnv(env);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 160);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const size = new THREE.Vector2();
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: quality === 'high' ? 4 : 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  // 武器專用場景：清除深度後再畫，避免槍穿進牆
  const vmScene = new THREE.Scene();
  const vmCam = new THREE.PerspectiveCamera(58, 1, 0.02, 20);
  vmScene.add(new THREE.AmbientLight(0xffe8d0, 0.9));
  const vmKey = new THREE.DirectionalLight(0xfff0d8, 2.4); vmKey.position.set(-1.5, 2, 1); vmScene.add(vmKey);
  const vmFill = new THREE.DirectionalLight(0x8aa4d0, 0.8); vmFill.position.set(2, -0.5, 0.5); vmScene.add(vmFill);
  vmScene.environment = env;
  const vmPass = new RenderPass(vmScene, vmCam); vmPass.clear = false; vmPass.clearDepth = true; composer.addPass(vmPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), quality === 'high' ? 0.42 : 0.3, 0.7, 0.88);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  let scale = 1;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, quality === 'high' ? 2 : quality === 'mid' ? 1.25 : 1) * scale);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix(); vmCam.aspect = w / h; vmCam.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  function setQuality(q) {
    quality = q;
    for (const t of [composer.renderTarget1, composer.renderTarget2]) { t.samples = q === 'high' ? 4 : 0; t.dispose(); }
    bloom.enabled = q !== 'low'; bloom.strength = q === 'high' ? 0.42 : 0.3;
    resize();
  }
  function setScale(s) { scale = s; resize(); }
  resize();
  return { renderer, scene, camera, vmScene, vmCam, composer, grade, bloom, env, resize, setQuality, setScale, get scale() { return scale; } };
}
