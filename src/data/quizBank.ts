import { QuizQuestion } from '../types/elban';

export const QUIZ_BANK: QuizQuestion[] = [
  {
    id: 'q-xray-photocell',
    systemId: 'sys-xray',
    relatedComponentId: 'comp-xray-photocell',
    question_id:
      'Layar monitor X-Ray tidak mendeteksi keberadaan koper saat masuk lorong sehingga sinar-X tidak menembak. Komponen mana yang pertama kali harus diperiksa?',
    question_en:
      'The X-Ray monitor fails to detect luggage entering the tunnel, so X-rays never fire. Which component should be inspected first?',
    options_id: [
      'Photocells / Light Barrier',
      'VFD / Inverter Konveyor',
      'Lead Curtains (Tirai Timbal)',
      'Master Clock Unit',
    ],
    options_en: [
      'Photocells / Light Barrier',
      'Conveyor VFD / Inverter',
      'Lead Curtains',
      'Master Clock Unit',
    ],
    correctIndex: 0,
    explanation_id:
      'Photocells / Light Barrier di pintu masuk tunnel berfungsi mendeteksi interupsi berkas IR oleh koper untuk mengirim sinyal pemicu ke X-Ray Generator.',
    explanation_en:
      'Photocells / Light Barrier at the tunnel entrance detect IR beam interruption by luggage to trigger X-Ray Generator emission.',
  },
  {
    id: 'q-xray-dual-energy',
    systemId: 'sys-xray',
    relatedComponentId: 'comp-xray-detector',
    question_id:
      'Pada tampilan monitor Mesin X-Ray Dual Energy, material organik (seperti makanan, plastik, dan bahan peledak organik) ditampilkan dengan kode warna apa?',
    question_en:
      'On a Dual-Energy X-Ray monitor, what color code represents organic materials (such as food, plastics, and organic explosives)?',
    options_id: [
      'Oranye',
      'Biru Tua',
      'Hijau Terang',
      'Ungu Neon',
    ],
    options_en: [
      'Orange',
      'Deep Blue',
      'Bright Green',
      'Neon Purple',
    ],
    correctIndex: 0,
    explanation_id:
      'Standar pewarnaan Dual Energy X-Ray memetakan nomor atom rendah (organik) sebagai Oranye, campuran sebagai Hijau, dan anorganik/logam berat sebagai Biru.',
    explanation_en:
      'Dual-Energy X-Ray color standards map low atomic number (organic) materials to Orange, mixed materials to Green, and inorganic/metals to Blue.',
  },
  {
    id: 'q-xray-monoblock',
    systemId: 'sys-xray',
    relatedComponentId: 'comp-xray-monoblock',
    question_id:
      'Apa fungsi utama Insulation Oil di dalam tangki X-Ray Generator (Unit Monoblock) 100–180 kV?',
    question_en:
      'What is the primary purpose of Insulation Oil inside the 100–180 kV X-Ray Generator (Monoblock) tank?',
    options_id: [
      'Sebagai isolator tegangan tinggi sekaligus media pendingin Coolidge Tube & trafo',
      'Sebagai pelumas rantai dan drum motor sabuk konveyor',
      'Sebagai penguat sinyal analog dari photodiode menuju ADC',
      'Sebagai penstabil frekuensi suplai AC 50 Hz',
    ],
    options_en: [
      'Acts as high-voltage dielectric insulation and cooling medium for the Coolidge Tube & transformer',
      'Lubricates the conveyor driving chain and drum motor',
      'Amplifies analog signals from photodiodes to the ADC',
      'Stabilizes the 50 Hz AC mains frequency',
    ],
    correctIndex: 0,
    explanation_id:
      'Insulation Oil mencegah loncatan bunga api tegangan tinggi (100–180 kV) di dalam Monoblock sekaligus menyerap panas yang timbul pada anoda Coolidge Tube.',
    explanation_en:
      'Insulation Oil prevents high-voltage arcing (100–180 kV) inside the Monoblock while dissipating heat generated at the Coolidge Tube anode.',
  },
  {
    id: 'q-xray-vfd',
    systemId: 'sys-xray',
    relatedComponentId: 'comp-xray-conveyor',
    question_id:
      'Citra koper di layar X-Ray tampak memanjang atau memendek tidak proporsional karena kecepatan sabuk tidak stabil saat beban berat. Komponen penggerak mana yang mengatur stabilisasi kecepatan konveyor?',
    question_en:
      'Luggage images on the X-Ray screen appear stretched or compressed because belt speed fluctuates under heavy loads. Which drive component stabilizes conveyor velocity?',
    options_id: [
      'VFD / Inverter pada Sistem Konveyor',
      'DAS & Frame Grabber Card',
      'Kristal Scintillator',
      'Interlock Switch',
    ],
    options_en: [
      'VFD / Inverter in the Conveyor System',
      'DAS & Frame Grabber Card',
      'Scintillator Crystal',
      'Interlock Switch',
    ],
    correctIndex: 0,
    explanation_id:
      'Variable Frequency Drive (VFD/Inverter) mengendalikan frekuensi daya Drum Motor sehingga kecepatan linier sabuk konveyor konstan (~0,20 m/s) meskipun berat bagasi berubah.',
    explanation_en:
      'The Variable Frequency Drive (VFD/Inverter) regulates Drum Motor frequency to maintain constant linear belt velocity (~0.20 m/s) regardless of baggage weight.',
  },
  {
    id: 'q-wtmd-principle',
    systemId: 'sys-wtmd',
    relatedComponentId: 'comp-wtmd-tx',
    question_id:
      'Prinsip fisika elektronika apa yang dimanfaatkan oleh Transmitter Coil dan Receiver Coil pada Walk-Through Metal Detector (WTMD)?',
    question_en:
      'Which electromagnetic principle is used by the Transmitter Coil and Receiver Coil in a Walk-Through Metal Detector (WTMD)?',
    options_id: [
      'Induksi elektromagnetik & timbulnya arus Eddy (Eddy Current) pada benda logam',
      'Pemancaran radiasi pengion foton sinar-X menembus tubuh',
      'Pantulan gelombang ultrasonik 40 kHz',
      'Konversi cahaya tampak oleh kristal scintillator',
    ],
    options_en: [
      'Electromagnetic induction and Eddy currents generated in metallic objects',
      'Ionizing X-ray photon transmission through the body',
      '40 kHz ultrasonic echo reflection',
      'Visible light conversion by scintillator crystals',
    ],
    correctIndex: 0,
    explanation_id:
      'Medan magnet bolak-balik dari Transmitter Coil menginduksi arus Eddy pada logam, menciptakan medan magnet sekunder yang dideteksi perubahan fluksnya oleh Receiver Coil.',
    explanation_en:
      'Alternating magnetic fields from the Transmitter Coil induce Eddy currents in metal, producing a secondary field whose flux shift is sensed by the Receiver Coil.',
  },
  {
    id: 'q-wtmd-zone',
    systemId: 'sys-wtmd',
    relatedComponentId: 'comp-wtmd-alarm',
    question_id:
      'Saat penumpang melintasi WTMD dengan logam di area ikat pinggang, komponen apa yang membantu petugas AVSEC mengetahui ketinggian pasti posisi logam tersebut?',
    question_en:
      'When a passenger walks through a WTMD with metal at waist level, which component shows security officers the exact height of the metal?',
    options_id: [
      'Deretan LED Penunjuk Zona (LED Zone Indicators)',
      'Photocell & Reflector Penghitung Penumpang',
      'Stabilizer / UPS',
      'Antena UHF Transceiver',
    ],
    options_en: [
      'Vertical LED Zone Indicators',
      'Photocell & Reflector Traffic Counter',
      'Stabilizer / UPS',
      'UHF Transceiver Antenna',
    ],
    correctIndex: 0,
    explanation_id:
      'LED Zone Indicators pada tiang gawang WTMD menyala sesuai ketinggian kanal Receiver Coil yang mendeteksi gangguan magnetik sehingga pemeriksaan HHMD langsung tepat sasaran.',
    explanation_en:
      'LED Zone Indicators along the WTMD arch illuminate at the height of the triggered Receiver Coil zone, allowing fast targeted HHMD screening.',
  },
  {
    id: 'q-pids-fiber',
    systemId: 'sys-cctv-pids',
    relatedComponentId: 'comp-cctv-fiber',
    question_id:
      'Mengapa transmisi data dari kamera CCTV & sensor PIDS di pagar perimeter airside sejauh 2 km menuju Ruang Server menggunakan Optical Fiber & Media Converter alih-alih kabel LAN UTP?',
    question_en:
      'Why do CCTV cameras and PIDS sensors along a 2 km airside perimeter fence use Optical Fiber & Media Converters instead of UTP LAN cable?',
    options_id: [
      'Kabel LAN dibatasi ~100 m, sedangkan Optical Fiber menjangkau berkilometer dan kebal interferensi RF/petir',
      'Optical Fiber menghantarkan tegangan 220 V AC ke motor PTZ',
      'Media Converter berfungsi sebagai hard disk perekam cadangan',
      'Kabel LAN tidak dapat mengirimkan format video IP',
    ],
    options_en: [
      'Copper LAN is limited to ~100 m, whereas Optical Fiber spans kilometers with immunity to RF/lightning EMI',
      'Optical Fiber carries 220 V AC power to PTZ motors',
      'Media Converters act as backup video recording hard drives',
      'Copper LAN cannot carry IP video packets',
    ],
    correctIndex: 0,
    explanation_id:
      'Optical Fiber Single-Mode mampu mentransmisikan data berkecepatan tinggi hingga puluhan kilometer tanpa redaman berarti serta kebal terhadap gangguan elektromagnetik dan induksi petir.',
    explanation_en:
      'Single-mode Optical Fiber transmits high-bandwidth data across kilometers with minimal attenuation and complete immunity to RF interference and lightning induction.',
  },
  {
    id: 'q-pids-intrusion',
    systemId: 'sys-cctv-pids',
    relatedComponentId: 'comp-pids-sensors',
    question_id:
      'Pada Sistem Pengawasan Perimeter (PIDS), kombinasi sensor apa yang mendeteksi pemanjatan pagar kawat dan pergerakan objek di zona steril airside?',
    question_en:
      'In a Perimeter Intrusion Detection System (PIDS), which sensor combination detects fence climbing and movement in the sterile airside zone?',
    options_id: [
      'Sensor getaran kawat pagar & Sensor Radar Scanning',
      'Smoke Detector & Manual Call Point',
      'Photodiode & Kristal Scintillator',
      'PABX & Paging Microphone',
    ],
    options_en: [
      'Fence vibration wire sensors & Radar Scanning sensors',
      'Smoke Detector & Manual Call Point',
      'Photodiode & Scintillator Crystal',
      'PABX & Paging Microphone',
    ],
    correctIndex: 0,
    explanation_id:
      'PIDS memanfaatkan kabel sensor getaran pada pagar kawat serta Radar Scanning garis lurus untuk mendeteksi intrusi dan mengarahkan kamera PTZ secara otomatis.',
    explanation_en:
      'PIDS combines fence vibration cables and line-of-sight Radar Scanning to detect intrusions and automatically slew PTZ cameras to the alert zone.',
  },
  {
    id: 'q-fire-mcfa',
    systemId: 'sys-access-fire',
    relatedComponentId: 'comp-fire-mcfa',
    question_id:
      'Ketika Smoke Detector mendeteksi asap pekat atau petugas menekan Manual Call Point, panel utama apa yang memproses alamat zona kebakaran sekaligus memicu sirine/strobe dan pelepasan pintu darurat?',
    question_en:
      'When a Smoke Detector senses dense smoke or a Manual Call Point is activated, which main panel identifies the fire zone and triggers sirens/strobes and emergency door release?',
    options_id: [
      'MCFA (Master Control Fire Alarm)',
      'NVR (Network Video Recorder)',
      'Master Clock Unit',
      'VFD / Inverter',
    ],
    options_en: [
      'MCFA (Master Control Fire Alarm)',
      'NVR (Network Video Recorder)',
      'Master Clock Unit',
      'VFD / Inverter',
    ],
    correctIndex: 0,
    explanation_id:
      'MCFA adalah pusat kendali Fire Alarm System yang membaca loop detektor/MCP, menampilkan lokasi kebakaran, membunyikan sirine/strobe, dan mengirim sinyal Fail-Safe ke Access Control.',
    explanation_en:
      'The MCFA is the Fire Alarm System hub that polls detectors/MCPs, displays the exact fire zone, sounds sirens/strobes, and sends a Fail-Safe unlock signal to Access Control.',
  },
  {
    id: 'q-access-failsafe',
    systemId: 'sys-access-fire',
    relatedComponentId: 'comp-access-lock',
    question_id:
      'Mengapa Magnetic Lock pada pintu darurat Area Terbatas bandara harus dikonfigurasi dalam mode Fail-Safe dan terinterlock ke MCFA?',
    question_en:
      'Why must Magnetic Locks on restricted-area emergency doors be configured Fail-Safe and interlocked with the MCFA?',
    options_id: [
      'Agar pintu otomatis terbuka saat catu daya terputus atau alarm kebakaran aktif demi keselamatan evakuasi',
      'Agar pintu tetap terkunci rapat meskipun listrik padam total',
      'Agar kartu RFID tidak perlu dibaca lagi di siang hari',
      'Untuk menghemat bandwidth kabel Optical Fiber',
    ],
    options_en: [
      'So doors unlock automatically during power loss or fire alarms to enable safe evacuation',
      'So doors stay tightly locked even during a complete blackout',
      'So RFID cards are bypassed during daytime hours',
      'To save Optical Fiber network bandwidth',
    ],
    correctIndex: 0,
    explanation_id:
      'Prinsip Fail-Safe memastikan jalur evakuasi tidak pernah mengunci orang di dalam gedung saat terjadi kebakaran atau pemadaman darurat.',
    explanation_en:
      'Fail-Safe design guarantees escape routes never trap personnel inside the building during a fire or emergency power cut.',
  },
  {
    id: 'q-fids-masterclock',
    systemId: 'sys-fids-pas',
    relatedComponentId: 'comp-master-clock',
    question_id:
      'Layar FIDS di Concourse, BIDS di Baggage Claim, dan timestamp NVR CCTV harus menunjukkan detik yang seragam di seluruh terminal. Perangkat apa yang menjadi referensi waktu tunggalnya?',
    question_en:
      'Concourse FIDS screens, Baggage Claim BIDS, and CCTV NVR timestamps must stay synchronized to the exact second across the terminal. Which device serves as the single time reference?',
    options_id: [
      'Master Clock Unit',
      'Automatic Announcement System (AAS)',
      'Media Converter SFP',
      'Access Control Server',
    ],
    options_en: [
      'Master Clock Unit',
      'Automatic Announcement System (AAS)',
      'SFP Media Converter',
      'Access Control Server',
    ],
    correctIndex: 0,
    explanation_id:
      'Master Clock Unit mengunci referensi waktu GPS/GNSS dan mendistribusikannya via NTP/PTP ke seluruh FIDS, jam dinding digital, dan server operasional bandara.',
    explanation_en:
      'The Master Clock Unit locks onto GPS/GNSS time and distributes NTP/PTP synchronization across FIDS screens, slave clocks, and operational servers.',
  },
  {
    id: 'q-pas-chain',
    systemId: 'sys-fids-pas',
    relatedComponentId: 'comp-pas-aas',
    question_id:
      'Urutan alur sinyal yang tepat saat pengumuman boarding otomatis (AAS) diputar menuju penumpang di ruang tunggu Concourse adalah:',
    question_en:
      'What is the correct signal chain when an automated boarding announcement (AAS) plays to passengers in the Concourse?',
    options_id: [
      'AAS -> Mixer Audio Digital -> Power Amplifier (100V Line) -> Ceiling/Horn Speakers',
      'Ceiling Speakers -> Power Amplifier -> AAS -> Master Clock',
      'AAS -> Optical Fiber -> NVR -> FIDS Monitor',
      'Paging Mic -> MCFA -> Magnetic Lock -> Flap Barrier',
    ],
    options_en: [
      'AAS -> Digital Audio Mixer -> Power Amplifier (100V Line) -> Ceiling/Horn Speakers',
      'Ceiling Speakers -> Power Amplifier -> AAS -> Master Clock',
      'AAS -> Optical Fiber -> NVR -> FIDS Monitor',
      'Paging Mic -> MCFA -> Magnetic Lock -> Flap Barrier',
    ],
    correctIndex: 0,
    explanation_id:
      'Sinyal audio dari AAS dirutekan oleh Mixer Audio Digital ke zona gate yang dipilih, diperkuat oleh Power Amplifier 100V Line, dan diubah menjadi gelombang suara oleh Ceiling/Horn Speakers.',
    explanation_en:
      'Audio from AAS is routed by the Digital Mixer to the target gate zone, boosted by the 100V Line Power Amplifier, and broadcast through Ceiling/Horn Speakers.',
  },
  {
    id: 'q-radio-ptt',
    systemId: 'sys-radio-igcs',
    relatedComponentId: 'comp-radio-transceiver',
    question_id:
      'Mengapa teknisi radio dilarang menekan tombol Push-to-Talk (PTT) pada Handy Talky (HT) atau Radio Mobile/RIG saat antena belum terpasang?',
    question_en:
      'Why must technicians avoid pressing Push-to-Talk (PTT) on a Handheld HT or Mobile RIG without an antenna connected?',
    options_id: [
      'Daya RF memantul kembali (VSWR tinggi) dan dapat merusak transistor penguat daya RF final',
      'Baterai HT akan langsung terisi penuh secara berlebih',
      'Sinyal suara berubah menjadi sinyal sinar-X',
      'Layar FIDS di Concourse akan ikut mati',
    ],
    options_en: [
      'Reflected RF power (high VSWR) can permanently damage the final RF power amplifier stage',
      'The HT battery will instantly overcharge',
      'Audio signals convert into X-ray radiation',
      'Concourse FIDS monitors will power off',
    ],
    correctIndex: 0,
    explanation_id:
      'Tanpa beban antena yang sesuai impedansinya (50 Ohm), energi RF yang dipancarkan saat PTT memantul kembali ke rangkaian penguat daya (PA) dan menyebabkan panas berlebih hingga rusak.',
    explanation_en:
      'Without a matched 50-ohm antenna load, transmitted RF energy reflects back into the power amplifier stage, causing overheating and permanent transistor failure.',
  },
  {
    id: 'q-igcs-trunking',
    systemId: 'sys-radio-igcs',
    relatedComponentId: 'comp-igcs-pabx',
    question_id:
      'Perangkat apa di Ruang Server yang memungkinkan banyak grup kerja bandara (AVSEC, PKP-PK, Ground Handling) berkomunikasi radio secara terorganisir serta menghubungkan telepon internal/interkom?',
    question_en:
      'Which server-room infrastructure enables multiple airport workgroups (AVSEC, ARFF, Ground Handling) to share radio channels smoothly alongside internal telephone/intercom switching?',
    options_id: [
      'IGCS (Base Station & Trunking Controller) dan PABX',
      'DAS & Frame Grabber Card',
      'Transmitter & Receiver Coil',
      'Videotron & Media Player',
    ],
    options_en: [
      'IGCS (Base Station & Trunking Controller) and PABX',
      'DAS & Frame Grabber Card',
      'Transmitter & Receiver Coil',
      'Videotron & Media Player',
    ],
    correctIndex: 0,
    explanation_id:
      'IGCS mengatur alokasi kanal radio trunking melalui Base Station Transceiver, sedangkan PABX menangani switching panggilan telepon internal dan interkom antar pos.',
    explanation_en:
      'IGCS manages trunked radio channel allocation via Base Station Transceivers, while PABX handles internal telephone and intercom switching across operational posts.',
  },
  {
    id: 'q-xray-das',
    systemId: 'sys-xray',
    relatedComponentId: 'comp-xray-das',
    question_id:
      'Setelah photodiode pada Detector Array menghasilkan sinyal arus listrik analog, komponen apa yang bertugas mengubahnya menjadi data digital (ADC) kecepatan tinggi sebelum masuk ke Industrial PC?',
    question_en:
      'After photodiodes in the Detector Array generate analog electrical currents, which component performs high-speed analog-to-digital conversion (ADC) before feeding the Industrial PC?',
    options_id: [
      'DAS & Frame Grabber Card',
      'Coolidge Tube',
      'Foot Switch',
      'Drum Motor',
    ],
    options_en: [
      'DAS & Frame Grabber Card',
      'Coolidge Tube',
      'Foot Switch',
      'Drum Motor',
    ],
    correctIndex: 0,
    explanation_id:
      'Data Acquisition System (DAS) & Frame Grabber Card melakukan amplifikasi, multiplexing, dan konversi ADC kecepatan tinggi agar citra pemindaian dapat direkonstruksi real-time oleh Industrial PC.',
    explanation_en:
      'The Data Acquisition System (DAS) & Frame Grabber Card amplifies, multiplexes, and runs high-speed ADC conversion so the Industrial PC can reconstruct real-time scan images.',
  },
];

export function pickRandomQuizSet(count = 5): QuizQuestion[] {
  const pool = [...QUIZ_BANK];
  // Guarantee coverage across distinct systems first
  const bySystem = new Map<string, QuizQuestion[]>();
  for (const q of pool) {
    const arr = bySystem.get(q.systemId) ?? [];
    arr.push(q);
    bySystem.set(q.systemId, arr);
  }
  const picked: QuizQuestion[] = [];
  const systemKeys = Array.from(bySystem.keys()).sort(() => Math.random() - 0.5);
  for (const sys of systemKeys) {
    if (picked.length >= count) break;
    const list = bySystem.get(sys)!;
    const item = list[Math.floor(Math.random() * list.length)];
    picked.push(item);
  }
  while (picked.length < count && picked.length < pool.length) {
    const remaining = pool.filter((q) => !picked.some((p) => p.id === q.id));
    picked.push(remaining[Math.floor(Math.random() * remaining.length)]);
  }
  return picked.sort(() => Math.random() - 0.5);
}
