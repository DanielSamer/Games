import mammoth from "mammoth";
import type { ChaserQuestion } from "../types/chaser";

export interface ParsedChaserImport {
  /** Successfully parsed questions, ready to append to a game. */
  questions: ChaserQuestion[];
  /** Lines that could not be parsed (no question/answer separator). */
  warnings: string[];
}

// Matches Arabic script ranges so we can route text to the right language slot.
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Keep latin letters/digits and arabic letters; collapse the rest to dashes.
      .replace(/[^a-z0-9؀-ۿ]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "question"
  );
}

/**
 * Finds the boundary between a question and its answer: the first question
 * mark (Latin `?` or Arabic `؟`). Everything up to and including it is the
 * question; the remainder is the answer.
 */
function splitQuestionAnswer(line: string): { question: string; answer: string } | null {
  let idx = -1;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "?" || line[i] === "؟") {
      idx = i;
      break;
    }
  }
  if (idx === -1 || idx === line.length - 1) return null;

  const question = line.slice(0, idx + 1).trim();
  // Strip a trailing stray question mark from answers like "Microsoft?".
  const answer = line
    .slice(idx + 1)
    .trim()
    .replace(/[?؟]+$/, "")
    .trim();

  if (!question || !answer) return null;
  return { question, answer };
}

/**
 * Turns the raw text of a Word document into chaser questions.
 *
 * Expected format: one question per paragraph, written as
 * `Question text? Answer`. Blank lines are ignored. The language of each line
 * is auto-detected — lines containing Arabic characters fill the `ar` slot,
 * everything else fills `en` — so a single importer handles both languages.
 */
export function parseChaserLines(text: string): ParsedChaserImport {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const questions: ChaserQuestion[] = [];
  const warnings: string[] = [];

  lines.forEach((line, i) => {
    const parts = splitQuestionAnswer(line);
    if (!parts) {
      warnings.push(line);
      return;
    }

    const isArabic = ARABIC.test(line);
    const question: ChaserQuestion["question"] = {};
    const answer: ChaserQuestion["answer"] = {};
    if (isArabic) {
      question.ar = parts.question;
      answer.ar = parts.answer;
    } else {
      question.en = parts.question;
      answer.en = parts.answer;
    }

    // Index + timestamp keeps ids unique even for identical questions.
    const id = `${slugify(parts.question)}-${Date.now().toString(36)}-${i}`;
    questions.push({ id, question, answer });
  });

  return { questions, warnings };
}

/** Reads a .docx File, extracts its text, and parses it into questions. */
export async function parseChaserDocx(file: File): Promise<ParsedChaserImport> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return parseChaserLines(result.value);
}
