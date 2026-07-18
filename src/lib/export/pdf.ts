import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  AttributeDefinition,
  Club,
  Match,
  Player,
  PlayerReport,
  TeamReport,
} from "../types";
import {
  BERICHTSART_LABELS,
  BEZUGSTYP_LABELS,
  EMPFEHLUNG_LABELS,
} from "../types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE");
}

function addHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 14, 26);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 30, 196, 30);
}

export function exportPlayerReportPdf(
  report: PlayerReport,
  player: Player,
  attributes: AttributeDefinition[],
  match?: Match
): void {
  const doc = new jsPDF();
  addHeader(
    doc,
    `Scouting-Bericht: ${player.vorname} ${player.nachname}`,
    `${BEZUGSTYP_LABELS[report.bezugstyp]} · ${formatDate(report.datum)}${
      match ? ` · ${match.heimClubName} vs. ${match.gastClubName}` : ""
    }`
  );

  let y = 38;
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  if (report.positionBeobachtet) {
    doc.text(`Beobachtete Position: ${report.positionBeobachtet}`, 14, y);
    y += 7;
  }
  if (report.empfehlung) {
    doc.text(`Empfehlung: ${EMPFEHLUNG_LABELS[report.empfehlung]}`, 14, y);
    y += 7;
  }
  if (report.gesamtbewertung) {
    doc.text(`Gesamtbewertung: ${report.gesamtbewertung}/10`, 14, y);
    y += 7;
  }

  y += 4;
  const ratingRows = report.ratings.map((r) => {
    const def = attributes.find((a) => a.key === r.attributeKey);
    return [def?.name ?? r.attributeKey, `${r.value}/${def?.skalaMax ?? 10}`];
  });
  if (ratingRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Kategorie", "Bewertung"]],
      body: ratingRows,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42] },
    });
    // @ts-expect-error - lastAutoTable wird vom Plugin zur Laufzeit ergänzt
    y = doc.lastAutoTable.finalY + 8;
  }

  const addTextBlock = (label: string, value?: string) => {
    if (!value) return;
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, 180);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 4;
  };

  addTextBlock("Stärken", report.staerken);
  addTextBlock("Schwächen", report.schwaechen);
  addTextBlock("Notizen", report.freitextNotizen);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Erstellt: ${formatDate(report.createdAt)} · Fussball Scouting App`,
    14,
    287
  );

  doc.save(`spieler-bericht-${player.nachname}-${formatDate(report.datum)}.pdf`);
}

export function exportTeamReportPdf(
  report: TeamReport,
  club: Club,
  match?: Match
): void {
  const doc = new jsPDF();
  addHeader(
    doc,
    `Team-Bericht: ${club.name}`,
    `${BERICHTSART_LABELS[report.berichtsart]} · ${BEZUGSTYP_LABELS[report.bezugstyp]} · ${formatDate(
      report.datum
    )}${match ? ` · ${match.heimClubName} vs. ${match.gastClubName}` : ""}`
  );

  let y = 38;
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  if (report.formation) {
    doc.text(`Formation: ${report.formation}`, 14, y);
    y += 8;
  }

  const addTextBlock = (label: string, value?: string) => {
    if (!value) return;
    doc.setFont("helvetica", "bold");
    doc.text(label, 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, 180);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 4;
  };

  addTextBlock("Spielstil", report.spielstil);
  addTextBlock("Standardsituationen", report.standardsituationen);
  addTextBlock("Stärken", report.staerken);
  addTextBlock("Schwächen", report.schwaechen);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Erstellt: ${formatDate(report.createdAt)} · Fussball Scouting App`,
    14,
    287
  );

  doc.save(`team-bericht-${club.name}-${formatDate(report.datum)}.pdf`);
}
