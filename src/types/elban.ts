export type Language = 'id' | 'en';

export type TimeOfDayMode = 'day' | 'night';

export type LightCircuitId =
  | 'lobby_concourse'
  | 'scp_baggage'
  | 'restricted_server'
  | 'toc'
  | 'exterior';

export type LightCircuitState = Record<LightCircuitId, boolean>;

export type SubsystemLayer =
  | 'Sensor & Input'
  | 'Pemroses & Kontrol'
  | 'Mekanik & Aktuator'
  | 'Transmisi & Audio/Visual'
  | 'Proteksi & Catu Daya';

export type SimulationType =
  | 'xray_dual_energy'
  | 'eddy_current_zone'
  | 'pids_cctv_intrusion'
  | 'access_fire_trigger'
  | 'fids_sync'
  | 'bids_sync'
  | 'pas_broadcast'
  | 'rf_ptt_routing';

export type InspectViewMode = 'normal' | 'xray' | 'exploded';

export type SystemId =
  | 'sys-xray'
  | 'sys-wtmd'
  | 'sys-cctv-pids'
  | 'sys-access-fire'
  | 'sys-fids-pas'
  | 'sys-bids'
  | 'sys-pas'
  | 'sys-radio-igcs';

export type ZoneId =
  | 'lobby'
  | 'scp'
  | 'perimeter'
  | 'restricted'
  | 'concourse'
  | 'baggage'
  | 'server'
  | 'comms'
  | 'toc';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AirportZone {
  id: ZoneId;
  order: number;
  name_id: string;
  name_en: string;
  shortName_id: string;
  shortName_en: string;
  summary_id: string;
  summary_en: string;
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  anchorPosition: Vec3;
  toastMessage_id: string;
  toastMessage_en: string;
  systemIds: SystemId[];
  isEvaluationZone?: boolean;
}

export interface EquipmentSystem {
  id: SystemId;
  code: string;
  shortLabel: string;
  name_id: string;
  name_en: string;
  zoneId: ZoneId;
  secondaryZoneIds?: ZoneId[];
  accentColor: string;
  workingPrinciple_id: string;
  workingPrinciple_en: string;
  simulationType: SimulationType;
  worldPosition: Vec3;
  inspectFocusPosition: Vec3;
  inspectFocusTarget: Vec3;
}

export interface ElectronicComponent {
  id: string;
  code: string;
  systemId: SystemId;
  zoneId: ZoneId;
  name_id: string;
  name_en: string;
  subsystemLayer: SubsystemLayer;
  subElements_id: string[];
  subElements_en: string[];
  summary_id: string;
  summary_en: string;
  description_id: string;
  description_en: string;
  technicalSpecs: {
    voltageOrPower: string;
    signalType: string;
    criticalSafetyNote_id: string | null;
    criticalSafetyNote_en: string | null;
  };
  signalFlowChain: {
    inputFrom_id: string;
    inputFrom_en: string;
    process_id: string;
    process_en: string;
    outputTo_id: string;
    outputTo_en: string;
  };
  meshNodeName: string;
  explodedOffset: Vec3;
  xpReward: number;
  priorityTag?: 'Kritis/Tegangan Tinggi' | 'Wajib Praktikum';
}

export interface LearningProgressState {
  loggedComponentIds: string[];
  completedSimulations: SystemId[];
  totalXp: number;
  lastVisitedZoneId: ZoneId;
  lastAssessment?: AssessmentAttempt;
}

export interface QuizQuestion {
  id: string;
  systemId: SystemId;
  relatedComponentId: string;
  question_id: string;
  question_en: string;
  options_id: string[];
  options_en: string[];
  correctIndex: number;
  explanation_id: string;
  explanation_en: string;
}

export interface AssessmentAnswerRecord {
  questionId: string;
  relatedComponentId: string;
  selectedOption: number;
  isCorrect: boolean;
}

export interface AssessmentAttempt {
  sessionCode: string;
  mode: 'practice' | 'exam';
  answers: AssessmentAnswerRecord[];
  score: number;
  earnedXp: number;
  completedAt: string;
}

export interface HoverTelemetryData {
  systemId: SystemId;
  componentId?: string;
  zoneId?: ZoneId;
  isTocConsole?: boolean;
  isServerRackTwin?: boolean;
  lightSwitchCircuitId?: LightCircuitId;
  screenX: number;
  screenY: number;
}
