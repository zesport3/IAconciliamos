import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Empresa, Reconciliacao } from '../types';
import { formatMoeda } from './calculations';

export function exportReconciliacaoToExcel(empresa: Empresa, rec: Reconciliacao) {
  const wb = XLSX.utils.book_new();

  const campo1 = rec.campo1_debitosEmpresaSemBanco || rec.debitosEmpresaNaoBanco || rec.debitosEmpresaNaoRegistadosBanco || [];
  const campo2 = rec.campo2_creditosEmpresaSemBanco || rec.creditosEmpresaNaoBanco || rec.pagamentosRMNaoRegistadosBanco || [];
  const campo3 = rec.campo3_debitosBancoSemEmpresa || rec.debitosBancoNaoEmpresa || (rec.pagamentosBancoNaoRegistadosEmpresa ? rec.pagamentosBancoNaoRegistadosEmpresa.filter(m => m.tipo === 'debito') : []);
  const campo4 = rec.campo4_creditosBancoSemEmpresa || rec.creditosBancoNaoEmpresa || (rec.pagamentosBancoNaoRegistadosEmpresa ? rec.pagamentosBancoNaoRegistadosEmpresa.filter(m => m.tipo === 'credito') : []);

  const total1 = rec.totalCampo1_debitosEmpresaSemBanco ?? rec.totalDebitosEmpresaNaoBanco ?? campo1.reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
  const total2 = rec.totalCampo2_creditosEmpresaSemBanco ?? rec.totalCreditosEmpresaNaoBanco ?? campo2.reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
  const total3 = rec.totalCampo3_debitosBancoSemEmpresa ?? rec.totalDebitosBancoNaoEmpresa ?? campo3.reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
  const total4 = rec.totalCampo4_creditosBancoSemEmpresa ?? rec.totalCreditosBancoNaoEmpresa ?? campo4.reduce((acc, m) => acc + (Number(m.valor) || 0), 0);

  const rows: any[][] = [];

  // Title & Company Information
  rows.push(['MAPA DE CONCILIAÇÃO BANCÁRIA']);
  rows.push(['']);
  rows.push(['Empresa:', empresa.nome, '', 'Banco:', empresa.banco || '-']);
  rows.push(['NIF:', empresa.nif || '-', '', 'Código SNC (Razão):', empresa.codigoConta || '12.1']);
  rows.push(['Mês de Referência:', rec.mes, '', 'Estado:', Math.abs(rec.diferencaConciliacao) < 0.01 ? 'CONCILIADO' : 'PENDENTE']);
  rows.push(['Data de Emissão:', new Date().toLocaleDateString('pt-PT'), '', 'Localidade:', rec.local || 'Lisboa']);
  rows.push(['']);

  // Bloco A
  rows.push(['(A) SALDO DO EXTRATO BANCÁRIO', rec.saldoExtratoBancario]);
  rows.push(['']);

  // Campo 1: (+) Débito na empresa s/ correspondência no banco
  rows.push(['(+) 1. DÉBITOS NA EMPRESA S/ CORRESPONDÊNCIA NO BANCO (Depósitos em trânsito)']);
  rows.push(['Data', 'Nº Doc', 'Descrição', 'Valor', 'Observação']);
  if (campo1.length === 0) {
    rows.push(['-', '-', 'Sem movimentos', 0, '-']);
  } else {
    campo1.forEach((item) => {
      rows.push([item.data, item.nDoc, item.descricao, item.valor, item.observacao || '']);
    });
  }
  rows.push(['Subtotal (1) Total Débitos Empresa:', '', '', total1]);
  rows.push(['']);

  // Campo 2: (-) Crédito na Empresa s/ correspondência no Banco
  rows.push(['(-) 2. CRÉDITOS NA EMPRESA S/ CORRESPONDÊNCIA NO BANCO (Cheques / Ordens em circulação)']);
  rows.push(['Data', 'Nº Doc', 'Descrição', 'Valor', 'Observação']);
  if (campo2.length === 0) {
    rows.push(['-', '-', 'Sem movimentos', 0, '-']);
  } else {
    campo2.forEach((item) => {
      rows.push([item.data, item.nDoc, item.descricao, item.valor, item.observacao || '']);
    });
  }
  rows.push(['Subtotal (2) Total Créditos Empresa:', '', '', total2]);
  rows.push(['']);

  // Campo 3: (+) Débito no banco s/ correspondência na Empresa
  rows.push(['(+) 3. DÉBITOS NO BANCO S/ CORRESPONDÊNCIA NA EMPRESA (Despesas, comissões, débitos diretos)']);
  rows.push(['Data', 'Nº Doc', 'Descrição', 'Valor', 'Observação']);
  if (campo3.length === 0) {
    rows.push(['-', '-', 'Sem movimentos', 0, '-']);
  } else {
    campo3.forEach((item) => {
      rows.push([item.data, item.nDoc, item.descricao, item.valor, item.observacao || '']);
    });
  }
  rows.push(['Subtotal (3) Total Débitos Banco:', '', '', total3]);
  rows.push(['']);

  // Campo 4: (-) Crédito no banco s/ correspondência na Empresa
  rows.push(['(-) 4. CRÉDITOS NO BANCO S/ CORRESPONDÊNCIA NA EMPRESA (Juros, rendimentos auferidos)']);
  rows.push(['Data', 'Nº Doc', 'Descrição', 'Valor', 'Observação']);
  if (campo4.length === 0) {
    rows.push(['-', '-', 'Sem movimentos', 0, '-']);
  } else {
    campo4.forEach((item) => {
      rows.push([item.data, item.nDoc, item.descricao, item.valor, item.observacao || '']);
    });
  }
  rows.push(['Subtotal (4) Total Créditos Banco:', '', '', total4]);
  rows.push(['']);

  // Resumo do Apuramento
  rows.push(['RESUMO DO APURAMENTO DA CONCILIAÇÃO']);
  rows.push(['Fórmula de Apuramento:', 'Saldo Apurado = Saldo Banco + (1) - (2) + (3) - (4)']);
  rows.push(['SALDO APURADO:', rec.saldoApurado]);
  rows.push(['SALDO DA CONTABILIDADE:', rec.saldoContabilidade]);
  rows.push(['DIFERENÇA DE CONCILIAÇÃO:', rec.diferencaConciliacao]);
  if (rec.notasExplicativas) {
    rows.push(['']);
    rows.push(['NOTAS EXPLICATIVAS / PARECER DE CONCILIAÇÃO']);
    rows.push([rec.notasExplicativas]);
  }
  rows.push(['']);
  rows.push(['RESPONSÁVEIS']);
  rows.push(['Elaborado por:', rec.elaboradoPor || '']);
  rows.push(['Aprovado por:', rec.aprovadoPor || '']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Styling column widths
  ws['!cols'] = [
    { wch: 16 }, // A
    { wch: 20 }, // B
    { wch: 45 }, // C
    { wch: 16 }, // D
    { wch: 35 }, // E
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Mapa de Conciliação');

  const safeFilename = `Conciliacao_${empresa.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${rec.id}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

export function exportReconciliacaoToPdf(empresa: Empresa, rec: Reconciliacao) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 14;

  const campo1 = rec.campo1_debitosEmpresaSemBanco || rec.debitosEmpresaNaoBanco || rec.debitosEmpresaNaoRegistadosBanco || [];
  const campo2 = rec.campo2_creditosEmpresaSemBanco || rec.creditosEmpresaNaoBanco || rec.pagamentosRMNaoRegistadosBanco || [];
  const campo3 = rec.campo3_debitosBancoSemEmpresa || rec.debitosBancoNaoEmpresa || (rec.pagamentosBancoNaoRegistadosEmpresa ? rec.pagamentosBancoNaoRegistadosEmpresa.filter(m => m.tipo === 'debito') : []);
  const campo4 = rec.campo4_creditosBancoSemEmpresa || rec.creditosBancoNaoEmpresa || (rec.pagamentosBancoNaoRegistadosEmpresa ? rec.pagamentosBancoNaoRegistadosEmpresa.filter(m => m.tipo === 'credito') : []);

  const total1 = rec.totalCampo1_debitosEmpresaSemBanco ?? rec.totalDebitosEmpresaNaoBanco ?? campo1.reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
  const total2 = rec.totalCampo2_creditosEmpresaSemBanco ?? rec.totalCreditosEmpresaNaoBanco ?? campo2.reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
  const total3 = rec.totalCampo3_debitosBancoSemEmpresa ?? rec.totalDebitosBancoNaoEmpresa ?? campo3.reduce((acc, m) => acc + (Number(m.valor) || 0), 0);
  const total4 = rec.totalCampo4_creditosBancoSemEmpresa ?? rec.totalCreditosBancoNaoEmpresa ?? campo4.reduce((acc, m) => acc + (Number(m.valor) || 0), 0);

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(14, currentY, pageWidth - 28, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('MAPA DE CONCILIAÇÃO BANCÁRIA (SNC)', 18, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Período: ${rec.mes}  |  Local: ${rec.local || 'Lisboa'}  |  Normativo: Sistema de Normalização Contabilística (SNC)`, 18, currentY + 15);

  currentY += 24;

  // Company Details Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, pageWidth - 28, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  doc.text('Empresa:', 18, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${empresa.nome}`, 35, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Banco:', 110, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${empresa.banco || '-'}`, 124, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('NIF:', 18, currentY + 12.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${empresa.nif || '-'}`, 35, currentY + 12.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Cód. Razão:', 110, currentY + 12.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${empresa.codigoConta || '12.1'}`, 130, currentY + 12.5);

  currentY += 22;

  // Bloco (A) Saldo do Extrato Bancário
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, pageWidth - 28, 8, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('(A) SALDO DO EXTRATO BANCÁRIO', 18, currentY + 5.5);
  doc.text(formatMoeda(rec.saldoExtratoBancario), pageWidth - 18, currentY + 5.5, { align: 'right' });

  currentY += 12;

  // Campo 1: (+) Débitos da empresa não registados no banco
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('(+) 1. Débitos na Empresa s/ correspondência no Banco (Depósitos em trânsito)', 14, currentY);

  const t1Rows = campo1.map((item) => [
    item.data,
    item.nDoc,
    item.descricao,
    formatMoeda(item.valor),
    item.observacao || '',
  ]);

  autoTable(doc, {
    startY: currentY + 2,
    head: [['Data', 'Nº Doc', 'Descrição', 'Valor', 'Obs']],
    body: t1Rows.length > 0 ? t1Rows : [['-', '-', 'Sem movimentos', formatMoeda(0), '-']],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 7.5 },
    bodyStyles: { fontSize: 7, cellPadding: 1.2 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 22 },
      2: { cellWidth: 65 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 'auto' },
    },
    foot: [['Subtotal (1) Débitos Empresa', '', '', formatMoeda(total1), '']],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;
  if (currentY > 230) { doc.addPage(); currentY = 16; }

  // Campo 2: (-) Créditos da empresa não registados no banco
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('(-) 2. Créditos na Empresa s/ correspondência no Banco (Cheques em circulação)', 14, currentY);

  const t2Rows = campo2.map((item) => [
    item.data,
    item.nDoc,
    item.descricao,
    formatMoeda(item.valor),
    item.observacao || '',
  ]);

  autoTable(doc, {
    startY: currentY + 2,
    head: [['Data', 'Nº Doc', 'Descrição', 'Valor', 'Obs']],
    body: t2Rows.length > 0 ? t2Rows : [['-', '-', 'Sem movimentos', formatMoeda(0), '-']],
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 7.5 },
    bodyStyles: { fontSize: 7, cellPadding: 1.2 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 22 },
      2: { cellWidth: 65 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 'auto' },
    },
    foot: [['Subtotal (2) Créditos Empresa', '', '', formatMoeda(total2), '']],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;
  if (currentY > 230) { doc.addPage(); currentY = 16; }

  // Campo 3: (+) Débitos no banco não registados na empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('(+) 3. Débitos no Banco s/ correspondência na Empresa (Comissões e despesas)', 14, currentY);

  const t3Rows = campo3.map((item) => [
    item.data,
    item.nDoc,
    item.descricao,
    formatMoeda(item.valor),
    item.observacao || '',
  ]);

  autoTable(doc, {
    startY: currentY + 2,
    head: [['Data', 'Nº Doc', 'Descrição', 'Valor', 'Obs']],
    body: t3Rows.length > 0 ? t3Rows : [['-', '-', 'Sem movimentos', formatMoeda(0), '-']],
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 7.5 },
    bodyStyles: { fontSize: 7, cellPadding: 1.2 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 22 },
      2: { cellWidth: 65 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 'auto' },
    },
    foot: [['Subtotal (3) Débitos Banco', '', '', formatMoeda(total3), '']],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;
  if (currentY > 230) { doc.addPage(); currentY = 16; }

  // Campo 4: (-) Créditos no banco não registados na empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('(-) 4. Créditos no Banco s/ correspondência na Empresa (Juros auferidos)', 14, currentY);

  const t4Rows = campo4.map((item) => [
    item.data,
    item.nDoc,
    item.descricao,
    formatMoeda(item.valor),
    item.observacao || '',
  ]);

  autoTable(doc, {
    startY: currentY + 2,
    head: [['Data', 'Nº Doc', 'Descrição', 'Valor', 'Obs']],
    body: t4Rows.length > 0 ? t4Rows : [['-', '-', 'Sem movimentos', formatMoeda(0), '-']],
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 7.5 },
    bodyStyles: { fontSize: 7, cellPadding: 1.2 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 22 },
      2: { cellWidth: 65 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 'auto' },
    },
    foot: [['Subtotal (4) Créditos Banco', '', '', formatMoeda(total4), '']],
    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;
  if (currentY > 215) { doc.addPage(); currentY = 16; }

  // Resumo de Apuramento
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, pageWidth - 28, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('APURAMENTO FINAL DA CONCILIAÇÃO', 18, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('(Saldo Apurado = Saldo Banco + (1) - (2) + (3) - (4))', 85, currentY + 5.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Saldo Apurado:', 18, currentY + 12);
  doc.text(formatMoeda(rec.saldoApurado), 60, currentY + 12);

  doc.text('Saldo da Contabilidade:', 95, currentY + 12);
  doc.text(formatMoeda(rec.saldoContabilidade), 140, currentY + 12);

  const isConciliado = Math.abs(rec.diferencaConciliacao) < 0.01;
  doc.text('Diferença de Conciliação:', 18, currentY + 18.5);

  if (isConciliado) {
    doc.setTextColor(22, 101, 52); // green-800
    doc.text(`${formatMoeda(rec.diferencaConciliacao)} (CONCILIADO)`, 60, currentY + 18.5);
  } else {
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`${formatMoeda(rec.diferencaConciliacao)} (DIVERGÊNCIA)`, 60, currentY + 18.5);
  }

  currentY += 28;

  // Notas Explicativas se existirem
  if (rec.notasExplicativas) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 16;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('NOTAS EXPLICATIVAS / JUSTIFICAÇÃO DE DIVERGÊNCIAS:', 18, currentY);
    currentY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const splitText = doc.splitTextToSize(rec.notasExplicativas, pageWidth - 36);
    doc.text(splitText, 18, currentY);
    currentY += splitText.length * 3.2 + 6;
  }

  if (currentY > 250) {
    doc.addPage();
    currentY = 16;
  }

  // Signatures
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  // Elaborado por line
  doc.line(18, currentY + 12, 85, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Elaborado por:', 18, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(`${rec.elaboradoPor || '____________________'}`, 38, currentY + 16);

  // Aprovado por line
  doc.line(115, currentY + 12, 185, currentY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text('Aprovado por:', 115, currentY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(`${rec.aprovadoPor || '____________________'}`, 136, currentY + 16);

  const safeFilename = `Conciliacao_${empresa.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${rec.id}.pdf`;
  doc.save(safeFilename);
}
