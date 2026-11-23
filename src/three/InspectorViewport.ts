import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { InspectViewMode, SystemId } from '../types/elban';
import { buildEquipmentBySystem, BuiltEquipmentUnit } from './proceduralModels';
import { createAfterDraw, detectSoftwareGl, disposeObject3D } from './webglUtils';

const _targetVec = new THREE.Vector3();
const _pointer = new THREE.Vector2();

export class InspectorViewportController {
  private container: HTMLElement;
  private onSelectComponent: (componentId: string) => void;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private isSoftwareGl: boolean;
  private afterDraw: (cb: () => void) => void;
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  private unit!: BuiltEquipmentUnit;
  private leaderLinesGroup = new THREE.Group();
  private leaderLines = new Map<string, THREE.Line>();
  private viewMode: InspectViewMode = 'normal';
  private selectedComponentId: string | null = null;
  private raycaster = new THREE.Raycaster();
  private pointerDownPos = { x: 0, y: 0 };

  private onResizeBound: () => void;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;

  constructor(
    container: HTMLElement,
    systemId: SystemId,
    initialComponentId: string | null,
    onSelectComponent: (componentId: string) => void
  ) {
    this.container = container;
    this.onSelectComponent = onSelectComponent;
    this.selectedComponentId = initialComponentId;
    this.isSoftwareGl = detectSoftwareGl();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 60);
    this.camera.position.set(3.4, 2.35, 3.8);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.afterDraw = createAfterDraw(this.renderer, (id) => {
      this.frameId = id;
    }, 80);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 1.8;
    this.controls.maxDistance = 9.5;
    this.controls.maxPolarAngle = Math.PI * 0.52;
    this.controls.target.set(0, 1.15, 0);

    // Three-point studio lighting
    const hemi = new THREE.HemisphereLight(0xf0f9ff, 0x94a3b8, 0.95);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff7ed, 1.4);
    key.position.set(5, 8, 6);
    if (!this.isSoftwareGl) {
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.bias = -0.0005;
    }
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x93c5fd, 0.65);
    rim.position.set(-6, 5, -5);
    this.scene.add(rim);

    // Subtle engineering studio turntable grid + contact grounding plane
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(4.2, 48),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.72, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(7, 14, 0x94a3b8, 0xcbd5e1);
    grid.position.y = 0.008;
    this.scene.add(grid);

    // Build centered hero equipment model
    this.unit = buildEquipmentBySystem(systemId, this.renderer.capabilities.getMaxAnisotropy());
    this.scene.add(this.unit.root);

    // Build dynamic 3D leader lines for Exploded View
    this.scene.add(this.leaderLinesGroup);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.7 });
    for (const sub of this.unit.subComponents) {
      const geo = new THREE.BufferGeometry().setFromPoints([sub.basePos.clone(), sub.basePos.clone()]);
      const line = new THREE.Line(geo, lineMat);
      this.leaderLines.set(sub.componentId, line);
      this.leaderLinesGroup.add(line);
    }

    // Center orbit target based on bounding box
    const box = new THREE.Box3().setFromObject(this.unit.root);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 2.0);
    this.controls.target.set(center.x, Math.max(0.95, center.y), center.z);
    this.camera.position.set(center.x + maxDim * 1.15, center.y + maxDim * 0.55, center.z + maxDim * 1.25);
    this.controls.update();

    this.applyVisualState();

    this.onResizeBound = this.handleResize.bind(this);
    this.onPointerDownBound = (e: PointerEvent) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    this.onPointerUpBound = this.handlePointerUp.bind(this);

    window.addEventListener('resize', this.onResizeBound);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDownBound);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUpBound);

    this.tick();
  }

  public setViewMode(mode: InspectViewMode): void {
    this.viewMode = mode;
    this.applyVisualState();
  }

  public setSelectedComponent(componentId: string | null): void {
    this.selectedComponentId = componentId;
    this.applyVisualState();
  }

  private applyVisualState(): void {
    const isXRay = this.viewMode === 'xray';
    const isExploded = this.viewMode === 'exploded';

    // Outer casing translucency in X-Ray mode or subtle fade in Exploded mode
    for (const mesh of this.unit.outerShellMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (isXRay) {
        mat.transparent = true;
        mat.opacity = 0.2;
        mat.depthWrite = false;
      } else if (isExploded) {
        mat.transparent = true;
        mat.opacity = 0.48;
        mat.depthWrite = true;
      } else {
        mat.transparent = false;
        mat.opacity = 1;
        mat.depthWrite = true;
      }
      mat.needsUpdate = true;
    }

    // Highlight selected sub-component cleanly
    for (const sub of this.unit.subComponents) {
      const isSelected = sub.componentId === this.selectedComponentId;
      sub.group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const std = m as THREE.MeshStandardMaterial;
          if (!std || !std.emissive || std.emissiveMap) return;
          if (mesh.userData.origEmissive === undefined) {
            mesh.userData.origEmissive = std.emissive.getHex();
            mesh.userData.origEmissiveIntensity = std.emissiveIntensity;
          }
          if (isSelected) {
            std.emissive.setHex(0x0284c7);
            std.emissiveIntensity = 0.65;
          } else {
            std.emissive.setHex(mesh.userData.origEmissive);
            std.emissiveIntensity = mesh.userData.origEmissiveIntensity;
          }
        });
      });
    }

    this.leaderLinesGroup.visible = isExploded;
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private handlePointerUp(e: PointerEvent): void {
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist > 6) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(_pointer, this.camera);
    const hits = this.raycaster.intersectObjects(
      this.unit.subComponents.map((s) => s.group),
      true
    );
    if (hits.length > 0 && hits[0].object.userData.componentId) {
      this.onSelectComponent(hits[0].object.userData.componentId);
    }
  }

  private tick = (): void => {
    if (this.disposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.08);
    const elapsed = this.clock.getElapsedTime();

    const explodeFactor = this.viewMode === 'exploded' ? 1 : 0;

    // Smooth exponential damping for exploded-view part separation
    for (const sub of this.unit.subComponents) {
      _targetVec.copy(sub.basePos).addScaledVector(sub.explodedOffset, explodeFactor);
      sub.group.position.x = THREE.MathUtils.damp(sub.group.position.x, _targetVec.x, 7, delta);
      sub.group.position.y = THREE.MathUtils.damp(sub.group.position.y, _targetVec.y, 7, delta);
      sub.group.position.z = THREE.MathUtils.damp(sub.group.position.z, _targetVec.z, 7, delta);

      if (this.leaderLinesGroup.visible) {
        const line = this.leaderLines.get(sub.componentId);
        if (line) {
          const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
          posAttr.setXYZ(0, sub.basePos.x, sub.basePos.y, sub.basePos.z);
          posAttr.setXYZ(1, sub.group.position.x, sub.group.position.y, sub.group.position.z);
          posAttr.needsUpdate = true;
        }
      }
    }

    // Subtle live animations inside inspector
    if (this.unit.animatedParts.radarDish) {
      this.unit.animatedParts.radarDish.rotation.y = elapsed * 1.4;
    }
    if (this.unit.animatedParts.ptzHead) {
      this.unit.animatedParts.ptzHead.rotation.y = Math.sin(elapsed * 0.9) * 0.6;
    }
    if (this.unit.animatedParts.conveyorBags) {
      for (const bag of this.unit.animatedParts.conveyorBags) {
        bag.position.x = Math.sin(elapsed * 0.65) * 0.95;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResizeBound);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDownBound);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUpBound);
    this.controls.dispose();
    disposeObject3D(this.scene);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
