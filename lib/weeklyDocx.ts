import { readFile } from "node:fs/promises";
import path from "node:path";
import { readZipEntries, writeZipEntries } from "@/lib/docxZip";
import { formatShortDateRange } from "@/lib/reporting";
import { type WeeklyDocxRow } from "@/lib/reportGenerator";

const TEMPLATE_PATH = path.join(process.cwd(), "templates", "weekly-report-template.docx");
const DOCUMENT_XML_PATH = "word/document.xml";
const MEMBERS_PER_BLOCK = 4;

type WeeklyDocxInput = {
  rows: WeeklyDocxRow[];
  lastWeekStart: string;
  lastWeekEnd: string;
  thisWeekStart: string;
  thisWeekEnd: string;
};

export async function buildWeeklyDocx(input: WeeklyDocxInput) {
  const template = await readFile(TEMPLATE_PATH).catch(() => null);

  if (!template) {
    throw new Error("주간 보고서 템플릿 파일을 찾을 수 없습니다.");
  }

  const entries = readZipEntries(template);
  const documentXml = entries.get(DOCUMENT_XML_PATH)?.toString("utf8");

  if (!documentXml) {
    throw new Error("주간 보고서 템플릿의 본문 XML을 찾을 수 없습니다.");
  }

  const updatedXml = updateDocumentXml(documentXml, input);
  entries.set(DOCUMENT_XML_PATH, Buffer.from(updatedXml, "utf8"));

  return writeZipEntries(entries);
}

export function updateDocumentXml(documentXml: string, input: WeeklyDocxInput) {
  const tables = [...documentXml.matchAll(/<w:tbl[\s\S]*?<\/w:tbl>/g)];

  if (tables.length < 2) {
    throw new Error("주간 보고서 템플릿에는 표가 2개 이상 필요합니다.");
  }

  const lastWeekTable = buildTableXml(tables[0][0], input.rows, "lastWeekText");
  const thisWeekTable = buildTableXml(tables[1][0], input.rows, "thisWeekText");
  let xml = documentXml;

  xml = replaceParagraphText(xml, "5/25 ~ 5/29", formatShortDateRange(input.lastWeekStart, input.lastWeekEnd));
  xml = replaceParagraphText(xml, "6/1 ~ 6/5", formatShortDateRange(input.thisWeekStart, input.thisWeekEnd));
  xml = xml.slice(0, tables[1].index) + thisWeekTable + xml.slice(tables[1].index + tables[1][0].length);
  xml = xml.slice(0, tables[0].index) + lastWeekTable + xml.slice(tables[0].index + tables[0][0].length);

  return xml;
}

function buildTableXml(templateTableXml: string, rows: WeeklyDocxRow[], field: "lastWeekText" | "thisWeekText") {
  const rowTemplates = [...templateTableXml.matchAll(/<w:tr[\s\S]*?<\/w:tr>/g)];

  if (rowTemplates.length < 2) {
    throw new Error("주간 보고서 템플릿 표에는 이름 행과 내용 행이 필요합니다.");
  }

  const tablePrefix = templateTableXml.slice(0, rowTemplates[0].index);
  const tableSuffix = templateTableXml.slice(
    rowTemplates[rowTemplates.length - 1].index + rowTemplates[rowTemplates.length - 1][0].length,
  );
  const nameTemplate = rowTemplates[0][0];
  const contentTemplate = rowTemplates[1][0];
  const blocks: string[] = [];

  for (let index = 0; index < Math.max(rows.length, 1); index += MEMBERS_PER_BLOCK) {
    const chunk = rows.slice(index, index + MEMBERS_PER_BLOCK);
    const padded = [
      ...chunk,
      ...Array.from({ length: MEMBERS_PER_BLOCK - chunk.length }, () => ({
        userName: "",
        lastWeekText: "",
        thisWeekText: "",
      })),
    ];

    blocks.push(
      fillTableRow(nameTemplate, padded.map((row) => row.userName)),
      fillTableRow(contentTemplate, padded.map((row) => row[field])),
    );
  }

  return `${tablePrefix}${blocks.join("")}${tableSuffix}`;
}

function fillTableRow(rowXml: string, values: string[]) {
  const cells = [...rowXml.matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)];

  if (cells.length < MEMBERS_PER_BLOCK) {
    throw new Error("주간 보고서 템플릿 표는 4열이어야 합니다.");
  }

  let updated = rowXml;

  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index];
    const value = values[index] ?? "";
    const replacement = replaceCellText(cell[0], value);

    updated = updated.slice(0, cell.index) + replacement + updated.slice(cell.index + cell[0].length);
  }

  return updated;
}

function replaceCellText(cellXml: string, value: string) {
  const tcPr = cellXml.match(/<w:tcPr[\s\S]*?<\/w:tcPr>/)?.[0] ?? "";
  const paragraphs = value
    .split(/\r?\n/)
    .map((line) => buildParagraph(line))
    .join("");

  return `<w:tc>${tcPr}${paragraphs || buildParagraph("")}</w:tc>`;
}

function buildParagraph(value: string) {
  const preserve = value.trim() === value ? "" : ' xml:space="preserve"';

  return `<w:p><w:r><w:t${preserve}>${escapeXml(value)}</w:t></w:r></w:p>`;
}

function replaceParagraphText(xml: string, currentText: string, nextText: string) {
  const escapedCurrentText = escapeRegExp(currentText);
  const pattern = new RegExp(
    `<w:p([^>]*)>(?:(?!<\\/w:p>)[\\s\\S])*?<w:t[^>]*>${escapedCurrentText}<\\/w:t>(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>`,
  );

  return xml.replace(pattern, `<w:p$1><w:r><w:t>${escapeXml(nextText)}</w:t></w:r></w:p>`);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
