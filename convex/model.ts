import type { Id, Doc } from "./_generated/dataModel";

const MAX_NAME_LENGTH = 100;
const MAX_TEXT_LENGTH = 500;
const MAX_ROUNDS = 50;
const MAX_ANSWERS_PER_ROUND = 20;
const MAX_QUESTIONS = 300;

export async function getOwnedGame<Table extends "games" | "chaserGames">(
  ctx: { db: { get: (id: Id<Table>) => Promise<Doc<Table> | null> } },
  userId: Id<"users"> | null,
  gameId: Id<Table>,
): Promise<Doc<Table>> {
  const game = await ctx.db.get(gameId);
  if (!userId || !game || game.ownerId !== userId) throw new Error("Not found");
  return game;
}

export function assertValidName(name: string) {
  if (name.trim().length === 0) throw new Error("Name cannot be empty");
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Name cannot exceed ${MAX_NAME_LENGTH} characters`);
  }
}

function assertValidLocalizedText(text: { en?: string; ar?: string }, field: string) {
  if ((text.en?.length ?? 0) > MAX_TEXT_LENGTH || (text.ar?.length ?? 0) > MAX_TEXT_LENGTH) {
    throw new Error(`${field} cannot exceed ${MAX_TEXT_LENGTH} characters`);
  }
}

export function assertValidRounds(rounds: Doc<"games">["rounds"]) {
  if (rounds.length > MAX_ROUNDS) {
    throw new Error(`A game cannot have more than ${MAX_ROUNDS} rounds`);
  }
  for (const round of rounds) {
    assertValidLocalizedText(round.question, "Question text");
    if (round.answers.length > MAX_ANSWERS_PER_ROUND) {
      throw new Error(`A round cannot have more than ${MAX_ANSWERS_PER_ROUND} answers`);
    }
    for (const answer of round.answers) {
      assertValidLocalizedText(answer.text, "Answer text");
    }
  }
}

export function assertValidQuestions(questions: Doc<"chaserGames">["questions"]) {
  if (questions.length > MAX_QUESTIONS) {
    throw new Error(`A game cannot have more than ${MAX_QUESTIONS} questions`);
  }
  for (const question of questions) {
    assertValidLocalizedText(question.question, "Question text");
    assertValidLocalizedText(question.answer, "Answer text");
  }
}
