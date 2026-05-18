import { Download, ChevronLeft, FileText, DownloadCloud, ClipboardCheck, Key, Printer } from 'lucide-react';
import { GeneratedSoal, SoalFormData } from '../types';
import { NavItem } from './Sidebar';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ModulTableProps {
  data: GeneratedSoal;
  formInput: SoalFormData;
  onBack: () => void;
  mode: NavItem;
}

export default function ModulTable({ data, formInput, onBack, mode }: ModulTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [activeTab, setActiveTab] = useState<'soal' | 'kunci' | 'kisi'>('soal');
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [isGeneratingImage, setIsGeneratingImage] = useState<Record<number, boolean>>({});

  const handlePrint = () => {
    window.print();
  };

  const generateImage = async (questionNumber: number, stimulus: string) => {
    setIsGeneratingImage(prev => ({ ...prev, [questionNumber]: true }));
    try {
      const prompt = encodeURIComponent(stimulus + ", education style, flat illustration, clean vector, white background");
      const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=800&height=450&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
      
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      setGeneratedImages(prev => ({ ...prev, [questionNumber]: imageUrl }));
    } finally {
      setIsGeneratingImage(prev => ({ ...prev, [questionNumber]: false }));
    }
  };

  const getHeaderText = () => {
    switch(activeTab) {
      case 'soal': return 'LEMBAR ASESMEN KURIKULUM MERDEKA';
      case 'kunci': return 'LEMBAR KUNCI JAWABAN DAN BAHASAN';
      case 'kisi': return 'LEMBAR KISI-KISI SOAL';
      default: return 'LEMBAR ASESMEN KURIKULUM MERDEKA';
    }
  };

  const downloadWord = () => {
    if (!containerRef.current) return;
    
    const preHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Export Doc</title>
        <style>
          @page { margin: 1in; size: portrait; }
          body { font-family: 'Times New Roman', serif; margin: 0; line-height: 1.5; font-size: 11pt; color: black; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15pt; }
          .centered { text-align: center; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          .identity-table { border: 1pt solid black; }
          .identity-table td { border: 1pt solid black; padding: 6pt; font-size: 10pt; vertical-align: top; }
          .question-table { margin-bottom: 10pt; }
          .question-table td { vertical-align: top; padding: 3pt; border: none; }
          .q-num { width: 30pt; }
          .q-text { text-align: justify; }
          .options-table { margin-left: 30pt; }
          .options-table td { padding: 2pt; border: none; }
          .spreadsheet-table { border: 1pt solid black; }
          .spreadsheet-table th, .spreadsheet-table td { border: 1pt solid black; padding: 5pt; font-size: 10pt; }
          .stimulus-box { border: 1pt solid #ccc; padding: 10pt; margin-bottom: 10pt; font-style: italic; background-color: #f9f9f9; }
          .signature-table { margin-top: 30pt; }
          .signature-table td { width: 50%; vertical-align: top; border: none; }
          .no-print { display: none !important; }
        </style>
      </head>
      <body>`;
    const postHtml = "</body></html>";
    
    let contentHtml = '<div style="width: 100%;">';

    contentHtml += `
      <div class="centered">
        <h2 class="uppercase font-bold" style="margin-bottom: 5pt;">${getHeaderText()}</h2>
        <p class="font-bold" style="margin-top: 0;">TAHUN AJARAN ${formInput.academicYear}</p>
      </div>
      <div style="border-bottom: 2pt double black; height: 1pt; margin-bottom: 15pt; width: 100%;"></div>
    `;

    contentHtml += `
      <table class="identity-table">
        <tr>
          <td width="50%">
            <b>SATUAN PENDIDIKAN</b>: ${formInput.schoolName}<br>
            <b>MATA PELAJARAN</b>: ${formInput.subject}<br>
            <b>KELAS / SEMESTER</b>: ${formInput.grade} / ${formInput.semester}<br>
            ${(activeTab !== 'soal' || (mode !== 'sts' && mode !== 'sas')) ? `<b>MATERI POKOK</b>: ${data.header.material || formInput.material}` : ''}
          </td>
          <td>
            <b>NAMA GURU</b>: ${formInput.teacherName}<br>
            <b>NIP GURU</b>: ${formInput.teacherNip}<br>
            <b>JABATAN</b>: ${formInput.position}<br>
            <b>ALOKASI WAKTU</b>: ${data.header.timeLimit || '60 Menit'}
          </td>
        </tr>
      </table>
    `;

    if (activeTab === 'soal') {
      contentHtml += `<p style="font-style: italic; border-bottom: 1px solid #ccc; padding-bottom: 5pt; margin-bottom: 15pt;">
        Petunjuk: Kerjakanlah soal-soal di bawah ini dengan jujur dan teliti!
      </p>`;

      for (const q of data.questions) {
        contentHtml += `<div class="question-item">`;
        
        if (q.stimulus) {
          contentHtml += `<div class="stimulus-box"><b>STIMULUS BACAAN:</b><br>${q.stimulus}</div>`;
        }

        const imgUrl = generatedImages[q.number];

        if (imgUrl) {
          contentHtml += `<div style="text-align: center; margin-bottom: 10pt;"><img src="${imgUrl}" width="350" /></div>`;
        }

        contentHtml += `<table class="question-table"><tr>`;
        contentHtml += `<td class="q-num"><b>${q.number}.</b></td>`;
        contentHtml += `<td class="q-text">${q.text}</td></tr></table>`;

        if (q.type === 'Pilihan Ganda' && q.options) {
          contentHtml += `<table class="options-table">`;
          q.options.forEach((opt, i) => {
            contentHtml += `<tr><td width="20"><b>${String.fromCharCode(65 + i)}.</b></td><td>${opt}</td></tr>`;
          });
          contentHtml += `</table>`;
        } else if (q.type === 'Pilihan Ganda Kompleks' && q.multiOptions) {
          contentHtml += `<table class="options-table">`;
          q.multiOptions.forEach((opt) => {
            contentHtml += `<tr><td width="20">[ ]</td><td>${opt.text}</td></tr>`;
          });
          contentHtml += `</table>`;
        } else if (q.type === 'Benar Salah') {
          contentHtml += `<div style="margin-left: 30pt;"> ( ) BENAR &nbsp;&nbsp;&nbsp; ( ) SALAH </div>`;
        } else if (q.type === 'Isian Singkat') {
          contentHtml += `<div style="margin-left: 30pt; margin-top: 5pt; border-bottom: 1px dotted #000; height: 15pt; width: 80%;"></div>`;
        } else if (q.type === 'Uraian') {
          contentHtml += `
            <div style="margin-left: 30pt; margin-top: 5pt; border-bottom: 1px dotted #000; height: 15pt; width: 90%;"></div>
            <div style="margin-left: 30pt; margin-top: 5pt; border-bottom: 1px dotted #000; height: 15pt; width: 90%;"></div>
            <div style="margin-left: 30pt; margin-top: 5pt; border-bottom: 1px dotted #000; height: 15pt; width: 90%;"></div>
          `;
        } else if (q.type === 'Menjodohkan' && q.matchingPairs) {
          contentHtml += `<table class="spreadsheet-table" style="margin-left: 30pt; width: 90%;">
            <tr><th width="50%">Pernyataan A</th><th width="50%">Pernyataan B (Jawaban)</th></tr>
            ${q.matchingPairs.map(p => `<tr><td height="30">${p.prompt}</td><td></td></tr>`).join('')}
          </table>`;
        }

        contentHtml += `</div><br>`;
      }
    } else if (activeTab === 'kunci') {
      contentHtml += `
        <table class="spreadsheet-table">
          <tr><th width="40">No</th><th width="80">Bentuk</th><th>Kunci & Pembahasan</th></tr>
          ${data.questions.map(q => `
            <tr>
              <td class="centered">${q.number}</td>
              <td class="centered">${q.type}</td>
              <td>
                <b>KUNCI: ${
                  typeof q.answerKey === 'object' && q.answerKey !== null
                    ? Object.entries(q.answerKey).map(([key, val]) => `${key}: ${val}`).join(', ')
                    : q.answerKey || '-'
                }</b>
                <br><i>Bahasan: ${q.explanation || '-'}</i>
                <br><small>Level: ${q.cognitiveLevel || 'MOTS'}</small>
              </td>
            </tr>
          `).join('')}
        </table>
      `;
    } else if (activeTab === 'kisi') {
      contentHtml += `
        <table class="spreadsheet-table">
          <tr><th>No</th><th>Capaian & Tujuan Pembelajaran</th><th>Indikator</th><th>Level</th><th>Bentuk</th></tr>
          ${data.kisiKisi.map(k => `
            <tr>
              <td class="centered">${k.no}</td>
              <td><b>CP:</b> ${formInput.cp}<br><b>TP:</b> ${k.tp}</td>
              <td>${k.indikatorSoal}</td>
              <td class="centered">${k.levelKognitif}</td>
              <td class="centered">${k.bentukSoal}</td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    if (activeTab !== 'soal') {
      contentHtml += `
        <table class="signature-table">
          <tr>
            <td>
              Mengetahui,<br>Kepala Sekolah<br><br><br><br>
              <b><u>${formInput.principalName}</u></b><br>NIP. ${formInput.principalNip}
            </td>
            <td>
              ${formInput.regionName}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
              ${formInput.position}<br><br><br><br>
              <b><u>${formInput.teacherName}</u></b><br>NIP. ${formInput.teacherNip}
            </td>
          </tr>
        </table>
      `;
    }

    contentHtml += '</div>';

    const html = preHtml + contentHtml + postHtml;

    const blob = new Blob(['\ufeff', html], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${formInput.subject || 'Asesmen'}_${activeTab}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const NavButton = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
        activeTab === id 
          ? "bg-citrus-600 text-white shadow-lg shadow-citrus-600/20" 
          : "bg-white text-citrus-700 hover:bg-citrus-50 border border-citrus-100"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32">
      {/* STYLE CSS OPTIMASI CETAK: MENGHEMAT KERTAS & ADAPTIF KOLOM KISI-KISI */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: portrait;
            margin: 1.5cm !important;
          }
          .no-print, 
          button, 
          header, 
          nav, 
          aside, 
          footer,
          .sticky { 
            display: none !important; 
          }
          body, main, #root {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          div[ref], .bg-white {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          table, .spreadsheet-table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            word-wrap: break-word !important;
            border-collapse: collapse !important;
            margin-bottom: 15pt !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .spreadsheet-table th, .spreadsheet-table td {
            padding: 6px !important;
            font-size: 10pt !important;
            line-height: 1.3 !important;
            vertical-align: top !important;
            word-break: break-word !important;
            border: 1px solid #000000 !important;
          }
          
          /* ========================================================================= */
          /* FIX: BERIKAN ATURAN BERBEDA ANTARA LEMBAR KUNCI JAWABAN & LEMBAR KISI-KISI */
          /* ========================================================================= */

          /* Kondisi A: Ketika membuka LEMBAR KISI-KISI (Tabel terdeteksi memiliki total 5 kolom) */
          .spreadsheet-table th:nth-child(1):nth-last-child(5), .spreadsheet-table td:nth-child(1):nth-last-child(5) { width: 6% !important; }   /* No */
          .spreadsheet-table th:nth-child(2):nth-last-child(4), .spreadsheet-table td:nth-child(2):nth-last-child(4) { width: 48% !important; }  /* CP / TP (Tetap Lebar) */
          .spreadsheet-table th:nth-child(3):nth-last-child(3), .spreadsheet-table td:nth-child(3):nth-last-child(3) { width: 26% !important; }  /* Indikator Soal */
          .spreadsheet-table th:nth-child(4):nth-last-child(2), .spreadsheet-table td:nth-child(4):nth-last-child(2) { width: 10% !important; }  /* Level */
          .spreadsheet-table th:nth-child(5):nth-last-child(1), .spreadsheet-table td:nth-child(5):nth-last-child(1) { width: 10% !important; }  /* Bentuk */
          
          /* Kondisi B: Ketika membuka LEMBAR KUNCI JAWABAN (Tabel terdeteksi memiliki total 3 kolom) */
          .spreadsheet-table th:nth-child(1):nth-last-child(3), .spreadsheet-table td:nth-child(1):nth-last-child(3) { width: 6% !important; }   /* No */
          .spreadsheet-table th:nth-child(2):nth-last-child(2), .spreadsheet-table td:nth-child(2):nth-last-child(2) { width: 14% !important; }  /* Kolom Bentuk Soal Diperkecil */
          .spreadsheet-table th:nth-child(3):nth-last-child(1), .spreadsheet-table td:nth-child(3):nth-last-child(1) { width: 80% !important; }  /* Kolom Kunci & Bahasan Diperlebar */
          
          /* ========================================================================= */
          
          .overflow-x-auto {
            overflow: visible !important;
            max-width: 100% !important;
          }
          
          /* Optimasi Lembar Soal: Izinkan mengalir padat tanpa membuang ruang bawah halaman */
          .question-item {
            page-break-inside: auto !important; 
            break-inside: auto !important;
          }
          
          /* Pertahankan keutuhan per-blok soal (nomor, teks, opsi) agar tidak terpisah jelek */
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 14pt !important;
          }
          
          p, span, td, th, div {
            color: black !important;
          }
        }
      `}} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print bg-white/80 backdrop-blur-md p-4 rounded-[1.5rem] border border-citrus-100 sticky top-4 z-40 shadow-xl shadow-citrus-900/5">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-citrus-700 font-bold hover:text-citrus-900 transition-colors px-4 py-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Edit Data
        </button>

        <div className="flex items-center gap-2">
          <NavButton id="soal" icon={FileText} label="Evaluasi" />
          <NavButton id="kunci" icon={Key} label="Kunci & Bahasan" />
          <NavButton id="kisi" icon={ClipboardCheck} label="Kisi-kisi" />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="gradient-citrus text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Unduh
          </button>
          
          <AnimatePresence>
            {showExportOptions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y
