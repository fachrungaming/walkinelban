import * as THREE from 'three';
import { COMPONENT_MAP } from '../data/curriculum';
import { SubsystemLayer, SystemId } from '../types/elban';
import {
  createCeiaHhmdBackTexture,
  createCeiaHhmdFrontTexture,
  createCeiaLogoTexture,
  createCeiaSpecStickerTexture,
  createCeiaWtmdControlTexture,
  createCeilingSpeakerGrilleTexture,
  createColumnSpeakerGrilleTexture,
  createFanGrilleTexture,
  createFidsCanvasTexture,
  createGateCircuitTexture,
  createGateCrownSignTexture,
  createGateEmblemTexture,
  createGateMarqueeTexture,
  createHikvisionDomeTexture,
  createHikvisionFisheyeBandTexture,
  createHikvisionNvrBackTexture,
  createHikvisionNvrFrontTexture,
  createHikvisionNvrSideTexture,
  createMasterClockTexture,
  createRapiscanFrontBadgeTexture,
  createRapiscanSideLogoTexture,
  createRunwayPracticumTexture,
  createShroudPerforationTexture,
  createSonyIpelaFrontFaceTexture,
  createSonyIpelaSideTexture,
  createTocMonitorTexture,
  createTorajaCarvingTexture,
  createXRayCautionTexture,
  createXRayMonitorTexture,
} from './proceduralTextures';

export interface TaggedSubComponent {
  group: THREE.Group;
  componentId: string;
  meshNodeName: string;
  subsystemLayer: SubsystemLayer;
  basePos: THREE.Vector3;
  explodedOffset: THREE.Vector3;
}

export interface BuiltEquipmentUnit {
  root: THREE.Group;
  systemId: SystemId;
  subComponents: TaggedSubComponent[];
  outerShellMeshes: THREE.Mesh[];
  animatedParts: {
    conveyorBags?: THREE.Object3D[];
    radarDish?: THREE.Object3D;
    ptzHead?: THREE.Object3D;
    fidsUpdater?: (d: Date) => void;
    clockUpdater?: (d: Date) => void;
    stackLamp?: THREE.MeshStandardMaterial;
  };
}

function tagInteractive(
  obj: THREE.Object3D,
  systemId: SystemId,
  componentId?: string,
  subsystemLayer?: SubsystemLayer
) {
  obj.traverse((child) => {
    child.userData.systemId = systemId;
    if (componentId) child.userData.componentId = componentId;
    if (subsystemLayer) child.userData.subsystemLayer = subsystemLayer;
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function makeSubGroup(
  systemId: SystemId,
  componentId: string,
  basePos: [number, number, number] = [0, 0, 0]
): TaggedSubComponent {
  const comp = COMPONENT_MAP[componentId];
  const group = new THREE.Group();
  group.position.set(basePos[0], basePos[1], basePos[2]);
  group.name = comp.meshNodeName;
  return {
    group,
    componentId,
    meshNodeName: comp.meshNodeName,
    subsystemLayer: comp.subsystemLayer,
    basePos: new THREE.Vector3(basePos[0], basePos[1], basePos[2]),
    explodedOffset: new THREE.Vector3(
      comp.explodedOffset.x,
      comp.explodedOffset.y,
      comp.explodedOffset.z
    ),
  };
}

// =========================================================================
// 1. X-RAY INSPECTION MACHINE — RAPISCAN 620DV DUAL-VIEW (7 Sub-Components)
// Synthesized from Front (620DV), Side (Rapiscan Systems), & Rear References
// =========================================================================
export function buildXRaySystem(maxAnisotropy: number): BuiltEquipmentUnit {
  const root = new THREE.Group();
  const subComponents: TaggedSubComponent[] = [];
  const outerShellMeshes: THREE.Mesh[] = [];
  const animatedParts: BuiltEquipmentUnit['animatedParts'] = { conveyorBags: [] };

  // Calibrated PBR industrial materials matching reference photos
  const matCharcoal = new THREE.MeshStandardMaterial({ color: 0x3b4046, roughness: 0.48, metalness: 0.35 });
  const matSilverTrim = new THREE.MeshStandardMaterial({ color: 0xb5bcc4, roughness: 0.32, metalness: 0.55 });
  const matStainless = new THREE.MeshStandardMaterial({ color: 0xcbd2d9, roughness: 0.24, metalness: 0.85 });
  const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.45, metalness: 0.6 });
  const matNavyTop = new THREE.MeshStandardMaterial({ color: 0x263547, roughness: 0.42, metalness: 0.35 });
  const matCopper = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.28, metalness: 0.85 });
  const matCyanPcb = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.42, metalness: 0.35 });
  const matBelt = new THREE.MeshStandardMaterial({ color: 0x1b2026, roughness: 0.86, metalness: 0.08 });
  const matBeaconRed = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.22,
    metalness: 0.15,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.72,
  });
  const matGreenLed = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.2,
    emissive: 0x16a34a,
    emissiveIntensity: 0.9,
  });
  const matLeather = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.58, metalness: 0.1 });

  // Procedural decals & perforated metal textures
  const frontBadgeTex = createRapiscanFrontBadgeTexture(maxAnisotropy);
  const sideLogoTex = createRapiscanSideLogoTexture(maxAnisotropy);
  const cautionTex = createXRayCautionTexture(maxAnisotropy);
  const shroudPerfTex = createShroudPerforationTexture(maxAnisotropy);
  const fanGrilleTex = createFanGrilleTexture(maxAnisotropy);

  // -----------------------------------------------------------------------
  // OUTER TUNNEL SHELL (Rapiscan 620DV Charcoal + Silver Band + Dual-View Wing + Top Module)
  // Turns translucent in X-Ray Casing Mode to reveal Monoblock, Detector Array & DAS
  // -----------------------------------------------------------------------
  const shellGroup = new THREE.Group();
  const addShellMesh = (mesh: THREE.Mesh) => {
    mesh.userData.isOuterShell = true;
    outerShellMeshes.push(mesh);
    shellGroup.add(mesh);
  };

  // Main tunnel cabinet body (1.76m long along X, 1.54m tall, 1.16m wide along Z)
  const cabTop = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.26, 1.16), matCharcoal.clone());
  cabTop.position.set(0, 1.44, 0);
  const cabTopCap = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.05, 1.06), matSilverTrim.clone());
  cabTopCap.position.set(0, 1.58, 0);
  // Left (+Z) and Right (-Z) charcoal side walls of tunnel cabinet
  const cabWallPlusZ = new THREE.Mesh(new THREE.BoxGeometry(1.76, 1.48, 0.12), matCharcoal.clone());
  cabWallPlusZ.position.set(0, 0.8, 0.52);
  const cabWallMinusZ = new THREE.Mesh(new THREE.BoxGeometry(1.76, 1.48, 0.12), matCharcoal.clone());
  cabWallMinusZ.position.set(0, 0.8, -0.52);
  // Lower base plinth under conveyor belt
  const cabBase = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.68, 1.04), matCharcoal.clone());
  cabBase.position.set(0, 0.4, 0);

  // Signature Rapiscan vertical silver center stripe & vertical end trim pillars on both sides
  const stripePlusZ = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.48, 0.025), matSilverTrim.clone());
  stripePlusZ.position.set(0, 0.8, 0.585);
  const stripeMinusZ = stripePlusZ.clone();
  stripeMinusZ.position.set(0, 0.8, -0.585);

  const frontPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.48, 0.14), matSilverTrim.clone());
  frontPillarL.position.set(-0.84, 0.8, 0.52);
  const frontPillarR = frontPillarL.clone();
  frontPillarR.position.set(-0.84, 0.8, -0.52);
  const rearPillarL = frontPillarL.clone();
  rearPillarL.position.set(0.84, 0.8, 0.52);
  const rearPillarR = frontPillarL.clone();
  rearPillarR.position.set(0.84, 0.8, -0.52);

  // Front (-X) & Rear (+X) light-silver fascia headers above the tunnel mouth
  const frontHeader = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 1.18), matSilverTrim.clone());
  frontHeader.position.set(-0.86, 1.4, 0);
  const rearHeader = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 1.18), matSilverTrim.clone());
  rearHeader.position.set(0.86, 1.4, 0);

  // Dual-View Angled Side Electronics Wing on +Z (visible right behind console in front reference)
  const dvWingBody = new THREE.Mesh(new THREE.BoxGeometry(0.76, 1.18, 0.54), matCharcoal.clone());
  dvWingBody.position.set(0.28, 0.72, 0.82);
  const dvWingTopSlope = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.42), matCharcoal.clone());
  dvWingTopSlope.position.set(0.28, 1.38, 0.76);
  dvWingTopSlope.rotation.x = 0.32;

  // Rear-Top Dark Navy Generator/Cooling Module (from rear reference photo) with fan grille
  const topNavyMain = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.34, 0.94), matNavyTop.clone());
  topNavyMain.position.set(0.28, 1.77, -0.02);
  const topFanPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(0.26, 0.26),
    new THREE.MeshStandardMaterial({ map: fanGrilleTex, roughness: 0.4, metalness: 0.5 })
  );
  topFanPanel.position.set(0.645, 1.78, -0.26);
  topFanPanel.rotation.y = Math.PI / 2;

  // Front (-X) Decals: "Rapiscan 620DV" badge & "CAUTION X-RAY HAZARD" plate
  const frontBadgeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.085),
    new THREE.MeshStandardMaterial({ map: frontBadgeTex, roughness: 0.35 })
  );
  frontBadgeMesh.position.set(-0.916, 1.42, -0.34);
  frontBadgeMesh.rotation.y = -Math.PI / 2;

  const frontCautionMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.1),
    new THREE.MeshStandardMaterial({ map: cautionTex, roughness: 0.35 })
  );
  frontCautionMesh.position.set(-0.916, 1.42, 0.34);
  frontCautionMesh.rotation.y = -Math.PI / 2;

  // Rear (+X) Caution Sign centered above exit tunnel
  const rearCautionMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.11),
    new THREE.MeshStandardMaterial({ map: cautionTex, roughness: 0.35 })
  );
  rearCautionMesh.position.set(0.916, 1.46, 0);
  rearCautionMesh.rotation.y = Math.PI / 2;

  // Side "Rapiscan Systems" logos on both -Z and +Z panels
  const sideLogoMinusZ = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.125),
    new THREE.MeshStandardMaterial({ map: sideLogoTex, roughness: 0.35 })
  );
  sideLogoMinusZ.position.set(-0.52, 1.24, -0.586);
  sideLogoMinusZ.rotation.y = Math.PI;
  const sideLogoPlusZ = sideLogoMinusZ.clone();
  sideLogoPlusZ.position.set(-0.52, 1.24, 0.586);
  sideLogoPlusZ.rotation.y = 0;

  // Cabinet corner swivel casters + silver threaded leveling jacks flush on y = 0
  [[-0.78, 0.48], [-0.78, -0.48], [0.78, 0.48], [0.78, -0.48]].forEach(([x, z]) => {
    const casterWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 14), matDarkSteel);
    casterWheel.rotation.x = Math.PI / 2;
    casterWheel.position.set(x, 0.045, z);
    const levelFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.08, 12), matStainless);
    levelFoot.position.set(x * 0.9, 0.04, z * 0.92);
    shellGroup.add(casterWheel, levelFoot);
  });

  [
    cabTop, cabTopCap, cabWallPlusZ, cabWallMinusZ, cabBase,
    stripePlusZ, stripeMinusZ, frontPillarL, frontPillarR, rearPillarL, rearPillarR,
    frontHeader, rearHeader, dvWingBody, dvWingTopSlope, topNavyMain,
  ].forEach(addShellMesh);
  shellGroup.add(topFanPanel, frontBadgeMesh, frontCautionMesh, rearCautionMesh, sideLogoMinusZ, sideLogoPlusZ);
  tagInteractive(shellGroup, 'sys-xray');
  root.add(shellGroup);

  // -----------------------------------------------------------------------
  // XR-01: X-Ray Generator (Dual-View Monoblock Units: Under-Belt + Side DV Tank)
  // -----------------------------------------------------------------------
  const monoblock = makeSubGroup('sys-xray', 'comp-xray-monoblock', [0, 0.42, 0]);
  const oilTank = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.36, 0.54),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.78 })
  );
  const coolidgeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.48, 20), matCopper);
  coolidgeTube.rotation.z = Math.PI / 2;
  coolidgeTube.position.set(0, 0.16, 0);
  const collimator = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.1, 0.36),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.5 })
  );
  collimator.position.set(0, 0.24, 0);
  // Secondary horizontal Dual-View Monoblock in the +Z side wing
  const dvSideTank = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.36, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.8 })
  );
  dvSideTank.position.set(0.26, 0.42, 0.78);
  const dvSideTube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.34, 16), matCopper);
  dvSideTube.position.set(0.26, 0.42, 0.66);
  monoblock.group.add(oilTank, coolidgeTube, collimator, dvSideTank, dvSideTube);
  tagInteractive(monoblock.group, 'sys-xray', 'comp-xray-monoblock', monoblock.subsystemLayer);
  subComponents.push(monoblock);
  root.add(monoblock.group);

  // -----------------------------------------------------------------------
  // XR-02: Detector Array (Dual-View L-Shaped Scintillator & Photodiode Arrays)
  // -----------------------------------------------------------------------
  const detector = makeSubGroup('sys-xray', 'comp-xray-detector', [-0.08, 1.06, 0]);
  const detVert = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.64, 0.1), matCyanPcb);
  detVert.position.set(0, -0.02, -0.4);
  const detHoriz = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.86), matCyanPcb);
  detHoriz.position.set(0, 0.26, 0);
  const scintBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.04, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.3, emissive: 0x0284c7, emissiveIntensity: 0.55 })
  );
  scintBar.position.set(0, 0.2, 0);
  // Secondary Dual-View detector array along X offset
  const det2Horiz = detHoriz.clone();
  det2Horiz.position.set(0.32, 0.26, 0);
  detector.group.add(detVert, detHoriz, scintBar, det2Horiz);
  tagInteractive(detector.group, 'sys-xray', 'comp-xray-detector', detector.subsystemLayer);
  subComponents.push(detector);
  root.add(detector.group);

  // -----------------------------------------------------------------------
  // XR-03: DAS & Frame Grabber Card
  // -----------------------------------------------------------------------
  const das = makeSubGroup('sys-xray', 'comp-xray-das', [0.32, 1.04, 0.68]);
  const dasBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.26, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.4, metalness: 0.4 })
  );
  const adcChip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.07), matDarkSteel);
  adcChip.position.set(-0.06, 0.02, 0.01);
  const pciGold = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.04, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.25, metalness: 0.9 })
  );
  pciGold.position.set(0, -0.13, 0);
  das.group.add(dasBoard, adcChip, pciGold);
  tagInteractive(das.group, 'sys-xray', 'comp-xray-das', das.subsystemLayer);
  subComponents.push(das);
  root.add(das.group);

  // -----------------------------------------------------------------------
  // XR-04: Photocells / Light Barrier (Authentic Protruding Vertical Sensor Pillar + IR Beam)
  // -----------------------------------------------------------------------
  const photocell = makeSubGroup('sys-xray', 'comp-xray-photocell', [0.92, 0.66, 0]);
  // Protruding vertical sensor housing box on rear-right face (matches rear photo!)
  const pillarBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.56, 0.16), matSilverTrim);
  pillarBox.position.set(0.06, -0.04, 0.46);
  const opticalWindow = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.36, 0.09), matDarkSteel);
  opticalWindow.position.set(0.145, -0.04, 0.46);
  // Opposing receiver post + entry photocell pair
  const rxPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.08), matDarkSteel);
  rxPost.position.set(0.04, 0.04, -0.44);
  const irBeamExit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.88, 10),
    new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.6 })
  );
  irBeamExit.rotation.x = Math.PI / 2;
  irBeamExit.position.set(0.04, 0.2, 0);
  const irBeamEntry = irBeamExit.clone();
  irBeamEntry.position.set(-1.82, 0.2, 0);
  photocell.group.add(pillarBox, opticalWindow, rxPost, irBeamExit, irBeamEntry);
  tagInteractive(photocell.group, 'sys-xray', 'comp-xray-photocell', photocell.subsystemLayer);
  subComponents.push(photocell);
  root.add(photocell.group);

  // -----------------------------------------------------------------------
  // XR-05: Processing Unit (Mobile Rolling Dual-Monitor Rapiscan Operator Console)
  // -----------------------------------------------------------------------
  const pc = makeSubGroup('sys-xray', 'comp-xray-pc', [-0.62, 0, 1.38]);
  // Rectangular tubular dark-grey rolling table frame on 4 caster wheels (from front & side photos)
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.045, 0.62), new THREE.MeshStandardMaterial({ color: 0x525a64, roughness: 0.42, metalness: 0.3 }));
  tableTop.position.set(0, 0.78, 0);
  const legFrameGeo = new THREE.BoxGeometry(0.045, 0.72, 0.045);
  [[-0.5, 0.42, -0.26], [0.5, 0.42, -0.26], [-0.5, 0.42, 0.26], [0.5, 0.42, 0.26]].forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legFrameGeo, matCharcoal);
    leg.position.set(x, y, z);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.025, 12), matDarkSteel);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.032, z);
    pc.group.add(leg, wheel);
  });
  const lowerBarL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.56), matCharcoal);
  lowerBarL.position.set(-0.5, 0.12, 0);
  const lowerBarR = lowerBarL.clone();
  lowerBarR.position.set(0.5, 0.12, 0);
  const lowerBarBack = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.04, 0.04), matCharcoal);
  lowerBarBack.position.set(0, 0.12, -0.26);
  // Industrial PC tower mounted under console
  const pcTower = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.46, 0.42), matDarkSteel);
  pcTower.position.set(0.32, 0.48, -0.04);

  // Dual Side-by-Side LCD Monitors (VIEW 1 Vertical + VIEW 2 Horizontal) on Twin Bracket Arm
  const monPost = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.46, 12), matDarkSteel);
  monPost.position.set(-0.08, 1.01, -0.18);
  const monArm = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.04, 0.04), matDarkSteel);
  monArm.position.set(-0.08, 1.18, -0.18);

  const screenTex1 = createXRayMonitorTexture(maxAnisotropy, 'VIEW 1 · VERTICAL');
  const screenTex2 = createXRayMonitorTexture(maxAnisotropy, 'VIEW 2 · HORIZONTAL');
  const buildLcd = (xPos: number, tex: THREE.CanvasTexture) => {
    const grp = new THREE.Group();
    grp.position.set(xPos, 1.2, -0.13);
    grp.rotation.x = -0.08;
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.31, 0.035), matDarkSteel);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 0.27),
      new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.2 })
    );
    face.position.z = 0.02;
    grp.add(bezel, face);
    return grp;
  };
  const lcdLeft = buildLcd(-0.32, screenTex1);
  const lcdRight = buildLcd(0.16, screenTex2);

  // Dedicated Slanted Rapiscan Operator Control Keyboard
  const kbBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.055, 0.22), matDarkSteel);
  kbBase.position.set(0.18, 0.83, 0.14);
  kbBase.rotation.x = 0.14;
  const kbAccent = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.04), new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 }));
  kbAccent.position.set(0.18, 0.865, 0.09);
  kbAccent.rotation.x = 0.14;

  pc.group.add(tableTop, lowerBarL, lowerBarR, lowerBarBack, pcTower, monPost, monArm, lcdLeft, lcdRight, kbBase, kbAccent);
  tagInteractive(pc.group, 'sys-xray', 'comp-xray-pc', pc.subsystemLayer);
  subComponents.push(pc);
  root.add(pc.group);

  // -----------------------------------------------------------------------
  // XR-06: Electro-Mechanical Conveyor System (Belt + Long Stainless Gravity Rollers + H-Frame Legs + Brown Suitcase)
  // -----------------------------------------------------------------------
  const conveyor = makeSubGroup('sys-xray', 'comp-xray-conveyor', [0, 0.76, 0]);
  // Central motorized ribbed belt running through the tunnel & shrouds
  const mainBelt = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.08, 0.82), matBelt);
  const beltSideL = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.12, 0.05), matCharcoal);
  beltSideL.position.set(0, 0, 0.43);
  const beltSideR = beltSideL.clone();
  beltSideR.position.set(0, 0, -0.43);

  // Brushed Stainless Steel Entry (-X) & Exit (+X) Gravity Roller Tables (matching front & side photos!)
  const buildRollerTable = (centerX: number, length: number, endLipDir: -1 | 1) => {
    const tbl = new THREE.Group();
    const railL = new THREE.Mesh(new THREE.BoxGeometry(length, 0.11, 0.05), matStainless);
    railL.position.set(centerX, 0, 0.44);
    const railR = railL.clone();
    railR.position.set(centerX, 0, -0.44);
    const endLip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.93), matStainless);
    endLip.position.set(centerX + endLipDir * (length / 2), 0.015, 0);
    tbl.add(railL, railR, endLip);

    // Individual polished metallic cylindrical rollers
    const rollerCount = Math.max(6, Math.floor(length / 0.115));
    const rollerGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.83, 12);
    for (let i = 0; i < rollerCount; i++) {
      const rx = centerX - length / 2 + 0.08 + i * ((length - 0.16) / (rollerCount - 1));
      const roller = new THREE.Mesh(rollerGeo, matStainless);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(rx, 0.01, 0);
      tbl.add(roller);
    }

    // Telescopic dark H-frame support leg assemblies flush to y = 0 (offset -0.76 from conveyor group)
    const legOffsets = length > 1.2 ? [centerX - length * 0.36, centerX + length * 0.36] : [centerX];
    for (const lx of legOffsets) {
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.72, 0.055), matDarkSteel);
      legL.position.set(lx, -0.39, 0.4);
      const legR = legL.clone();
      legR.position.set(lx, -0.39, -0.4);
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.84), matDarkSteel);
      crossbar.position.set(lx, -0.56, 0);
      const padL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.03, 12), matDarkSteel);
      padL.position.set(lx, -0.745, 0.4);
      const padR = padL.clone();
      padR.position.set(lx, -0.745, -0.4);
      tbl.add(legL, legR, crossbar, padL, padR);
    }
    return tbl;
  };

  const entryRollerBed = buildRollerTable(-2.12, 1.42, -1);
  const exitRollerBed = buildRollerTable(1.92, 1.02, 1);

  // Internal Reversible Drum Motor + VFD Inverter module
  const drumMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.82, 16), matCopper);
  drumMotor.rotation.x = Math.PI / 2;
  drumMotor.position.set(1.36, 0, 0);
  const vfdBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.24, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.6 })
  );
  vfdBox.position.set(0.65, -0.22, 0.34);

  // Warm brown leather hard-shell suitcase (matching reference photo!) gliding along conveyor
  const suitcaseGroup = new THREE.Group();
  const bagBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.44, 0.38), matLeather);
  const bagTrim = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.39), matStainless);
  const bagHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.12), matDarkSteel);
  bagHandle.position.set(0, 0.24, 0);
  suitcaseGroup.add(bagBody, bagTrim, bagHandle);
  suitcaseGroup.position.set(-1.65, 0.27, 0);
  animatedParts.conveyorBags?.push(suitcaseGroup);

  conveyor.group.add(mainBelt, beltSideL, beltSideR, entryRollerBed, exitRollerBed, drumMotor, vfdBox, suitcaseGroup);
  tagInteractive(conveyor.group, 'sys-xray', 'comp-xray-conveyor', conveyor.subsystemLayer);
  subComponents.push(conveyor);
  root.add(conveyor.group);

  // -----------------------------------------------------------------------
  // XR-07: Safety & Electrical Protection (4 Corner Red Beacons, E-Stops, Perforated Tunnel Shrouds, Lead Curtains & UPS)
  // -----------------------------------------------------------------------
  const safety = makeSubGroup('sys-xray', 'comp-xray-safety', [0, 1.4, 0]);
  animatedParts.stackLamp = matBeaconRed;

  // 4 Signature Rapiscan Upper-Corner Red X-Ray On Beacons
  [[-0.87, 0.18, 0.54], [-0.87, 0.18, -0.54], [0.87, 0.18, 0.54], [0.87, 0.18, -0.54]].forEach(([x, y, z]) => {
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.12), matBeaconRed);
    beacon.position.set(x, y, z);
    safety.group.add(beacon);
  });

  // Front (-X) Center Control Cluster: Green Ready Lamp + Prominent Red-on-Yellow E-Stop + Black Key Switch
  const frontEstopRing = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.025, 18), new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }));
  frontEstopRing.rotation.z = Math.PI / 2;
  frontEstopRing.position.set(-0.92, 0.02, 0);
  const frontEstopBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.045, 18), matBeaconRed);
  frontEstopBtn.rotation.z = Math.PI / 2;
  frontEstopBtn.position.set(-0.945, 0.02, 0);
  const frontGreenLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 14), matGreenLed);
  frontGreenLamp.rotation.z = Math.PI / 2;
  frontGreenLamp.position.set(-0.925, 0.02, -0.1);
  const frontKeySwitch = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.03, 14), matDarkSteel);
  frontKeySwitch.rotation.z = Math.PI / 2;
  frontKeySwitch.position.set(-0.925, 0.02, 0.1);

  // Rear (+X) Symmetrical Dual E-Stops + Status Indicators (matching rear reference photo)
  [-0.36, 0.36].forEach((zOff) => {
    const rBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.04, 16), matBeaconRed);
    rBtn.rotation.z = Math.PI / 2;
    rBtn.position.set(0.935, -0.02, zOff);
    safety.group.add(rBtn);
  });
  const rearGreenLed = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.025, 12), matGreenLed);
  rearGreenLed.rotation.z = Math.PI / 2;
  rearGreenLed.position.set(0.925, -0.02, 0.08);

  // Perforated Entry (-X) & Exit (+X) Safety Tunnel Extension Shrouds (from side & front photos)
  const shroudMat = new THREE.MeshStandardMaterial({ map: shroudPerfTex, roughness: 0.45, metalness: 0.4 });
  const buildShroud = (xCenter: number, len: number) => {
    const sGrp = new THREE.Group();
    const sTop = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.94), matCharcoal);
    sTop.position.set(xCenter, -0.14, 0);
    const sSideL = new THREE.Mesh(new THREE.BoxGeometry(len, 0.48, 0.045), shroudMat);
    sSideL.position.set(xCenter, -0.39, 0.45);
    const sSideR = sSideL.clone();
    sSideR.position.set(xCenter, -0.39, -0.45);
    sGrp.add(sTop, sSideL, sSideR);
    return sGrp;
  };
  const entryShroud = buildShroud(-1.14, 0.56);
  const exitShroud = buildShroud(1.14, 0.56);

  // Heavy Overlapping Dark Lead Curtain Strips inside Entry & Exit Tunnel Openings
  const leadMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.78, metalness: 0.12 });
  [-0.96, 0.96].forEach((xMouth) => {
    for (let i = 0; i < 8; i++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.58, 0.095), leadMat);
      strip.position.set(xMouth, -0.44, -0.35 + i * 0.1);
      safety.group.add(strip);
    }
  });

  // Floor-mounted Industrial UPS & Voltage Stabilizer beside cabinet
  const upsBox = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.42), matDarkSteel);
  upsBox.position.set(0.45, -1.16, -0.82);

  safety.group.add(
    frontEstopRing, frontEstopBtn, frontGreenLamp, frontKeySwitch, rearGreenLed,
    entryShroud, exitShroud, upsBox
  );
  tagInteractive(safety.group, 'sys-xray', 'comp-xray-safety', safety.subsystemLayer);
  subComponents.push(safety);
  root.add(safety.group);

  return { root, systemId: 'sys-xray', subComponents, outerShellMeshes, animatedParts };
}

// =========================================================================
// 2. METAL DETECTORS: CEIA HI-PE Plus WTMD & CEIA PD140N HHMD (6 Sub-Components)
// =========================================================================
export function buildWtmdSystem(maxAnisotropy: number): BuiltEquipmentUnit {
  const root = new THREE.Group();
  const subComponents: TaggedSubComponent[] = [];
  const outerShellMeshes: THREE.Mesh[] = [];

  // Authentic CEIA light industrial silver-grey & warm ABS materials
  const matCeiaBody = new THREE.MeshStandardMaterial({ color: 0xc5c9cc, roughness: 0.36, metalness: 0.24 });
  const matCeiaTrim = new THREE.MeshStandardMaterial({ color: 0xa6adb4, roughness: 0.3, metalness: 0.48 });
  const matBasePlate = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, roughness: 0.34, metalness: 0.68 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.45, metalness: 0.45 });
  const matCopper = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.28, metalness: 0.85 });
  const matRxBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.72 });
  const matGreenLed = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 1.05, roughness: 0.18 });
  const matRedLed = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.05, roughness: 0.18 });
  const matZoneIdle = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.25, metalness: 0.35 });
  const matHhmdBody = new THREE.MeshStandardMaterial({ color: 0xc9ccc6, roughness: 0.34, metalness: 0.08 });

  const ctrlTex = createCeiaWtmdControlTexture(maxAnisotropy);
  const logoTex = createCeiaLogoTexture(maxAnisotropy);
  const specTex = createCeiaSpecStickerTexture(maxAnisotropy);
  const hhmdFrontTex = createCeiaHhmdFrontTexture(maxAnisotropy);
  const hhmdBackTex = createCeiaHhmdBackTexture(maxAnisotropy);

  // --- OUTER SHELL (Turns translucent in X-Ray Casing mode to reveal TX/RX coils) ---
  const addShell = (mesh: THREE.Mesh) => {
    mesh.userData.isOuterShell = true;
    outerShellMeshes.push(mesh);
    tagInteractive(mesh, 'sys-wtmd');
    root.add(mesh);
  };

  // Thin flat brushed metallic floor baseplates under left & right pillars (grounded at y = 0)
  [-0.46, 0.46].forEach((xSign) => {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012, 0.66), matBasePlate.clone());
    plate.position.set(xSign, 0.006, 0);
    addShell(plate);

    // 4 corner floor anchor bolt caps
    [-0.085, 0.085].forEach((bx) => {
      [-0.28, 0.28].forEach((bz) => {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 8), matDark);
        bolt.position.set(xSign + bx, 0.014, bz);
        tagInteractive(bolt, 'sys-wtmd');
        root.add(bolt);
      });
    });

    // Main slim vertical arch pillar (full height 2.20m)
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.095, 2.2, 0.58), matCeiaBody.clone());
    pillar.position.set(xSign, 1.112, 0);
    addShell(pillar);

    // Subtle metallic edge frame trim strips along inner front/rear pillar edges
    [-0.285, 0.285].forEach((tz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.016, 2.18, 0.018), matCeiaTrim.clone());
      rail.position.set(xSign + (xSign < 0 ? 0.044 : -0.044), 1.11, tz);
      tagInteractive(rail, 'sys-wtmd');
      root.add(rail);
    });

    // Iconic CEIA lower two-thirds outward-bulging rounded coil-housing pod (~1.42m tall)
    const outDir = xSign < 0 ? -1 : 1;
    const podCore = new THREE.Mesh(new THREE.BoxGeometry(0.068, 1.38, 0.54), matCeiaBody.clone());
    podCore.position.set(xSign + outDir * 0.068, 0.71, 0);
    addShell(podCore);

    // Smooth vertical cylindrical side shoulders on the outer pod for sculpted CEIA curve
    [-0.255, 0.255].forEach((pz) => {
      const podCorner = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 1.38, 14), matCeiaBody.clone());
      podCorner.position.set(xSign + outDir * 0.068, 0.71, pz);
      addShell(podCorner);
    });

    // Domed top shoulder transition cap above the lower bulge (matching wtmd_front & wtmd_side)
    const podShoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.052, 0.54, 14), matCeiaBody.clone());
    podShoulder.rotation.x = Math.PI / 2;
    podShoulder.position.set(xSign + outDir * 0.062, 1.405, 0);
    addShell(podShoulder);

    // 3 recessed circular mounting screw pockets down front & rear flanks of outer pod
    [0.24, 0.72, 1.2].forEach((sy) => {
      [-0.275, 0.275].forEach((sz) => {
        const pocket = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 12), matDark);
        pocket.rotation.x = Math.PI / 2;
        pocket.position.set(xSign + outDir * 0.068, sy, sz);
        tagInteractive(pocket, 'sys-wtmd');
        root.add(pocket);
      });
    });
  });

  // Top Crossbeam Housing connecting left & right pillars
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.23, 0.58), matCeiaBody.clone());
  topBeam.position.set(0, 2.13, 0);
  addShell(topBeam);

  // Front-right CEIA circular sunburst + wordmark decal (+Z front face)
  const frontLogo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.13),
    new THREE.MeshStandardMaterial({ map: logoTex, roughness: 0.35, metalness: 0.1 })
  );
  frontLogo.position.set(0.26, 2.13, 0.292);
  tagInteractive(frontLogo, 'sys-wtmd');
  root.add(frontLogo);

  // Rear-right white CEIA compliance/serial specification label (-Z back face)
  const backSticker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.09),
    new THREE.MeshStandardMaterial({ map: specTex, roughness: 0.45 })
  );
  backSticker.rotation.y = Math.PI;
  backSticker.position.set(0.28, 2.13, -0.292);
  tagInteractive(backSticker, 'sys-wtmd');
  root.add(backSticker);

  // =========================================================================
  // MD-01: Transmitter Coil (Internal Multi-Turn Copper Winding in Left Pillar)
  // =========================================================================
  const tx = makeSubGroup('sys-wtmd', 'comp-wtmd-tx', [-0.46, 1.08, 0]);
  const txFrame = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.86, 0.42), matDark);
  const txWireOuter = new THREE.Mesh(new THREE.BoxGeometry(0.065, 1.78, 0.36), matCopper);
  // Visible horizontal copper turns
  for (let i = 0; i < 6; i++) {
    const turn = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.055, 0.44), matCopper);
    turn.position.set(0, -0.72 + i * 0.29, 0);
    tx.group.add(turn);
  }
  tx.group.add(txFrame, txWireOuter);
  tagInteractive(tx.group, 'sys-wtmd', 'comp-wtmd-tx', tx.subsystemLayer);
  subComponents.push(tx);
  root.add(tx.group);

  // =========================================================================
  // MD-02: Receiver Coil (Internal 6-Zone Multi-Channel Coils in Right Pillar)
  // =========================================================================
  const rx = makeSubGroup('sys-wtmd', 'comp-wtmd-rx', [0.46, 1.08, 0]);
  const rxSpine = new THREE.Mesh(new THREE.BoxGeometry(0.036, 1.84, 0.08), matDark);
  rx.group.add(rxSpine);
  for (let i = 0; i < 6; i++) {
    const zCoil = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.22, 0.42), matRxBlue);
    zCoil.position.set(0, -0.75 + i * 0.3, 0);
    const zCore = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.06, 0.36), matCopper);
    zCore.position.set(0, -0.75 + i * 0.3, 0);
    rx.group.add(zCoil, zCore);
  }
  tagInteractive(rx.group, 'sys-wtmd', 'comp-wtmd-rx', rx.subsystemLayer);
  subComponents.push(rx);
  root.add(rx.group);

  // =========================================================================
  // MD-03: CEIA Control Unit (Protruding Angled Front-Left LCD Bezel + Internal DSP)
  // =========================================================================
  const ctrl = makeSubGroup('sys-wtmd', 'comp-wtmd-ctrl', [-0.14, 2.13, 0]);
  // Internal DSP microprocessor board housed inside crosspiece
  const dspBoard = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.14, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.35, metalness: 0.45 })
  );
  dspBoard.position.set(0.14, 0, 0);
  // Iconic protruding angled CEIA Control Head bezel on front-left (+Z)
  const bezelBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.17, 0.065), matCeiaBody);
  bezelBody.position.set(0, 0, 0.312);
  bezelBody.rotation.x = -0.1;
  const bezelFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.43, 0.15),
    new THREE.MeshStandardMaterial({
      map: ctrlTex,
      emissiveMap: ctrlTex,
      emissive: 0xffffff,
      emissiveIntensity: 0.2,
      roughness: 0.28,
    })
  );
  bezelFace.position.set(0, 0.003, 0.347);
  bezelFace.rotation.x = -0.1;
  ctrl.group.add(dspBoard, bezelBody, bezelFace);
  tagInteractive(ctrl.group, 'sys-wtmd', 'comp-wtmd-ctrl', ctrl.subsystemLayer);
  subComponents.push(ctrl);
  root.add(ctrl.group);

  // =========================================================================
  // MD-04: Top Corner Red/Green Beacons + Dual Front/Back LED Zone Strips + Buzzer
  // =========================================================================
  const alarm = makeSubGroup('sys-wtmd', 'comp-wtmd-alarm', [0, 1.12, 0]);

  // Raised pillar top caps + cylindrical Red (Left) & Green (Right) corner beacons
  const capL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, 0.56), matCeiaBody);
  capL.position.set(-0.46, 1.145, 0);
  const capR = capL.clone();
  capR.position.set(0.46, 1.145, 0);

  const redBeaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.025, 16), matDark);
  redBeaconBase.position.set(-0.46, 1.178, 0.22);
  const redBeaconLens = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.055, 16), matRedLed);
  redBeaconLens.position.set(-0.46, 1.215, 0.22);

  const greenBeaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.025, 16), matDark);
  greenBeaconBase.position.set(0.46, 1.178, 0.22);
  const greenBeaconLens = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.055, 16), matGreenLed);
  greenBeaconLens.position.set(0.46, 1.215, 0.22);
  alarm.group.add(capL, capR, redBeaconBase, redBeaconLens, greenBeaconBase, greenBeaconLens);

  // Vertical recessed circular LED zone bars on BOTH front (+Z) & back (-Z) of BOTH pillars
  [-0.46, 0.46].forEach((px) => {
    [-0.292, 0.292].forEach((pz) => {
      const stripTrack = new THREE.Mesh(new THREE.BoxGeometry(0.038, 1.88, 0.012), matCeiaTrim);
      stripTrack.position.set(px, -0.04, pz);
      alarm.group.add(stripTrack);

      for (let i = 0; i < 10; i++) {
        const yOff = -0.84 + i * 0.18;
        const ledMat = i === 9 ? matGreenLed : i === 5 ? matRedLed : matZoneIdle;
        const ledDot = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.014, 10), ledMat);
        ledDot.rotation.x = Math.PI / 2;
        ledDot.position.set(px, yOff, pz + (pz > 0 ? 0.004 : -0.004));
        alarm.group.add(ledDot);
      }
    });
  });

  // Recessed acoustic buzzer grille underneath crossbeam
  const buzzer = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.025, 16), matDark);
  buzzer.position.set(0.18, 0.895, 0.08);
  alarm.group.add(buzzer);

  tagInteractive(alarm.group, 'sys-wtmd', 'comp-wtmd-alarm', alarm.subsystemLayer);
  subComponents.push(alarm);
  root.add(alarm.group);

  // =========================================================================
  // MD-05: Inner Arch Photocell & Optical Reflector Pairs (Waist Height)
  // =========================================================================
  const pc = makeSubGroup('sys-wtmd', 'comp-wtmd-photocell', [0, 0.94, 0]);
  [-0.17, 0.17].forEach((pz) => {
    // Left inner wall IR transmitter disc
    const housingL = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.024, 16), matCeiaBody);
    housingL.rotation.z = Math.PI / 2;
    housingL.position.set(-0.405, 0, pz);
    const lensL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.028, 14), matDark);
    lensL.rotation.z = Math.PI / 2;
    lensL.position.set(-0.402, 0, pz);

    // Right inner wall IR optical receiver/reflector disc
    const housingR = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.024, 16), matCeiaBody);
    housingR.rotation.z = Math.PI / 2;
    housingR.position.set(0.405, 0, pz);
    const lensR = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.028, 14),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.85 })
    );
    lensR.rotation.z = Math.PI / 2;
    lensR.position.set(0.402, 0, pz);

    pc.group.add(housingL, lensL, housingR, lensR);
  });
  tagInteractive(pc.group, 'sys-wtmd', 'comp-wtmd-photocell', pc.subsystemLayer);
  subComponents.push(pc);
  root.add(pc.group);

  // =========================================================================
  // MD-06: Power Supply (UPS/24V PSU) + High-Detail CEIA PD140N HHMD on Left Stand
  // Positioned on LEFT outer side (-X) of WTMD so WTMD aligns cleanly beside X-Ray
  // =========================================================================
  const power = makeSubGroup('sys-wtmd', 'comp-wtmd-power', [-1.04, 0.45, 0.04]);

  // Compact SCP inspection pedestal + lower UPS/PSU bay
  const pedBase = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.04, 0.48), matBasePlate);
  pedBase.position.set(0, -0.43, 0);
  const pedCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.78, 0.4), matDark);
  pedCabinet.position.set(0, -0.02, 0);
  const psuFront = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.025), matCeiaTrim);
  psuFront.position.set(0, -0.18, 0.205);
  const psuLed = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.016, 0.03), matGreenLed);
  psuLed.position.set(0.11, -0.12, 0.208);
  const pedTop = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.5), matCeiaBody);
  pedTop.position.set(0, 0.395, 0);

  // Angled dark cradle dock on top of stand holding the CEIA PD140N HHMD clearly visible
  const cradleBase = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.14), matDark);
  cradleBase.position.set(0, 0.44, 0.02);

  // Sculpted CEIA PD140N HHMD Wand (Contoured paddle blade + tapered handle + rear coil disc + lanyard)
  const hhmdGroup = new THREE.Group();
  const wandShape = new THREE.Shape();
  // Contoured PD140N silhouette (height ~0.40m scaled gently for clear 3D readability)
  wandShape.moveTo(-0.024, -0.20);
  wandShape.lineTo(0.024, -0.20);
  wandShape.quadraticCurveTo(0.028, -0.16, 0.022, -0.05);
  wandShape.quadraticCurveTo(0.026, 0.01, 0.046, 0.045);
  wandShape.lineTo(0.048, 0.175);
  wandShape.quadraticCurveTo(0.048, 0.20, 0.024, 0.20);
  wandShape.lineTo(-0.024, 0.20);
  wandShape.quadraticCurveTo(-0.048, 0.20, -0.048, 0.175);
  wandShape.lineTo(-0.046, 0.045);
  wandShape.quadraticCurveTo(-0.026, 0.01, -0.022, -0.05);
  wandShape.quadraticCurveTo(-0.028, -0.16, -0.024, -0.20);

  const wandGeo = new THREE.ExtrudeGeometry(wandShape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.007,
    bevelSize: 0.005,
    bevelSegments: 4,
  });
  wandGeo.center();
  const wandBody = new THREE.Mesh(wandGeo, matHhmdBody);

  // Ergonomic cylindrical battery end-cap & subtle handle swell
  const handleGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.024, 0.16, 16), matHhmdBody);
  handleGrip.position.set(0, -0.115, 0);
  const bottomCap = new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 10), matHhmdBody);
  bottomCap.scale.set(1, 0.65, 1);
  bottomCap.position.set(0, -0.195, 0);

  // Front CEIA PD140N faceplate graphic (sunburst logo, speaker dot matrix, OK & Power pad)
  const hhmdFrontFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.088, 0.34),
    new THREE.MeshStandardMaterial({ map: hhmdFrontTex, roughness: 0.32, metalness: 0.06 })
  );
  hhmdFrontFace.position.set(0, 0.018, 0.021);

  // Rear CEIA PD140N compliance label + ribbed battery door graphic
  const hhmdBackFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.084, 0.33),
    new THREE.MeshStandardMaterial({ map: hhmdBackTex, roughness: 0.35, metalness: 0.06 })
  );
  hhmdBackFace.rotation.y = Math.PI;
  hhmdBackFace.position.set(0, 0.018, -0.021);

  // Distinctive raised circular sensing coil disc on upper back of detection blade (from hhmd_back.jpg)
  const rearCoilDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.009, 20), matHhmdBody);
  rearCoilDisc.rotation.x = Math.PI / 2;
  rearCoilDisc.position.set(0, 0.125, -0.023);

  // Black woven CEIA wrist lanyard strap attached to metal eyelet at base
  const lanyardRing = new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.0025, 8, 16), matBasePlate);
  lanyardRing.position.set(0, -0.21, 0);
  const lanyardLoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.006, 8, 22),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.82 })
  );
  lanyardLoop.scale.set(0.55, 1.45, 0.35);
  lanyardLoop.position.set(0.018, -0.28, -0.01);
  lanyardLoop.rotation.z = 0.28;

  hhmdGroup.add(wandBody, handleGrip, bottomCap, hhmdFrontFace, hhmdBackFace, rearCoilDisc, lanyardRing, lanyardLoop);
  // Display HHMD upright & tilted slightly toward approaching officer/student so front/side/back are easy to inspect
  hhmdGroup.scale.setScalar(1.22);
  hhmdGroup.position.set(0, 0.67, 0.02);
  hhmdGroup.rotation.set(-0.32, 0.24, 0.08);

  power.group.add(pedBase, pedCabinet, psuFront, psuLed, pedTop, cradleBase, hhmdGroup);
  tagInteractive(power.group, 'sys-wtmd', 'comp-wtmd-power', power.subsystemLayer);
  subComponents.push(power);
  root.add(power.group);

  return { root, systemId: 'sys-wtmd', subComponents, outerShellMeshes, animatedParts: {} };
}

// =========================================================================
// 3. CCTV & PIDS SYSTEM (4 Named Sub-Components: Hikvision PTZ + Sony IPELA Fixed)
// =========================================================================
export function buildCctvPidsSystem(maxAnisotropy: number): BuiltEquipmentUnit {
  const root = new THREE.Group();
  const subComponents: TaggedSubComponent[] = [];
  const outerShellMeshes: THREE.Mesh[] = [];
  const animatedParts: BuiltEquipmentUnit['animatedParts'] = {};

  const matSteel = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.78 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.55 });
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xeef1f4, roughness: 0.34, metalness: 0.14 });
  const matLightGrey = new THREE.MeshStandardMaterial({ color: 0xdce1e6, roughness: 0.36, metalness: 0.2 });
  const matYokeCharcoal = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.4, metalness: 0.32 });
  const matTurretRear = new THREE.MeshStandardMaterial({ color: 0x202329, roughness: 0.42, metalness: 0.28 });
  const matSmokedIrGlass = new THREE.MeshPhysicalMaterial({
    color: 0x101419,
    roughness: 0.08,
    metalness: 0.24,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
  });
  const matLensGlass = new THREE.MeshPhysicalMaterial({
    color: 0x164e63,
    emissive: 0x0e7490,
    emissiveIntensity: 0.25,
    roughness: 0.05,
    metalness: 0.45,
    clearcoat: 1.0,
  });
  const matTeal = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.35, metalness: 0.45, emissive: 0x0f766e, emissiveIntensity: 0.4 });
  const matStainless = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.22, metalness: 0.9 });

  const hikDomeTex = createHikvisionDomeTexture(maxAnisotropy);
  const barcodeTex = createCeiaSpecStickerTexture(maxAnisotropy);

  // Pole & Fence Base Structure (Outer Shell)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.25, 18), matSteel.clone());
  mast.position.set(0, 1.625, 0);
  mast.userData.isOuterShell = true;
  outerShellMeshes.push(mast);
  tagInteractive(mast, 'sys-cctv-pids');
  root.add(mast);

  // =========================================================================
  // CP-01: Surveillance Cameras — Hikvision Speed Dome PTZ + Sony IPELA Fixed Bullet
  // =========================================================================
  const cams = makeSubGroup('sys-cctv-pids', 'comp-cctv-cameras', [0, 2.74, 0]);

  // --- A. HIKVISION SPEED DOME IR PTZ (Right side of mast, pendant goose-neck mount) ---
  const ptzAssembly = new THREE.Group();
  ptzAssembly.position.set(0.44, 0.08, 0.24);

  // White industrial goose-neck pendant bracket arm connecting mast to PTZ top collar
  const poleClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.18, 16), matWhite);
  poleClamp.position.set(-0.44, 0.28, -0.24);
  const armHoriz = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.48, 14), matWhite);
  armHoriz.rotation.z = Math.PI / 2;
  armHoriz.position.set(-0.22, 0.34, -0.12);
  armHoriz.rotation.y = -0.45;
  const armElbow = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), matWhite);
  armElbow.position.set(0, 0.34, 0);
  const armDrop = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.1, 14), matWhite);
  armDrop.position.set(0, 0.29, 0);

  // Top cylindrical pendant collar + mechanical latch & stepped shoulder with 4 hex bolts
  const topCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.055, 18), matWhite);
  topCollar.position.set(0, 0.245, 0);
  const collarLatch = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.044, 0.025), matLightGrey);
  collarLatch.position.set(0, 0.245, 0.055);

  const shoulderCone = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.132, 0.062, 24), matLightGrey);
  shoulderCone.position.set(0, 0.188, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const hexBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.016, 6), matStainless);
    hexBolt.position.set(Math.cos(a) * 0.105, 0.188, Math.sin(a) * 0.105);
    ptzAssembly.add(hexBolt);
  }

  // Smooth curved white bell dome (LatheGeometry) with crisp HIKVISION wordmark on front (+Z)
  const bellPts = [
    new THREE.Vector2(0.186, 0.0),
    new THREE.Vector2(0.182, 0.045),
    new THREE.Vector2(0.172, 0.095),
    new THREE.Vector2(0.154, 0.14),
    new THREE.Vector2(0.132, 0.168),
  ];
  const bellGeo = new THREE.LatheGeometry(bellPts, 32);
  const bellMat = new THREE.MeshStandardMaterial({ map: hikDomeTex, roughness: 0.34, metalness: 0.12 });
  const bellDome = new THREE.Mesh(bellGeo, bellMat);
  bellDome.position.set(0, 0.0, 0);
  bellDome.rotation.y = Math.PI; // Maps canvas u=0.5 (HIKVISION) cleanly to +Z front
  const bellLip = new THREE.Mesh(new THREE.TorusGeometry(0.184, 0.006, 10, 32), matLightGrey);
  bellLip.rotation.x = Math.PI / 2;
  bellLip.position.set(0, 0.002, 0);

  // Rotating PTZ Head (Charcoal U-Yoke + Spherical Optical Turret + Protruding Multi-Coated Lens)
  const ptzHead = new THREE.Group();
  ptzHead.position.set(0, 0, 0);

  // Upper rotating pan base ring tucked cleanly inside bell dome
  const panBase = new THREE.Mesh(new THREE.CylinderGeometry(0.166, 0.162, 0.055, 24), matYokeCharcoal);
  panBase.position.set(0, -0.02, 0);

  // Sculpted twin charcoal side yoke arms flanking optical sphere (matching ptz_front, ptz_side, ptz_back)
  [-1, 1].forEach((sideSign) => {
    const yokeArm = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.22, 0.155), matYokeCharcoal);
    yokeArm.position.set(sideSign * 0.146, -0.145, 0);
    const yokeBottomCap = new THREE.Mesh(new THREE.CylinderGeometry(0.077, 0.077, 0.042, 18), matYokeCharcoal);
    yokeBottomCap.rotation.z = Math.PI / 2;
    yokeBottomCap.position.set(sideSign * 0.146, -0.252, 0);
    // Outer cheek raised bevel plate + 4 recessed screw sockets (from ptz_side.jpg)
    const cheekPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.012, 18), matYokeCharcoal);
    cheekPlate.rotation.z = Math.PI / 2;
    cheekPlate.position.set(sideSign * 0.167, -0.22, 0);
    [[-0.08, 0.05], [-0.08, -0.05], [-0.25, 0.045], [-0.25, -0.045]].forEach(([sy, sz]) => {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.008, 10), matDark);
      screw.rotation.z = Math.PI / 2;
      screw.position.set(sideSign * 0.169, sy, sz);
      ptzHead.add(screw);
    });
    ptzHead.add(yokeArm, yokeBottomCap, cheekPlate);
  });

  // Spherical optical camera turret centered between yoke arms
  const turretGroup = new THREE.Group();
  turretGroup.position.set(0, -0.185, 0);

  // Matte dark charcoal rear sphere body (ptz_back.jpg)
  const turretRear = new THREE.Mesh(new THREE.SphereGeometry(0.134, 24, 18), matTurretRear);
  turretGroup.add(turretRear);

  // Rear 4 recessed screw holes + bottom-rear white serial barcode sticker (matching ptz_back.jpg)
  [[-0.06, 0.055], [0.06, 0.055], [-0.06, -0.055], [0.06, -0.055]].forEach(([sx, sy]) => {
    const rScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.014, 10), matDark);
    rScrew.rotation.x = Math.PI / 2;
    rScrew.position.set(sx, sy, -0.116);
    turretGroup.add(rScrew);
  });
  const ptzBarcode = new THREE.Mesh(
    new THREE.PlaneGeometry(0.048, 0.022),
    new THREE.MeshStandardMaterial({ map: barcodeTex, roughness: 0.45 })
  );
  ptzBarcode.rotation.y = Math.PI;
  ptzBarcode.rotation.x = 0.55;
  ptzBarcode.position.set(-0.028, -0.112, -0.072);
  turretGroup.add(ptzBarcode);

  // Front glossy smoked IR curved faceplate (+Z hemisphere)
  const frontGlassSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.136, 24, 18, -Math.PI * 0.38, Math.PI * 0.76, Math.PI * 0.16, Math.PI * 0.68),
    matSmokedIrGlass
  );
  frontGlassSphere.rotation.y = Math.PI / 2;
  turretGroup.add(frontGlassSphere);

  // Central protruding multi-coated zoom lens barrel (matching ptz_front.jpg & ptz_side.jpg)
  const lensBarrelOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.044, 24), matYokeCharcoal);
  lensBarrelOuter.rotation.x = Math.PI / 2;
  lensBarrelOuter.position.set(0, 0.018, 0.128);
  const lensBezelRing = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.005, 10, 24), matSteel);
  lensBezelRing.position.set(0, 0.018, 0.15);
  const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.046, 24), matLensGlass);
  lensGlass.position.set(0, 0.018, 0.151);
  // Small circular optical light sensor at bottom rim of front face (ptz_front.jpg)
  const lightSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.014, 12), matSteel);
  lightSensor.rotation.x = Math.PI / 2;
  lightSensor.position.set(0, -0.115, 0.072);

  turretGroup.add(lensBarrelOuter, lensBezelRing, lensGlass, lightSensor);
  ptzHead.add(panBase, turretGroup);
  animatedParts.ptzHead = ptzHead;

  ptzAssembly.add(poleClamp, armHoriz, armElbow, armDrop, topCollar, collarLatch, shoulderCone, bellDome, bellLip, ptzHead);

  // --- B. SONY IPELA HD IR FIXED BULLET CAMERA (Left side of mast) ---
  const fixedAssembly = new THREE.Group();
  fixedAssembly.position.set(-0.44, -0.22, 0.01);
  fixedAssembly.rotation.y = -0.14;
  fixedAssembly.rotation.x = 0.08;

  // Steel pole-mount clamp + bracket bar supporting Sony circular wall flange
  const fixedClamp = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.16, 16), matSteel);
  fixedClamp.position.set(0.44, 0.02, -0.01);
  const fixedCrossbar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.055, 0.055), matSteel);
  fixedCrossbar.position.set(0.22, 0.02, -0.01);
  const sonyUnit = createSonyFixedBulletCamera(maxAnisotropy);
  fixedAssembly.add(fixedClamp, fixedCrossbar, sonyUnit);

  // --- C. HIKVISION VANDAL-RESISTANT FISHEYE DOME CAMERA (Overhead left-front arm) ---
  const fisheyeMount = new THREE.Group();
  fisheyeMount.position.set(-0.18, 0.36, 0.32);
  const fishArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.36), matWhite);
  fishArm.position.set(0.09, 0.025, -0.16);
  fishArm.rotation.y = -0.46;
  const fisheyeUnit = createHikvisionFisheyeCamera(maxAnisotropy);
  fisheyeMount.add(fishArm, fisheyeUnit);

  cams.group.add(ptzAssembly, fixedAssembly, fisheyeMount);
  tagInteractive(cams.group, 'sys-cctv-pids', 'comp-cctv-cameras', cams.subsystemLayer);
  subComponents.push(cams);
  root.add(cams.group);

  // =========================================================================
  // CP-02: HIKVISION 2U 16-Port PoE NVR & RAID Storage Unit
  // =========================================================================
  const nvr = makeSubGroup('sys-cctv-pids', 'comp-cctv-nvr', [0.88, 0.72, -0.18]);
  const nvrFrontTex = createHikvisionNvrFrontTexture(maxAnisotropy);
  const nvrRightSideTex = createHikvisionNvrSideTexture(maxAnisotropy, true);
  const nvrLeftSideTex = createHikvisionNvrSideTexture(maxAnisotropy, false);
  const nvrBackTex = createHikvisionNvrBackTexture(maxAnisotropy);

  // Compact industrial field rack shelf/pedestal supporting the 2U NVR cleanly from y = 0
  const shelfBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.62, 0.56), matDark);
  shelfBase.position.set(0, -0.41, 0);
  const shelfTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.035, 0.6), matSteel);
  shelfTop.position.set(0, -0.085, 0);
  nvr.group.add(shelfBase, shelfTop);

  // 4 low rubber feet under the NVR chassis
  [[-0.29, -0.21], [0.29, -0.21], [-0.29, 0.21], [0.29, 0.21]].forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.016, 12), matDark);
    foot.position.set(fx, -0.06, fz);
    nvr.group.add(foot);
  });

  // Main 2U Hikvision NVR Chassis (0.72m W x 0.145m H x 0.54m D) with authentic 6-face materials
  const matNvrTop = new THREE.MeshStandardMaterial({ color: 0x1b1e24, roughness: 0.46, metalness: 0.45 });
  const matNvrRight = new THREE.MeshStandardMaterial({ map: nvrRightSideTex, roughness: 0.44, metalness: 0.42 });
  const matNvrLeft = new THREE.MeshStandardMaterial({ map: nvrLeftSideTex, roughness: 0.44, metalness: 0.42 });
  const matNvrFront = new THREE.MeshStandardMaterial({
    map: nvrFrontTex,
    emissiveMap: nvrFrontTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.14,
    roughness: 0.18,
    metalness: 0.35,
  });
  const matNvrBack = new THREE.MeshStandardMaterial({ map: nvrBackTex, roughness: 0.38, metalness: 0.55 });

  const nvrChassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.145, 0.54),
    [matNvrRight, matNvrLeft, matNvrTop, matNvrTop, matNvrFront, matNvrBack]
  );
  nvrChassis.position.set(0, 0.02, 0);

  // Sculpted silver-aluminum beveled front collar lip matching nvr_front & nvr_side
  const silverRimTop = new THREE.Mesh(new THREE.BoxGeometry(0.726, 0.012, 0.03), matStainless);
  silverRimTop.position.set(0, 0.092, 0.258);
  const silverRimBot = new THREE.Mesh(new THREE.BoxGeometry(0.726, 0.012, 0.03), matStainless);
  silverRimBot.position.set(0, -0.052, 0.258);

  // Protruding metallic rear BNC coaxial jack (visible in nvr_side.jpg & nvr_back.jpg)
  const rearBnc = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.024, 14), matStainless);
  rearBnc.rotation.x = Math.PI / 2;
  rearBnc.position.set(-0.125, 0.018, -0.28);

  nvr.group.add(nvrChassis, silverRimTop, silverRimBot, rearBnc);
  tagInteractive(nvr.group, 'sys-cctv-pids', 'comp-cctv-nvr', nvr.subsystemLayer);
  subComponents.push(nvr);
  root.add(nvr.group);

  // CP-03: Optical Fiber & Media Converter Box
  const fiber = makeSubGroup('sys-cctv-pids', 'comp-cctv-fiber', [0, 1.05, 0.22]);
  const junctionBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.26), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.38, metalness: 0.4 }));
  const fiberCoil = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 10, 24), new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 }));
  fiberCoil.position.set(0, -0.02, 0.14);
  const sfpMod = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.08), matDark);
  sfpMod.position.set(0, 0.13, 0.14);
  fiber.group.add(junctionBox, fiberCoil, sfpMod);
  tagInteractive(fiber.group, 'sys-cctv-pids', 'comp-cctv-fiber', fiber.subsystemLayer);
  subComponents.push(fiber);
  root.add(fiber.group);

  // CP-04: PIDS Radar Scanning Unit & Fence Vibration Wire Module
  const radar = makeSubGroup('sys-cctv-pids', 'comp-pids-sensors', [-0.65, 2.05, -0.25]);
  const radarPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.24, 16), matDark);
  const radarDish = new THREE.Group();
  const dishBody = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.16), matWhite);
  const dishFace = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.04), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.25, emissive: 0x0284c7, emissiveIntensity: 0.35 }));
  dishFace.position.z = 0.08;
  radarDish.add(dishBody, dishFace);
  radarDish.position.y = 0.22;
  animatedParts.radarDish = radarDish;

  // Vibration fence post section
  const fencePanel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 0.04), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.7, wireframe: true }));
  fencePanel.position.set(-0.35, -1.1, 0);
  const piezoBox = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.12), new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 }));
  piezoBox.position.set(0.12, -1.05, 0.06);

  radar.group.add(radarPedestal, radarDish, fencePanel, piezoBox);
  tagInteractive(radar.group, 'sys-cctv-pids', 'comp-pids-sensors', radar.subsystemLayer);
  subComponents.push(radar);
  root.add(radar.group);

  return { root, systemId: 'sys-cctv-pids', subComponents, outerShellMeshes, animatedParts };
}

// =========================================================================
// 4. ACCESS CONTROL & FIRE ALARM (4 Named Sub-Components)
// =========================================================================
export function buildAccessFireSystem(): BuiltEquipmentUnit {
  const root = new THREE.Group();
  const subComponents: TaggedSubComponent[] = [];
  const outerShellMeshes: THREE.Mesh[] = [];

  const matStainless = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.24, metalness: 0.85 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.55 });
  const matFireRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.32, metalness: 0.25 });
  const matGlass = new THREE.MeshPhysicalMaterial({ color: 0x7dd3fc, roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.48 });

  // Outer Door Frame & Partition Wall (Outer Shell)
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.35, 0.24), matStainless.clone());
  frameL.position.set(-0.9, 1.175, 0);
  const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.35, 0.24), matStainless.clone());
  frameR.position.set(0.9, 1.175, 0);
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.14, 0.24), matStainless.clone());
  frameTop.position.set(0, 2.35, 0);
  [frameL, frameR, frameTop].forEach((m) => {
    m.userData.isOuterShell = true;
    outerShellMeshes.push(m);
    root.add(m);
  });
  tagInteractive(frameL, 'sys-access-fire');
  tagInteractive(frameR, 'sys-access-fire');
  tagInteractive(frameTop, 'sys-access-fire');

  // AF-01: Fingerprint & RFID Card Reader Pedestal
  const reader = makeSubGroup('sys-access-fire', 'comp-access-reader', [-0.72, 1.15, 0.42]);
  const readerPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.12), matDark);
  readerPost.position.set(0, -0.575, 0);
  const readerHead = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.09), matDark);
  const rfidGlow = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.03), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.7 }));
  rfidGlow.position.set(0, 0.06, 0.045);
  const bioLens = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.03), new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: 0.6 }));
  bioLens.position.set(0, -0.08, 0.045);
  reader.group.add(readerPost, readerHead, rfidGlow, bioLens);
  tagInteractive(reader.group, 'sys-access-fire', 'comp-access-reader', reader.subsystemLayer);
  subComponents.push(reader);
  root.add(reader.group);

  // AF-02: Flap Barrier & Magnetic Lock
  const lock = makeSubGroup('sys-access-fire', 'comp-access-lock', [0, 0.55, 0]);
  const barrierL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.96, 1.1), matStainless);
  barrierL.position.set(-0.52, -0.07, 0);
  const barrierR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.96, 1.1), matStainless);
  barrierR.position.set(0.52, -0.07, 0);
  const flapWingL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.62, 0.04), matGlass);
  flapWingL.position.set(-0.2, 0.04, 0);
  const flapWingR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.62, 0.04), matGlass);
  flapWingR.position.set(0.2, 0.04, 0);
  const magLock = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.12), matDark);
  magLock.position.set(0, 1.66, 0);
  lock.group.add(barrierL, barrierR, flapWingL, flapWingR, magLock);
  tagInteractive(lock.group, 'sys-access-fire', 'comp-access-lock', lock.subsystemLayer);
  subComponents.push(lock);
  root.add(lock.group);

  // AF-03: Access Control Server & Display
  const server = makeSubGroup('sys-access-fire', 'comp-access-server', [1.22, 1.05, -0.35]);
  const acpCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.72, 0.34), matDark);
  const acpScreen = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.03), new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0369a1, emissiveIntensity: 0.45 }));
  acpScreen.position.set(0, 0.14, 0.175);
  server.group.add(acpCabinet, acpScreen);
  tagInteractive(server.group, 'sys-access-fire', 'comp-access-server', server.subsystemLayer);
  subComponents.push(server);
  root.add(server.group);

  // AF-04: Fire Alarm System (MCFA Panel, Smoke/Heat Detector, Manual Call Point, Siren/Strobe)
  const fire = makeSubGroup('sys-access-fire', 'comp-fire-mcfa', [1.18, 1.48, 0.32]);
  const mcfaPanel = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.66, 0.18), matFireRed);
  const mcfaLcd = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.03), new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xca8a04, emissiveIntensity: 0.55 }));
  mcfaLcd.position.set(0, 0.12, 0.09);
  const mcpBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.08), matFireRed);
  mcpBox.position.set(-0.46, -0.22, 0.04);
  const strobe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 16), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.85, roughness: 0.2 }));
  strobe.position.set(0, 0.46, 0.04);
  const smokeDet = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.08, 18), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }));
  smokeDet.position.set(-0.78, 0.92, -0.25);
  fire.group.add(mcfaPanel, mcfaLcd, mcpBox, strobe, smokeDet);
  tagInteractive(fire.group, 'sys-access-fire', 'comp-fire-mcfa', fire.subsystemLayer);
  subComponents.push(fire);
  root.add(fire.group);

  return { root, systemId: 'sys-access-fire', subComponents, outerShellMeshes, animatedParts: {} };
}

// =========================================================================
// 5. FIDS, BIDS, MASTER CLOCK & PAS/AAS (3 Named Sub-Components)
// =========================================================================
export function buildFidsPasSystem(maxAnisotropy: number): BuiltEquipmentUnit {
  const root = new THREE.Group();
  const subComponents: TaggedSubComponent[] = [];
  const outerShellMeshes: THREE.Mesh[] = [];
  const animatedParts: BuiltEquipmentUnit['animatedParts'] = {};

  const matFrame = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.82 });

  // Outer Gantry Support Frame (Outer Shell)
  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.1, 16), matMetal.clone());
  postL.position.set(-1.55, 1.55, 0);
  const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.1, 16), matMetal.clone());
  postR.position.set(1.55, 1.55, 0);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.14, 0.22), matMetal.clone());
  beam.position.set(0, 3.05, 0);
  [postL, postR, beam].forEach((m) => {
    m.userData.isOuterShell = true;
    outerShellMeshes.push(m);
    root.add(m);
  });
  tagInteractive(postL, 'sys-fids-pas');
  tagInteractive(postR, 'sys-fids-pas');
  tagInteractive(beam, 'sys-fids-pas');

  // AV-01: FIDS Displays + Media Player
  const fids = makeSubGroup('sys-fids-pas', 'comp-fids-displays', [-0.25, 2.25, 0]);
  const fidsChassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.18, 0.14), matFrame);
  const fidsCanvas = createFidsCanvasTexture(maxAnisotropy);
  animatedParts.fidsUpdater = fidsCanvas.redraw;
  const fidsFront = new THREE.Mesh(
    new THREE.PlaneGeometry(2.18, 1.06),
    new THREE.MeshStandardMaterial({ map: fidsCanvas.texture, emissiveMap: fidsCanvas.texture, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.2 })
  );
  fidsFront.position.z = 0.075;
  const fidsBack = fidsFront.clone();
  fidsBack.rotation.y = Math.PI;
  fidsBack.position.z = -0.075;
  const mediaPlayer = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.26), new THREE.MeshStandardMaterial({ color: 0x3730a3, roughness: 0.35, metalness: 0.5 }));
  mediaPlayer.position.set(0, -0.68, -0.05);
  fids.group.add(fidsChassis, fidsFront, fidsBack, mediaPlayer);
  tagInteractive(fids.group, 'sys-fids-pas', 'comp-fids-displays', fids.subsystemLayer);
  subComponents.push(fids);
  root.add(fids.group);

  // AV-02: Master Clock Unit
  const clock = makeSubGroup('sys-fids-pas', 'comp-master-clock', [1.18, 2.68, 0.12]);
  const clockCase = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.38, 0.14), matFrame);
  const clockCanvas = createMasterClockTexture(maxAnisotropy);
  animatedParts.clockUpdater = clockCanvas.redraw;
  const clockFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.32),
    new THREE.MeshStandardMaterial({ map: clockCanvas.texture, emissiveMap: clockCanvas.texture, emissive: 0xffffff, emissiveIntensity: 0.65, roughness: 0.2 })
  );
  clockFace.position.z = 0.075;
  clock.group.add(clockCase, clockFace);
  tagInteractive(clock.group, 'sys-fids-pas', 'comp-master-clock', clock.subsystemLayer);
  subComponents.push(clock);
  root.add(clock.group);

  // AV-03: PAS & AAS Audio Stack (Digital Mixer, 100V Power Amp, Indoor Column & Ceiling Speakers)
  const pas = makeSubGroup('sys-fids-pas', 'comp-pas-aas', [0, 0.72, 0]);
  const ampRack = new THREE.Mesh(new THREE.BoxGeometry(0.74, 1.1, 0.56), matFrame);
  for (let i = 0; i < 4; i++) {
    const unit = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.18, 0.05), new THREE.MeshStandardMaterial({ color: i === 0 ? 0x4f46e5 : 0x334155, roughness: 0.35, metalness: 0.65 }));
    unit.position.set(0, 0.32 - i * 0.24, 0.28);
    pas.group.add(unit);
  }
  const sharedColTex = createColumnSpeakerGrilleTexture(maxAnisotropy);
  const colLHandle = createColumnSpeakerUnit(maxAnisotropy, sharedColTex);
  colLHandle.group.scale.setScalar(0.88);
  colLHandle.group.position.set(-1.55, 1.55, 0.08);
  colLHandle.group.rotation.order = 'YXZ';
  colLHandle.group.rotation.y = -0.18;
  colLHandle.group.rotation.x = 0.12;
  const colRHandle = createColumnSpeakerUnit(maxAnisotropy, sharedColTex);
  colRHandle.group.scale.setScalar(0.88);
  colRHandle.group.position.set(1.55, 1.55, 0.08);
  colRHandle.group.rotation.order = 'YXZ';
  colRHandle.group.rotation.y = 0.18;
  colRHandle.group.rotation.x = 0.12;
  pas.group.add(ampRack, colLHandle.group, colRHandle.group);
  tagInteractive(pas.group, 'sys-fids-pas', 'comp-pas-aas', pas.subsystemLayer);
  subComponents.push(pas);
  root.add(pas.group);

  return { root, systemId: 'sys-fids-pas', subComponents, outerShellMeshes, animatedParts };
}

// =========================================================================
// 6. GROUND COMMUNICATIONS RADIO & IGCS/PABX (2 Named Sub-Components + Crash Car)
// =========================================================================
export function buildRadioIgcsSystem(): BuiltEquipmentUnit {
  const root = new THREE.Group();
  const subComponents: TaggedSubComponent[] = [];
  const outerShellMeshes: THREE.Mesh[] = [];

  const matEmergencyYellow = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3, metalness: 0.35 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.55 });
  const matGlass = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.72 });
  const matEmerald = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.35, metalness: 0.45, emissive: 0x047857, emissiveIntensity: 0.45 });

  // Outer Shell: Airport ARFF Crash Car (Multi-part Composite Vehicle)
  const vehicle = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.05, 1.35), matEmergencyYellow.clone());
  hull.position.set(-0.35, 0.88, -0.45);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.65, 1.28), matEmergencyYellow.clone());
  cab.position.set(0.42, 1.68, -0.45);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 1.18), matGlass);
  windshield.position.set(0.92, 1.66, -0.45);
  const lightbar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.86), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.65 }));
  lightbar.position.set(0.45, 2.06, -0.45);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 20);
  [[-1.2, 0.36, 0.24], [-1.2, 0.36, -1.14], [0.55, 0.36, 0.24], [0.55, 0.36, -1.14]].forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, matDark);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, y, z);
    vehicle.add(w);
  });
  [hull, cab].forEach((m) => {
    m.userData.isOuterShell = true;
    outerShellMeshes.push(m);
  });
  vehicle.add(hull, cab, windshield, lightbar);
  tagInteractive(vehicle, 'sys-radio-igcs');
  root.add(vehicle);

  // RC-01: Radio Transceiver (HT Chargers on Desk + Mobile RIG & Whip Antenna on Crash Car)
  const radio = makeSubGroup('sys-radio-igcs', 'comp-radio-transceiver', [-0.4, 1.12, 0.92]);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.62), new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 }));
  desk.position.set(0, -0.28, 0);
  const deskLegL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.84, 0.54), matDark);
  deskLegL.position.set(-0.56, -0.7, 0);
  const deskLegR = deskLegL.clone();
  deskLegR.position.set(0.56, -0.7, 0);

  // Two Handheld HT radios in charger cradles
  for (let i = 0; i < 2; i++) {
    const htBody = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.07), matDark);
    htBody.position.set(-0.32 + i * 0.24, -0.1, 0.06);
    const htAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.26, 10), matDark);
    htAnt.position.set(-0.29 + i * 0.24, 0.14, 0.06);
    const pttLed = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.08), matEmerald);
    pttLed.position.set(-0.32 + i * 0.24, -0.05, 0.06);
    radio.group.add(htBody, htAnt, pttLed);
  }
  // Mobile RIG unit + Roof Whip Antenna
  const rigBox = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.24), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.7 }));
  rigBox.position.set(0.34, -0.17, 0.02);
  const whipAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 1.05, 10), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 }));
  whipAnt.position.set(0.55, 1.38, -1.35);

  radio.group.add(desk, deskLegL, deskLegR, rigBox, whipAnt);
  tagInteractive(radio.group, 'sys-radio-igcs', 'comp-radio-transceiver', radio.subsystemLayer);
  subComponents.push(radio);
  root.add(radio.group);

  // RC-02: IGCS Base Station Transceiver & PABX Rack
  const igcs = makeSubGroup('sys-radio-igcs', 'comp-igcs-pabx', [1.45, 0.95, 0.45]);
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.75, 0.56), matDark);
  for (let i = 0; i < 5; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.06), new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x1e3a8a : 0x334155, roughness: 0.35, metalness: 0.6 }));
    blade.position.set(0, 0.58 - i * 0.28, 0.28);
    igcs.group.add(blade);
  }
  const baseAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.72, 12), matEmerald);
  baseAnt.position.set(0, 1.24, 0);
  igcs.group.add(rack, baseAnt);
  tagInteractive(igcs.group, 'sys-radio-igcs', 'comp-igcs-pabx', igcs.subsystemLayer);
  subComponents.push(igcs);
  root.add(igcs.group);

  return { root, systemId: 'sys-radio-igcs', subComponents, outerShellMeshes, animatedParts: {} };
}

export function buildEquipmentBySystem(systemId: SystemId, maxAnisotropy: number): BuiltEquipmentUnit {
  switch (systemId) {
    case 'sys-xray':
      return buildXRaySystem(maxAnisotropy);
    case 'sys-wtmd':
      return buildWtmdSystem(maxAnisotropy);
    case 'sys-cctv-pids':
      return buildCctvPidsSystem(maxAnisotropy);
    case 'sys-access-fire':
      return buildAccessFireSystem();
    case 'sys-fids-pas':
      return buildFidsPasSystem(maxAnisotropy);
    case 'sys-radio-igcs':
      return buildRadioIgcsSystem();
  }
}

// =========================================================================
// TOC EVALUATION CONSOLE DESK (Zone 9)
// =========================================================================
export function buildTocEvaluationDesk(maxAnisotropy: number): THREE.Group {
  const group = new THREE.Group();
  const matDesk = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.38, metalness: 0.45 });
  const matTop = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.2 });

  const deskBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.86, 1.15), matDesk);
  deskBase.position.set(0, 0.43, 0);
  const deskSurface = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.08, 1.28), matTop);
  deskSurface.position.set(0, 0.89, 0);

  // Curved multi-monitor wall
  const wallTex = createTocMonitorTexture(maxAnisotropy);
  const monitorBack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.48, 0.14), matDesk);
  monitorBack.position.set(0, 1.82, -0.45);
  const monitorScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(3.06, 1.36),
    new THREE.MeshStandardMaterial({ map: wallTex, emissiveMap: wallTex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.2 })
  );
  monitorScreen.position.set(0, 1.82, -0.37);

  group.add(deskBase, deskSurface, monitorBack, monitorScreen);
  group.traverse((c) => {
    c.userData.isTocConsole = true;
    c.userData.zoneId = 'toc';
    if ((c as THREE.Mesh).isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
    }
  });
  return group;
}

// =========================================================================
// REUSABLE PHOTOREALISTIC CCTV CAMERAS (Distributed Terminal Surveillance Grid)
// =========================================================================

export interface SharedSonyCameraTextures {
  right: THREE.CanvasTexture;
  left: THREE.CanvasTexture;
  front: THREE.CanvasTexture;
}

/**
 * Reusable SONY IPELA HD IR Fixed Bullet Camera (rear wall flange at z = 0, facing +Z).
 */
export function createSonyFixedBulletCamera(
  maxAnisotropy: number,
  sharedTextures?: SharedSonyCameraTextures
): THREE.Group {
  const group = new THREE.Group();
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xeef1f4, roughness: 0.34, metalness: 0.14 });
  const matLightGrey = new THREE.MeshStandardMaterial({ color: 0xdce1e6, roughness: 0.36, metalness: 0.2 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.55 });
  const matCharcoal = new THREE.MeshStandardMaterial({ color: 0x202329, roughness: 0.42, metalness: 0.28 });
  const matStainless = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.22, metalness: 0.9 });
  const matLensGlass = new THREE.MeshPhysicalMaterial({
    color: 0x164e63,
    emissive: 0x0e7490,
    emissiveIntensity: 0.25,
    roughness: 0.05,
    metalness: 0.45,
    clearcoat: 1.0,
  });

  const sonyRightTex = sharedTextures?.right ?? createSonyIpelaSideTexture(maxAnisotropy, 'right');
  const sonyLeftTex = sharedTextures?.left ?? createSonyIpelaSideTexture(maxAnisotropy, 'left');
  const sonyFrontTex = sharedTextures?.front ?? createSonyIpelaFrontFaceTexture(maxAnisotropy);

  // Circular white wall-mount flange with 4 recessed mounting holes (z = 0.016)
  const mountFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.115, 0.032, 24), matWhite);
  mountFlange.rotation.x = Math.PI / 2;
  mountFlange.position.set(0, 0, 0.016);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.036, 12), matDark);
    hole.rotation.x = Math.PI / 2;
    hole.position.set(Math.cos(a) * 0.082, Math.sin(a) * 0.082, 0.017);
    group.add(hole);
  }

  // 3-axis articulated swivel neck with stainless locking hex screws
  const neckRear = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.052, 0.095, 18), matWhite);
  neckRear.rotation.x = Math.PI / 2;
  neckRear.position.set(0, 0, 0.076);
  const neckJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.044, 0.07, 18), matLightGrey);
  neckJoint.rotation.x = Math.PI / 2;
  neckJoint.position.set(0, 0, 0.148);
  [-0.045, 0.045].forEach((nx) => {
    const lockBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.014, 6), matStainless);
    lockBolt.rotation.z = Math.PI / 2;
    lockBolt.position.set(nx, -0.004, 0.145);
    group.add(lockBolt);
  });

  // Tapered cylindrical body + SONY / IPELA / HD FOR L20 side badges
  const bodyCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.076, 0.21, 24), matLightGrey);
  bodyCyl.rotation.x = Math.PI / 2;
  bodyCyl.position.set(0, 0, 0.275);

  const rightSideBadge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.185, 0.068),
    new THREE.MeshStandardMaterial({ map: sonyRightTex, roughness: 0.36, metalness: 0.12 })
  );
  rightSideBadge.rotation.y = Math.PI / 2;
  rightSideBadge.position.set(0.075, -0.022, 0.272);

  const leftSideBadge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.185, 0.068),
    new THREE.MeshStandardMaterial({ map: sonyLeftTex, roughness: 0.36, metalness: 0.12 })
  );
  leftSideBadge.rotation.y = -Math.PI / 2;
  leftSideBadge.position.set(-0.075, -0.022, 0.272);

  // Matte-black forward nose + wrap-around white sunshield hood with black underside + top knurled thumbscrew
  const blackNose = new THREE.Mesh(new THREE.CylinderGeometry(0.069, 0.07, 0.072, 24), matCharcoal);
  blackNose.rotation.x = Math.PI / 2;
  blackNose.position.set(0, 0, 0.405);

  const hoodOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.084, 0.086, 0.275, 24, 1, true, Math.PI * 0.44, Math.PI * 1.12),
    new THREE.MeshStandardMaterial({ color: 0xf1f3f5, roughness: 0.32, metalness: 0.14, side: THREE.DoubleSide })
  );
  hoodOuter.rotation.x = Math.PI / 2;
  hoodOuter.position.set(0, 0.007, 0.325);

  const hoodInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.081, 0.083, 0.272, 24, 1, true, Math.PI * 0.44, Math.PI * 1.12),
    new THREE.MeshStandardMaterial({ color: 0x16191f, roughness: 0.72, side: THREE.BackSide })
  );
  hoodInner.rotation.x = Math.PI / 2;
  hoodInner.position.set(0, 0.007, 0.325);

  const thumbScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.018, 16), matStainless);
  thumbScrew.position.set(0, 0.096, 0.272);

  // Front Optical Faceplate (28 IR LEDs + square lens mask + multi-coated glass)
  const frontFaceDisk = new THREE.Mesh(
    new THREE.CircleGeometry(0.068, 28),
    new THREE.MeshStandardMaterial({ map: sonyFrontTex, roughness: 0.2, metalness: 0.25 })
  );
  frontFaceDisk.position.set(0, 0, 0.442);

  const squareLensFrame = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.072, 0.01), matCharcoal);
  squareLensFrame.position.set(0, 0, 0.441);
  const fixedLensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.028, 20), matLensGlass);
  fixedLensGlass.position.set(0, 0, 0.447);

  group.add(
    mountFlange,
    neckRear,
    neckJoint,
    bodyCyl,
    rightSideBadge,
    leftSideBadge,
    blackNose,
    hoodOuter,
    hoodInner,
    thumbScrew,
    frontFaceDisk,
    squareLensFrame,
    fixedLensGlass
  );
  return group;
}

/**
 * Reusable HIKVISION Vandal-Resistant Fisheye Dome Camera (top mount plane at y = 0, dome hangs down to -Y).
 * Matches fisheye_front, fisheye_side, and fisheye_back reference photos.
 */
export function createHikvisionFisheyeCamera(
  maxAnisotropy: number,
  innerTiltX = 0.55,
  sharedBandTex?: THREE.CanvasTexture
): THREE.Group {
  const group = new THREE.Group();
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xf0f2f5, roughness: 0.34, metalness: 0.14 });
  const matDarkGimbal = new THREE.MeshStandardMaterial({ color: 0x22252b, roughness: 0.44, metalness: 0.28 });
  const matDarkRecess = new THREE.MeshStandardMaterial({ color: 0x11151b, roughness: 0.5, metalness: 0.4 });
  const matGlassDome = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.04,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const matFisheyeLens = new THREE.MeshPhysicalMaterial({
    color: 0x134e4a,
    emissive: 0x0e7490,
    emissiveIntensity: 0.22,
    roughness: 0.05,
    metalness: 0.5,
    clearcoat: 1.0,
  });

  const bandTex = sharedBandTex ?? createHikvisionFisheyeBandTexture(maxAnisotropy);
  const matBand = new THREE.MeshStandardMaterial({ map: bandTex, roughness: 0.34, metalness: 0.14 });

  // Upper flat ceiling cap disc
  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.142, 0.012, 32), matWhite);
  topCap.position.y = -0.006;

  // Cylindrical white housing band wrapped with HIKVISION logo (+Z), side screw slots (±X), rear conduit & CE label (-Z)
  const housingWall = new THREE.Mesh(new THREE.CylinderGeometry(0.142, 0.144, 0.088, 32, 1, true), matBand);
  housingWall.position.y = -0.05;
  housingWall.rotation.y = Math.PI; // Maps u=0.5 (HIKVISION) cleanly to +Z front

  // Tapered lower white vandal-resistant skirt bevel + 3 recessed screw pockets (fisheye_front & fisheye_side)
  const lowerBevel = new THREE.Mesh(new THREE.CylinderGeometry(0.144, 0.122, 0.026, 32), matWhite);
  lowerBevel.position.y = -0.106;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const pocket = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.018, 12), matDarkRecess);
    pocket.position.set(Math.cos(a) * 0.128, -0.106, Math.sin(a) * 0.128);
    pocket.rotation.x = Math.PI / 2;
    pocket.rotation.z = -a;
    group.add(pocket);
  }

  // Dark interior gimbal backing plate
  const innerBacking = new THREE.Mesh(new THREE.CircleGeometry(0.118, 28), matDarkRecess);
  innerBacking.rotation.x = Math.PI / 2;
  innerBacking.position.y = -0.116;

  // Internal matte charcoal-black spherical optical gimbal + wide-angle fisheye lens visible through clear bubble
  const gimbal = new THREE.Group();
  gimbal.position.set(0, -0.116, 0);
  gimbal.rotation.x = innerTiltX;

  const gimbalCore = new THREE.Mesh(new THREE.SphereGeometry(0.088, 22, 16), matDarkGimbal);
  const lensShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.036, 22), matDarkRecess);
  lensShroud.rotation.x = Math.PI / 2;
  lensShroud.position.set(0, 0, 0.074);
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.044, 0.004, 10, 22), matDarkGimbal);
  lensRing.position.set(0, 0, 0.093);
  const fisheyeGlass = new THREE.Mesh(new THREE.SphereGeometry(0.034, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), matFisheyeLens);
  fisheyeGlass.rotation.x = Math.PI / 2;
  fisheyeGlass.position.set(0, 0, 0.082);
  gimbal.add(gimbalCore, lensShroud, lensRing, fisheyeGlass);

  // Crystal-clear hemispherical polycarbonate vandal-proof bubble dome
  const clearDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.116, 28, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    matGlassDome
  );
  clearDome.position.y = -0.114;

  group.add(topCap, housingWall, lowerBevel, innerBacking, gimbal, clearDome);
  return group;
}

// =========================================================================
// PUBLIC ADDRESS SYSTEM (PAS / AAS) 3D SPEAKER MODELS (100V LINE)
// =========================================================================

export interface PasSpeakerHandle {
  group: THREE.Group;
  waveRing: THREE.Mesh;
  statusLedMat: THREE.MeshStandardMaterial;
  direction: 'down' | 'forward';
  phaseOffset: number;
  wattage: number;
  speakerType: 'ceiling' | 'column' | 'horn';
}

/**
 * Flush/Pendant 100V Airport Ceiling Speaker (6W tap)
 * Origin at top mount y = 0; acoustic grille projects downward (-Y).
 */
export function createCeilingSpeakerUnit(
  maxAnisotropy: number,
  sharedGrilleTex?: THREE.CanvasTexture
): PasSpeakerHandle {
  const group = new THREE.Group();
  const grilleTex = sharedGrilleTex ?? createCeilingSpeakerGrilleTexture(maxAnisotropy);

  const matBackCan = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.65 });
  const matBezel = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32, metalness: 0.08 });
  const matGrille = new THREE.MeshStandardMaterial({
    map: grilleTex,
    roughness: 0.42,
    metalness: 0.25,
  });
  const statusLedMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });

  // Fire-rated steel 100V transformer back-can
  const backCan = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.09, 24), matBackCan);
  backCan.position.y = -0.045;

  // Stepped matte-white circular outer trim bezel
  const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.205, 0.024, 32), matBezel);
  bezel.position.y = -0.102;

  // Perforated circular acoustic mesh facing downward (-Y)
  const grille = new THREE.Mesh(new THREE.CircleGeometry(0.182, 32), matGrille);
  grille.rotation.x = Math.PI / 2;
  grille.position.y = -0.115;

  // Slim circular acoustic status LED ring
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.0055, 8, 32), statusLedMat);
  ledRing.rotation.x = Math.PI / 2;
  ledRing.position.y = -0.114;

  // Live 3D acoustic wave visualization ring (hidden until zone is actively broadcasting)
  const waveMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const waveRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.013, 8, 32), waveMat);
  waveRing.rotation.x = Math.PI / 2;
  waveRing.position.y = -0.145;
  waveRing.visible = false;
  waveRing.userData.isWaveEffect = true;

  group.add(backCan, bezel, grille, ledRing, waveRing);
  return {
    group,
    waveRing,
    statusLedMat,
    direction: 'down',
    phaseOffset: Math.random() * Math.PI * 2,
    wattage: 6,
    speakerType: 'ceiling',
  };
}

/**
 * Brushed-Aluminum 100V Wall Column Line-Array Speaker (20W tap)
 * Origin at wall mount plate (z = 0); projects forward along +Z.
 */
export function createColumnSpeakerUnit(
  maxAnisotropy: number,
  sharedColumnTex?: THREE.CanvasTexture
): PasSpeakerHandle {
  const group = new THREE.Group();
  const columnTex = sharedColumnTex ?? createColumnSpeakerGrilleTexture(maxAnisotropy);

  const matBracket = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.72 });
  const matBody = new THREE.MeshStandardMaterial({ color: 0xdbe2ea, roughness: 0.3, metalness: 0.65 });
  const matCap = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.42, metalness: 0.35 });
  const matFace = new THREE.MeshStandardMaterial({
    map: columnTex,
    roughness: 0.44,
    metalness: 0.32,
  });
  const statusLedMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });

  // Wall swivel bracket plate & dual tilt knuckles
  const wallPlate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.018), matBracket);
  wallPlate.position.set(0, 0, 0.009);
  const armTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.032, 0.068), matBracket);
  armTop.position.set(0, 0.16, 0.04);
  const armBot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.032, 0.068), matBracket);
  armBot.position.set(0, -0.16, 0.04);

  // Extruded aluminum vertical line-array cabinet
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.74, 0.115), matBody);
  cabinet.position.set(0, 0, 0.115);

  // Top & bottom molded dark-slate acoustic end caps
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(0.166, 0.028, 0.122), matCap);
  capTop.position.set(0, 0.382, 0.115);
  const capBot = new THREE.Mesh(new THREE.BoxGeometry(0.166, 0.028, 0.122), matCap);
  capBot.position.set(0, -0.382, 0.115);

  // Front perforated acoustic grille face
  const grilleFace = new THREE.Mesh(new THREE.PlaneGeometry(0.144, 0.7), matFace);
  grilleFace.position.set(0, 0, 0.174);

  // Status LED strip at top bezel
  const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.013, 0.012), statusLedMat);
  ledStrip.position.set(0, 0.348, 0.174);

  // Forward-expanding acoustic wave ring
  const waveMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const waveRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.013, 8, 32), waveMat);
  waveRing.position.set(0, 0, 0.22);
  waveRing.visible = false;
  waveRing.userData.isWaveEffect = true;

  group.add(wallPlate, armTop, armBot, cabinet, capTop, capBot, grilleFace, ledStrip, waveRing);
  return {
    group,
    waveRing,
    statusLedMat,
    direction: 'forward',
    phaseOffset: Math.random() * Math.PI * 2,
    wattage: 20,
    speakerType: 'column',
  };
}

/**
 * Weatherproof IP65 Re-Entrant Exponential Horn Trumpet Speaker (30W tap)
 * Origin at mounting yoke pivot (z = 0); acoustic flare opens along +Z.
 */
export function createHornSpeakerUnit(): PasSpeakerHandle {
  const group = new THREE.Group();

  const matYoke = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.78 });
  const matHornShell = new THREE.MeshStandardMaterial({
    color: 0xe8edf3,
    roughness: 0.34,
    metalness: 0.22,
    side: THREE.DoubleSide,
  });
  const matDriver = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.42, metalness: 0.65 });
  const matDarkTrim = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.3 });
  const statusLedMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 0.35,
    roughness: 0.2,
  });

  // Heavy-duty U-yoke swivel bracket
  const yokeBase = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.022, 0.055), matYoke);
  yokeBase.position.set(0, -0.145, 0.08);
  const yokeArmL = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.16, 0.042), matYoke);
  yokeArmL.position.set(-0.086, -0.072, 0.095);
  const yokeArmR = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.16, 0.042), matYoke);
  yokeArmR.position.set(0.086, -0.072, 0.095);
  const boltL = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.025, 10), matDarkTrim);
  boltL.rotation.z = Math.PI / 2;
  boltL.position.set(-0.098, 0, 0.095);
  const boltR = boltL.clone();
  boltR.position.x = 0.098;

  // Rear 100V IP65 compression driver canister + cable gland
  const driverCan = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.066, 0.145, 20), matDriver);
  driverCan.rotation.x = Math.PI / 2;
  driverCan.position.set(0, 0, 0.09);
  const rearCap = new THREE.Mesh(new THREE.SphereGeometry(0.066, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), matDriver);
  rearCap.rotation.x = -Math.PI / 2;
  rearCap.position.set(0, 0, 0.018);
  const cableGland = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.036, 10), matDarkTrim);
  cableGland.position.set(0, -0.058, 0.042);

  // Exponential-flare acoustic horn bell via LatheGeometry (y becomes +Z after rotation)
  const lathePts = [
    new THREE.Vector2(0.052, 0.0),
    new THREE.Vector2(0.06, 0.045),
    new THREE.Vector2(0.082, 0.105),
    new THREE.Vector2(0.122, 0.165),
    new THREE.Vector2(0.174, 0.215),
    new THREE.Vector2(0.198, 0.238),
  ];
  const hornBell = new THREE.Mesh(new THREE.LatheGeometry(lathePts, 28), matHornShell);
  hornBell.rotation.x = Math.PI / 2;
  hornBell.position.set(0, 0, 0.155);

  // Dark impact-resistant acoustic lip rim
  const hornLip = new THREE.Mesh(new THREE.TorusGeometry(0.197, 0.008, 10, 28), matDarkTrim);
  hornLip.position.set(0, 0, 0.393);

  // Internal re-entrant acoustic phase plug cone
  const phasePlug = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.15, 16), matDarkTrim);
  phasePlug.rotation.x = Math.PI / 2;
  phasePlug.position.set(0, 0, 0.265);

  // Throat status LED collar
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(0.071, 0.0055, 8, 24), statusLedMat);
  ledRing.position.set(0, 0, 0.162);

  // Forward-expanding acoustic wave ring
  const waveMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const waveRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.014, 8, 32), waveMat);
  waveRing.position.set(0, 0, 0.42);
  waveRing.visible = false;
  waveRing.userData.isWaveEffect = true;

  group.add(
    yokeBase,
    yokeArmL,
    yokeArmR,
    boltL,
    boltR,
    driverCan,
    rearCap,
    cableGland,
    hornBell,
    hornLip,
    phasePlug,
    ledRing,
    waveRing
  );
  return {
    group,
    waveRing,
    statusLedMat,
    direction: 'forward',
    phaseOffset: Math.random() * Math.PI * 2,
    wattage: 30,
    speakerType: 'horn',
  };
}

// =========================================================================
// WALK-IN ELBAN ENTRANCE GATE (BANDARA INTERNASIONAL SULTAN HASANUDDIN UPG)
// =========================================================================

export interface WalkInEntranceGateHandle {
  group: THREE.Group;
  cyanNeonMat: THREE.MeshStandardMaterial;
  amberNeonMat: THREE.MeshStandardMaterial;
}

/**
 * Grand futuristic Airport Technology entrance portal inspired by Bandara Internasional Sultan Hasanuddin (UPG).
 * Origin at bottom-center (0, 0, 0), front facing +Z toward incoming students; clear inner walkthrough opening 7.2m wide x 4.2m high.
 */
export function buildWalkInEntranceGate(maxAnisotropy: number): WalkInEntranceGateHandle {
  const group = new THREE.Group();

  const matTitanium = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.3,
    metalness: 0.82,
  });
  const matDarkShell = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.42,
    metalness: 0.65,
  });
  const matSteelBright = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.24,
    metalness: 0.88,
  });
  const cyanNeonMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.55,
    roughness: 0.15,
    metalness: 0.1,
  });
  const amberNeonMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xf97316,
    emissiveIntensity: 1.4,
    roughness: 0.18,
    metalness: 0.1,
  });

  // 1. Sculpted Sweeping Outer Arch Shell (ExtrudeGeometry with beveled edges & clear center portal opening)
  const outerShape = new THREE.Shape();
  outerShape.moveTo(-5.55, 0);
  outerShape.lineTo(-5.25, 1.45);
  outerShape.quadraticCurveTo(-4.85, 3.85, -3.55, 5.15);
  outerShape.quadraticCurveTo(-2.95, 5.65, -2.1, 5.65);
  outerShape.lineTo(2.1, 5.65);
  outerShape.quadraticCurveTo(2.95, 5.65, 3.55, 5.15);
  outerShape.quadraticCurveTo(4.85, 3.85, 5.25, 1.45);
  outerShape.lineTo(5.55, 0);
  // Step inward along floor & trace inner walkthrough portal opening (clear span 7.3m x 4.2m)
  outerShape.lineTo(3.68, 0);
  outerShape.lineTo(3.55, 1.7);
  outerShape.quadraticCurveTo(3.38, 3.55, 2.52, 4.18);
  outerShape.lineTo(-2.52, 4.18);
  outerShape.quadraticCurveTo(-3.38, 3.55, -3.55, 1.7);
  outerShape.lineTo(-3.68, 0);
  outerShape.closePath();

  const archDepth = 1.24;
  const archGeo = new THREE.ExtrudeGeometry(outerShape, {
    depth: archDepth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.07,
    bevelSegments: 4,
    curveSegments: 24,
  });
  archGeo.translate(0, 0, -archDepth / 2);
  const archShell = new THREE.Mesh(archGeo, matTitanium);
  archShell.castShadow = true;
  archShell.receiveShadow = true;
  group.add(archShell);

  // 2. Exposed High-Tech PCB Circuit Cavity Ribbons (inset slightly on front & back arch faces)
  const circuitTex = createGateCircuitTexture(maxAnisotropy);
  const matCircuit = new THREE.MeshStandardMaterial({
    map: circuitTex,
    emissiveMap: circuitTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.62,
    roughness: 0.35,
    metalness: 0.45,
  });

  const circuitShape = new THREE.Shape();
  circuitShape.moveTo(-5.15, 0.12);
  circuitShape.lineTo(-4.88, 1.48);
  circuitShape.quadraticCurveTo(-4.52, 3.62, -3.32, 4.86);
  circuitShape.quadraticCurveTo(-2.82, 5.28, -2.05, 5.28);
  circuitShape.lineTo(2.05, 5.28);
  circuitShape.quadraticCurveTo(2.82, 5.28, 3.32, 4.86);
  circuitShape.quadraticCurveTo(4.52, 3.62, 4.88, 1.48);
  circuitShape.lineTo(5.15, 0.12);
  circuitShape.lineTo(3.92, 0.12);
  circuitShape.lineTo(3.78, 1.68);
  circuitShape.quadraticCurveTo(3.6, 3.42, 2.66, 4.32);
  circuitShape.lineTo(-2.66, 4.32);
  circuitShape.quadraticCurveTo(-3.6, 3.42, -3.78, 1.68);
  circuitShape.lineTo(-3.92, 0.12);
  circuitShape.closePath();

  const circuitGeo = new THREE.ExtrudeGeometry(circuitShape, {
    depth: 0.06,
    bevelEnabled: false,
    curveSegments: 20,
  });
  const circuitFront = new THREE.Mesh(circuitGeo, matCircuit);
  circuitFront.position.z = archDepth / 2 + 0.035;
  const circuitBack = new THREE.Mesh(circuitGeo, matCircuit);
  circuitBack.position.z = -archDepth / 2 - 0.095;
  group.add(circuitFront, circuitBack);

  // 3. Sturdy Grounded Architectural Floor Plinths (Left & Right)
  [-4.62, 4.62].forEach((px) => {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.24, 1.62), matDarkShell);
    plinth.position.set(px, 0.12, 0);
    const plinthTrim = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.04, 1.66), cyanNeonMat);
    plinthTrim.position.set(px, 0.25, 0);
    group.add(plinth, plinthTrim);
  });

  // 4. Dual Concentric Luminous LED Contour Tubes (Outer Cyan + Inner Warm Amber on Front & Back)
  const buildArchContourPoints = (zPos: number, mode: 'outer' | 'inner'): THREE.Vector3[] => {
    if (mode === 'outer') {
      return [
        new THREE.Vector3(-5.32, 0.22, zPos),
        new THREE.Vector3(-5.05, 1.55, zPos),
        new THREE.Vector3(-4.52, 3.25, zPos),
        new THREE.Vector3(-3.62, 4.72, zPos),
        new THREE.Vector3(-2.55, 5.44, zPos),
        new THREE.Vector3(0, 5.5, zPos),
        new THREE.Vector3(2.55, 5.44, zPos),
        new THREE.Vector3(3.62, 4.72, zPos),
        new THREE.Vector3(4.52, 3.25, zPos),
        new THREE.Vector3(5.05, 1.55, zPos),
        new THREE.Vector3(5.32, 0.22, zPos),
      ];
    }
    return [
      new THREE.Vector3(-3.76, 0.22, zPos),
      new THREE.Vector3(-3.62, 1.72, zPos),
      new THREE.Vector3(-3.32, 3.18, zPos),
      new THREE.Vector3(-2.62, 4.18, zPos),
      new THREE.Vector3(0, 4.24, zPos),
      new THREE.Vector3(2.62, 4.18, zPos),
      new THREE.Vector3(3.32, 3.18, zPos),
      new THREE.Vector3(3.62, 1.72, zPos),
      new THREE.Vector3(3.76, 0.22, zPos),
    ];
  };

  [archDepth / 2 + 0.11, -(archDepth / 2 + 0.11)].forEach((zFace) => {
    const outerCurve = new THREE.CatmullRomCurve3(buildArchContourPoints(zFace, 'outer'));
    const outerTube = new THREE.Mesh(new THREE.TubeGeometry(outerCurve, 48, 0.052, 10, false), cyanNeonMat);

    const innerCurve = new THREE.CatmullRomCurve3(buildArchContourPoints(zFace, 'inner'));
    const innerTube = new THREE.Mesh(new THREE.TubeGeometry(innerCurve, 44, 0.044, 10, false), amberNeonMat);

    group.add(outerTube, innerTube);
  });

  // 5. Twin Backlit Toraja / South Sulawesi Cultural Carving Panels (Left & Right Pillars, Front & Back)
  const torajaTex = createTorajaCarvingTexture(maxAnisotropy);
  const matToraja = new THREE.MeshStandardMaterial({
    map: torajaTex,
    emissiveMap: torajaTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.78,
    roughness: 0.35,
  });

  [-1, 1].forEach((side) => {
    const panelHolder = new THREE.Group();
    panelHolder.position.set(side * 4.24, 2.08, 0);
    panelHolder.rotation.z = side * 0.14;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.88, archDepth + 0.24), matDarkShell);
    const faceFront = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.78), matToraja);
    faceFront.position.z = (archDepth + 0.24) / 2 + 0.008;
    const faceBack = faceFront.clone();
    faceBack.rotation.y = Math.PI;
    faceBack.position.z = -((archDepth + 0.24) / 2 + 0.008);

    // Subtle amber LED side accents flanking each Toraja panel
    const ledL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.84, archDepth + 0.28), amberNeonMat);
    ledL.position.x = -0.46;
    const ledR = ledL.clone();
    ledR.position.x = 0.46;

    panelHolder.add(frame, faceFront, faceBack, ledL, ledR);
    group.add(panelHolder);
  });

  // 6. Central Marquee Header Fascia: ELEKTRONIKA BANDARA (ELBAN) / AIRPORT TECHNOLOGY
  const marqueeTex = createGateMarqueeTexture(maxAnisotropy);
  const matMarquee = new THREE.MeshStandardMaterial({
    map: marqueeTex,
    emissiveMap: marqueeTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.82,
    roughness: 0.24,
  });
  const marqueeBox = new THREE.Mesh(new THREE.BoxGeometry(6.15, 1.24, archDepth + 0.34), matDarkShell);
  marqueeBox.position.set(0, 4.86, 0);
  const marqueeFront = new THREE.Mesh(new THREE.PlaneGeometry(5.96, 1.14), matMarquee);
  marqueeFront.position.set(0, 4.86, (archDepth + 0.34) / 2 + 0.008);
  const marqueeBack = marqueeFront.clone();
  marqueeBack.rotation.y = Math.PI;
  marqueeBack.position.z = -((archDepth + 0.34) / 2 + 0.008);
  group.add(marqueeBox, marqueeFront, marqueeBack);

  // 7. Upper Crown Illuminated Signage Cabinet: BANDARA INTERNASIONAL SULTAN HASANUDDIN MAKASSAR
  const crownTex = createGateCrownSignTexture(maxAnisotropy);
  const matCrown = new THREE.MeshStandardMaterial({
    map: crownTex,
    emissiveMap: crownTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.78,
    side: THREE.FrontSide,
    roughness: 0.24,
  });

  const crownZ = 0.34;
  const crownY = 6.46;
  const crownW = 4.68;
  const crownH = 1.56;
  const crownD = 0.28;

  // Short structural stanchions strictly between marquee top (y = 5.48) and crown cabinet bottom (y = 5.68)
  [-1.65, 1.65].forEach((sx) => {
    const stanchion = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.34, 14), matTitanium);
    stanchion.position.set(sx, 5.58, crownZ);
    group.add(stanchion);
  });

  const crownCabinet = new THREE.Mesh(new THREE.BoxGeometry(crownW, crownH, crownD), matDarkShell);
  crownCabinet.position.set(0, crownY, crownZ);
  crownCabinet.castShadow = true;

  // Top & bottom warm amber architectural LED trim rails framing the crown cabinet
  const crownTopTrim = new THREE.Mesh(new THREE.BoxGeometry(crownW + 0.08, 0.055, crownD + 0.06), amberNeonMat);
  crownTopTrim.position.set(0, crownY + crownH / 2 + 0.02, crownZ);
  const crownBotTrim = new THREE.Mesh(new THREE.BoxGeometry(crownW + 0.08, 0.055, crownD + 0.06), cyanNeonMat);
  crownBotTrim.position.set(0, crownY - crownH / 2 - 0.02, crownZ);

  const crownFront = new THREE.Mesh(new THREE.PlaneGeometry(crownW - 0.14, crownH - 0.1), matCrown);
  crownFront.position.set(0, crownY, crownZ + crownD / 2 + 0.008);
  const crownBack = new THREE.Mesh(new THREE.PlaneGeometry(crownW - 0.14, crownH - 0.1), matCrown);
  crownBack.rotation.y = Math.PI;
  crownBack.position.set(0, crownY, crownZ - crownD / 2 - 0.008);

  group.add(crownCabinet, crownTopTrim, crownBotTrim, crownFront, crownBack);

  // 8. Twin Circular Illuminated Shoulder Emblems (Left: ATNOS, Right: AIRPORT TECHNOLOGY)
  const buildBadgeDrum = (variant: 'atnos' | 'airport_tech', xPos: number) => {
    const badgeGroup = new THREE.Group();
    badgeGroup.position.set(xPos, 6.32, crownZ);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.24, 32), matDarkShell);
    drum.rotation.x = Math.PI / 2;

    const rimFront = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.028, 10, 32), cyanNeonMat);
    rimFront.position.z = 0.12;
    const rimBack = rimFront.clone();
    rimBack.position.z = -0.12;

    const tex = createGateEmblemTexture(variant, maxAnisotropy);
    const matFace = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: 0xffffff,
      emissiveIntensity: 0.72,
      transparent: true,
      roughness: 0.24,
    });
    const faceFront = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), matFace);
    faceFront.position.z = 0.125;
    const faceBack = faceFront.clone();
    faceBack.rotation.y = Math.PI;
    faceBack.position.z = -0.125;

    badgeGroup.add(drum, rimFront, rimBack, faceFront, faceBack);
    return badgeGroup;
  };
  group.add(buildBadgeDrum('atnos', -3.08), buildBadgeDrum('airport_tech', 3.08));

  // 9. Interactive Runway Walkway Strip (STOP + Footprints + START PRACTICUM) passing right through the Gate
  const runwayTex = createRunwayPracticumTexture(maxAnisotropy);
  const runwayMat = new THREE.MeshStandardMaterial({
    map: runwayTex,
    emissiveMap: runwayTex,
    emissive: 0xffffff,
    emissiveIntensity: 0.42,
    roughness: 0.36,
    metalness: 0.15,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const runwayStrip = new THREE.Mesh(new THREE.PlaneGeometry(3.35, 8.6), runwayMat);
  runwayStrip.rotation.x = -Math.PI / 2;
  runwayStrip.position.set(0, 0.022, 2.15);
  runwayStrip.receiveShadow = true;
  group.add(runwayStrip);

  // Sleek stainless-steel safety stanchion bollards flanking the runway strip inside the portal
  [-1.95, 1.95].forEach((bx) => {
    [-0.9, 0.9].forEach((bz) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.04, 16), matSteelBright);
      base.position.set(bx, 0.02, bz);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.92, 14), matSteelBright);
      post.position.set(bx, 0.48, bz);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), cyanNeonMat);
      cap.position.set(bx, 0.95, bz);
      group.add(base, post, cap);
    });
    // Horizontal stainless barrier rail between front and back bollards
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.8, 10), matSteelBright);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(bx, 0.78, 0);
    group.add(rail);
  });

  return { group, cyanNeonMat, amberNeonMat };
}


