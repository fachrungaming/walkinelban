import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Compass,
  Download,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import {
  COMPONENT_MAP,
  ELECTRONIC_COMPONENTS,
  EQUIPMENT_SYSTEMS,
  getComponentsBySystem,
} from '../data/curriculum';
import { pickRandomQuizSet } from '../data/quizBank';
import {
  AssessmentAnswerRecord,
  AssessmentAttempt,
  ElectronicComponent,
  Language,
  QuizQuestion,
} from '../types/elban';

interface TOCEvaluationModalProps {
  lang: Language;
  loggedComponentIds: string[];
  totalXp: number;
  onJumpToComponentIn3D: (component: ElectronicComponent) => void;
  onAssessmentComplete: (attempt: AssessmentAttempt) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ELBAN-${suffix}`;
}

export const TOCEvaluationModal: React.FC<TOCEvaluationModalProps> = ({
  lang,
  loggedComponentIds,
  totalXp,
  onJumpToComponentIn3D,
  onAssessmentComplete,
  onResetProgress,
  onClose,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [evalMode, setEvalMode] = useState<'practice' | 'exam'>('practice');
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => pickRandomQuizSet(5));
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [timeLeftSec, setTimeLeftSec] = useState(180);
  const [attemptResult, setAttemptResult] = useState<AssessmentAttempt | null>(null);

  const loggedSet = useMemo(() => new Set(loggedComponentIds), [loggedComponentIds]);
  const loggedComponents = useMemo(
    () => ELECTRONIC_COMPONENTS.filter((c) => loggedSet.has(c.id)),
    [loggedSet]
  );
  const unvisitedComponents = useMemo(
    () => ELECTRONIC_COMPONENTS.filter((c) => !loggedSet.has(c.id)),
    [loggedSet]
  );

  // Countdown timer for Exam Mode in Step 2
  useEffect(() => {
    if (step !== 2 || evalMode !== 'exam') return;
    if (timeLeftSec <= 0) {
      handleSubmitAssessment();
      return;
    }
    const id = window.setInterval(() => {
      setTimeLeftSec((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, evalMode, timeLeftSec]);

  const startQuiz = () => {
    setQuestions(pickRandomQuizSet(5));
    setSelectedAnswers({});
    setTimeLeftSec(180);
    setStep(2);
  };

  const handleSubmitAssessment = () => {
    const records: AssessmentAnswerRecord[] = questions.map((q) => {
      const picked = selectedAnswers[q.id] ?? -1;
      return {
        questionId: q.id,
        relatedComponentId: q.relatedComponentId,
        selectedOption: picked,
        isCorrect: picked === q.correctIndex,
      };
    });
    const correctCount = records.filter((r) => r.isCorrect).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const earnedXp = correctCount * 30;
    const attempt: AssessmentAttempt = {
      sessionCode: generateSessionCode(),
      mode: evalMode,
      answers: records,
      score,
      earnedXp,
      completedAt: new Date().toISOString(),
    };
    setAttemptResult(attempt);
    onAssessmentComplete(attempt);
    setStep(3);
  };

  const handleDownloadReport = () => {
    if (!attemptResult) return;
    const predicate =
      attemptResult.score >= 80
        ? lang === 'id' ? 'Sangat Kompeten' : 'Highly Competent'
        : attemptResult.score >= 60
          ? lang === 'id' ? 'Kompeten' : 'Competent'
          : lang === 'id' ? 'Perlu Pendalaman' : 'Needs Review';

    const reportHtml = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>Walk-In ElBan — Laporan Kompetensi ${attemptResult.sessionCode}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; margin: 40px; max-width: 820px; }
  h1 { margin: 0 0 6px; font-size: 24px; }
  .meta { color: #475569; font-size: 13px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
  .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; }
  .label { font-size: 11px; text-transform: uppercase; color: #64748b; }
  .val { font-size: 22px; font-weight: 700; margin-top: 4px; font-family: monospace; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
  th, td { text-align: left; border-bottom: 1px solid #e2e8f0; padding: 8px; }
</style>
</head>
<body>
  <h1>Walk-In ElBan · Laporan Praktikum & Uji Kompetensi TOC</h1>
  <div class="meta">Kode Sesi: <strong>${attemptResult.sessionCode}</strong> · Tanggal: ${new Date(attemptResult.completedAt).toLocaleString()}</div>
  <div class="grid">
    <div class="card"><div class="label">Skor Evaluasi</div><div class="val">${attemptResult.score} / 100</div></div>
    <div class="card"><div class="label">Predikat</div><div class="val" style="font-family:sans-serif;font-size:18px;">${predicate}</div></div>
    <div class="card"><div class="label">Komponen Dikuasai</div><div class="val">${loggedComponentIds.length} / ${ELECTRONIC_COMPONENTS.length}</div></div>
  </div>
  <h3>Ringkasan Observasi Logbook (${loggedComponents.length} Komponen)</h3>
  <table>
    <thead><tr><th>Kode</th><th>Komponen</th><th>Subsistem</th></tr></thead>
    <tbody>
      ${loggedComponents
        .map((c) => `<tr><td>${c.code}</td><td>${lang === 'id' ? c.name_id : c.name_en}</td><td>${c.subsystemLayer}</td></tr>`)
        .join('')}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan-ElBan-${attemptResult.sessionCode}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formattedTimer = `${String(Math.floor(timeLeftSec / 60)).padStart(2, '0')}:${String(
    timeLeftSec % 60
  ).padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Ruang TOC Evaluation"
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B192C] text-white flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="font-mono-tech text-xs text-sky-400">
              {step === 1
                ? 'TOC / Ringkasan Observasi'
                : step === 2
                  ? 'TOC / Evaluasi Singkat'
                  : 'TOC / Laporan Kompetensi'}
            </div>
            <h2 className="text-lg font-bold mt-0.5">
              {step === 1
                ? lang === 'id' ? 'Rekap Logbook Praktikum ElBan' : 'ElBan Practical Logbook Recap'
                : step === 2
                  ? lang === 'id' ? 'Uji Kompetensi & Skenario Troubleshooting' : 'Competency & Troubleshooting Assessment'
                  : lang === 'id' ? 'Hasil Evaluasi & Bukti Praktikum' : 'Assessment Result & Practical Certificate'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Step progress indicator */}
            <div className="hidden sm:flex items-center gap-1.5 font-mono-tech text-xs">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${
                    step === s
                      ? 'bg-sky-500 text-white'
                      : step > s
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close TOC modal"
              className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto elban-scroll p-6 space-y-6">
          {/* ==================== STEP 1: LOGBOOK RECAP ==================== */}
          {step === 1 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-medium text-slate-500">
                    {lang === 'id' ? 'Komponen Tercatat' : 'Logged Components'}
                  </div>
                  <div className="font-mono-tech text-2xl font-bold text-slate-900 mt-1">
                    {loggedComponentIds.length} / {ELECTRONIC_COMPONENTS.length}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-medium text-slate-500">
                    {lang === 'id' ? 'Ketuntasan Kurikulum' : 'Curriculum Mastery'}
                  </div>
                  <div className="font-mono-tech text-2xl font-bold text-sky-700 mt-1">
                    {Math.round((loggedComponentIds.length / ELECTRONIC_COMPONENTS.length) * 100)}%
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-medium text-slate-500">
                    {lang === 'id' ? 'Total Poin XP' : 'Total XP Earned'}
                  </div>
                  <div className="font-mono-tech text-2xl font-bold text-slate-900 mt-1">
                    {totalXp} XP
                  </div>
                </div>
              </div>

              {/* 6 Systems Progress Breakdown */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  {lang === 'id' ? 'Ketuntasan per 6 Sistem Utama ElBan' : 'Completion by 6 Core ElBan Systems'}
                </h3>
                <div className="space-y-2.5">
                  {EQUIPMENT_SYSTEMS.map((sys) => {
                    const comps = getComponentsBySystem(sys.id);
                    const done = comps.filter((c) => loggedSet.has(c.id)).length;
                    const pct = Math.round((done / comps.length) * 100);
                    return (
                      <div key={sys.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            {lang === 'id' ? sys.name_id : sys.name_en}
                          </span>
                          <span className="font-mono-tech text-slate-600">
                            {done}/{comps.length} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: sys.accentColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Logged Components List */}
              {loggedComponents.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {lang === 'id' ? 'Sudah Dicatat di Logbook' : 'Recorded in Logbook'} ({loggedComponents.length})
                  </h3>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {loggedComponents.map((comp) => (
                      <div key={comp.id} className="px-4 py-2.5 bg-white flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            <span className="font-mono-tech text-emerald-700 mr-2">{comp.code}</span>
                            {lang === 'id' ? comp.name_id : comp.name_en}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {lang === 'id' ? comp.summary_id : comp.summary_en}
                          </div>
                        </div>
                        <span className="font-mono-tech text-xs font-semibold text-emerald-700 shrink-0">
                          +{comp.xpReward} XP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unvisited Components Quick Jump */}
              {unvisitedComponents.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {lang === 'id' ? 'Belum Dikunjungi (Tautan Cepat 3D)' : 'Not Yet Visited (Quick 3D Jump)'} ({unvisitedComponents.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {unvisitedComponents.slice(0, 8).map((comp) => (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => onJumpToComponentIn3D(comp)}
                        className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-mono-tech text-[11px] text-slate-500">{comp.code}</div>
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {lang === 'id' ? comp.name_id : comp.name_en}
                          </div>
                        </div>
                        <Compass className="w-4 h-4 text-sky-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ==================== STEP 2: 5-QUESTION QUIZ ==================== */}
          {step === 2 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1 p-1 bg-white rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEvalMode('practice')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                      evalMode === 'practice' ? 'bg-[#0B192C] text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'id' ? 'Latihan Mandiri (Pembahasan)' : 'Practice Mode (Feedback)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEvalMode('exam');
                      setTimeLeftSec(180);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                      evalMode === 'exam' ? 'bg-sky-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang === 'id' ? 'Ujian Praktikum (Berbatas Waktu)' : 'Timed Exam Mode'}
                  </button>
                </div>

                {evalMode === 'exam' && (
                  <div className="font-mono-tech text-sm font-bold text-red-600 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{formattedTimer}</span>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                {questions.map((q, idx) => {
                  const chosen = selectedAnswers[q.id];
                  const options = lang === 'id' ? q.options_id : q.options_en;
                  const relatedComp = COMPONENT_MAP[q.relatedComponentId];

                  return (
                    <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-mono-tech font-semibold text-sky-700">
                          {lang === 'id' ? `SOAL 0${idx + 1}` : `QUESTION 0${idx + 1}`}
                        </span>
                        <span>{relatedComp?.code}</span>
                      </div>

                      <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                        {lang === 'id' ? q.question_id : q.question_en}
                      </p>

                      <div className="space-y-2">
                        {options.map((opt, optIdx) => {
                          const isSelected = chosen === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() =>
                                setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                              }
                              className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm transition-colors cursor-pointer flex items-center gap-2.5 ${
                                isSelected
                                  ? 'bg-sky-50 border-sky-600 text-sky-950 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span
                                className={`font-mono-tech text-xs w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'bg-sky-600 text-white border-sky-600'
                                    : 'border-slate-300 text-slate-500'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Instant explanation in Practice mode once answered */}
                      {evalMode === 'practice' && chosen !== undefined && (
                        <div
                          className={`p-3 rounded-lg text-xs leading-relaxed ${
                            chosen === q.correctIndex
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                              : 'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}
                        >
                          <span className="font-bold mr-1.5">
                            {chosen === q.correctIndex
                              ? lang === 'id' ? 'Tepat:' : 'Correct:'
                              : lang === 'id' ? 'Pembahasan:' : 'Explanation:'}
                          </span>
                          {lang === 'id' ? q.explanation_id : q.explanation_en}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ==================== STEP 3: COMPETENCY REPORT ==================== */}
          {step === 3 && attemptResult && (
            <>
              <div className="p-6 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-mono-tech text-xs text-sky-400">
                    {lang === 'id' ? 'KODE SESI PRAKTIKUM' : 'PRACTICAL SESSION CODE'} · {attemptResult.sessionCode}
                  </div>
                  <div className="text-2xl font-bold mt-1 flex items-center gap-2.5">
                    <Award className="w-6 h-6 text-amber-400" />
                    <span>
                      {attemptResult.score >= 80
                        ? lang === 'id' ? 'Sangat Kompeten' : 'Highly Competent'
                        : attemptResult.score >= 60
                          ? lang === 'id' ? 'Kompeten' : 'Competent'
                          : lang === 'id' ? 'Perlu Pendalaman' : 'Needs Review'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    {lang === 'id'
                      ? `Bonus evaluasi +${attemptResult.earnedXp} XP · Total XP sekarang ${totalXp} XP`
                      : `Assessment bonus +${attemptResult.earnedXp} XP · Current Total ${totalXp} XP`}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-xs text-slate-400">{lang === 'id' ? 'Skor Akhir' : 'Final Score'}</div>
                  <div className="font-mono-tech text-4xl font-bold text-sky-400">
                    {attemptResult.score}
                    <span className="text-lg text-slate-400">/100</span>
                  </div>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">{lang === 'id' ? 'Kode Sesi' : 'Session'}</div>
                  <div className="font-mono-tech text-sm font-bold text-slate-900 mt-0.5">
                    {attemptResult.sessionCode}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">{lang === 'id' ? 'Komponen Dikuasai' : 'Components'}</div>
                  <div className="font-mono-tech text-sm font-bold text-slate-900 mt-0.5">
                    {loggedComponentIds.length}/{ELECTRONIC_COMPONENTS.length}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">{lang === 'id' ? 'Jawaban Benar' : 'Correct'}</div>
                  <div className="font-mono-tech text-sm font-bold text-emerald-700 mt-0.5">
                    {attemptResult.answers.filter((a) => a.isCorrect).length}/{attemptResult.answers.length}
                  </div>
                </div>
              </div>

              {/* Itemized Review */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {lang === 'id' ? 'Rincian Pembahasan Jawaban' : 'Answer Breakdown & Explanations'}
                </h3>
                {questions.map((q, i) => {
                  const rec = attemptResult.answers[i];
                  const options = lang === 'id' ? q.options_id : q.options_en;
                  return (
                    <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-900">
                          {i + 1}. {lang === 'id' ? q.question_id : q.question_en}
                        </span>
                        {rec.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        )}
                      </div>
                      <div className="text-xs text-slate-600">
                        <span className="font-semibold text-emerald-700">
                          {lang === 'id' ? 'Kunci: ' : 'Key: '}
                          {options[q.correctIndex]}
                        </span>
                        <span className="text-slate-400"> · </span>
                        <span>{lang === 'id' ? q.explanation_id : q.explanation_en}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-sm font-semibold cursor-pointer"
              >
                {lang === 'id' ? 'Tutup' : 'Close'}
              </button>
              <button
                type="button"
                onClick={startQuiz}
                className="px-5 py-2.5 rounded-lg bg-[#0B192C] hover:bg-[#162f52] text-white text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4 text-sky-400" />
                <span>{lang === 'id' ? 'Lanjut ke Uji Pemahaman' : 'Proceed to Assessment'}</span>
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-sm font-semibold cursor-pointer"
              >
                {lang === 'id' ? 'Kembali' : 'Back'}
              </button>
              <button
                type="button"
                onClick={handleSubmitAssessment}
                disabled={Object.keys(selectedAnswers).length < questions.length}
                className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold cursor-pointer"
              >
                {lang === 'id'
                  ? `Kirim Jawaban & Hitung Nilai (${Object.keys(selectedAnswers).length}/${questions.length})`
                  : `Submit & Calculate Score (${Object.keys(selectedAnswers).length}/${questions.length})`}
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'id' ? 'Unduh Ringkasan' : 'Download Report'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetProgress();
                    onClose();
                  }}
                  className="px-3.5 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 text-slate-600 text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{lang === 'id' ? 'Reset Progres' : 'Reset'}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-[#0B192C] hover:bg-[#162f52] text-white text-sm font-semibold cursor-pointer"
              >
                {lang === 'id' ? 'Ulangi Eksplorasi' : 'Continue Exploring'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
