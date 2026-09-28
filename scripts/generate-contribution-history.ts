import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomInt } from "node:crypto";

// Keep these settings at the top so a demo/test run can be configured without
// changing the date-generation or Git execution code below.
export const TOTAL_COMMITS = 100;
export const MONTHS_BACK = 3;
export const DRY_RUN = true;
export const PUSH_AFTER_SUCCESS = false;

const TARGET_FILE = "scripts/contribution-history.txt";
const COMMIT_MESSAGES = [
  "chore: refresh maintenance checkpoint",
  "docs: record project maintenance",
  "chore: update activity log",
  "docs: add maintenance note",
];

export type CommitPlan = {
  date: Date;
  commitCount: number;
};

type RandomInt = (maxExclusive: number) => number;

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cloneDate(date: Date): Date {
  return new Date(date.getTime());
}

export function getDateRange(today: Date, monthsBack: number): { start: Date; end: Date } {
  if (!Number.isInteger(monthsBack) || monthsBack < 1) {
    throw new Error("MONTHS_BACK must be a positive integer.");
  }

  // Treat the current partial month as one calendar month. For example, with
  // MONTHS_BACK=3 on September 28, the window is July 1 through September 28.
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(today.getFullYear(), today.getMonth() - (monthsBack - 1), 1);
  return { start, end };
}

export function enumerateEligibleDates(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = cloneDate(start);

  while (current <= end) {
    // JavaScript's getDay() returns 0 for Sunday. Monday (1) through Saturday
    // (6) are the only dates eligible for generated activity.
    if (current.getDay() !== 0) {
      dates.push(cloneDate(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function chooseInt(min: number, max: number, random: RandomInt): number {
  if (min > max) {
    throw new Error(`Invalid random range: ${min}..${max}`);
  }
  return min + random(max - min + 1);
}

function shuffle<T>(items: T[], random: RandomInt): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random(index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function allocateCommits(totalCommits: number, activeDays: number, random: RandomInt): number[] {
  const counts = Array.from({ length: activeDays }, () => 1);
  let remaining = totalCommits - activeDays;

  while (remaining > 0) {
    counts[random(activeDays)] += 1;
    remaining -= 1;
  }

  // Avoid a perfectly flat allocation whenever there are enough commits to do
  // so. The adjustment keeps every active day at one or more commits.
  if (activeDays > 1 && totalCommits > activeDays && new Set(counts).size === 1) {
    counts[0] -= 1;
    counts[1] += 1;
  }

  return shuffle(counts, random);
}

export function createSchedule(
  totalCommits: number,
  monthsBack: number,
  today = new Date(),
  random: RandomInt = (maxExclusive) => randomInt(maxExclusive),
): CommitPlan[] {
  if (!Number.isInteger(totalCommits) || totalCommits < 0) {
    throw new Error("TOTAL_COMMITS must be a non-negative integer.");
  }
  if (totalCommits === 0) {
    return [];
  }

  const { start, end } = getDateRange(today, monthsBack);
  const eligibleDates = enumerateEligibleDates(start, end);
  if (eligibleDates.length === 0) {
    throw new Error("The configured date range contains no Monday-Saturday dates.");
  }

  // Use a randomized fraction of available weekdays. The upper bound leaves
  // room for varied per-day counts when TOTAL_COMMITS is greater than one.
  const maxActiveDays = Math.min(
    eligibleDates.length,
    totalCommits > 1 ? totalCommits - 1 : 1,
  );
  const naturalMinimum = Math.max(1, Math.floor(eligibleDates.length * 0.45));
  const naturalMaximum = Math.max(naturalMinimum, Math.ceil(eligibleDates.length * 0.75));
  const minimumActiveDays = Math.min(maxActiveDays, naturalMinimum);
  const maximumActiveDays = Math.min(maxActiveDays, naturalMaximum);
  const activeDays = chooseInt(minimumActiveDays, maximumActiveDays, random);
  const selectedDates = shuffle(eligibleDates, random)
    .slice(0, activeDays)
    .sort((left, right) => left.getTime() - right.getTime());
  const commitsPerDay = allocateCommits(totalCommits, activeDays, random);

  return selectedDates.map((date, index) => ({
    date,
    commitCount: commitsPerDay[index],
  }));
}

function formatGitDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const timezoneMinutes = date.getTimezoneOffset();
  const timezoneSign = timezoneMinutes <= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(timezoneMinutes);
  const timezone = `${timezoneSign}${pad(Math.floor(absoluteMinutes / 60))}:${pad(absoluteMinutes % 60)}`;

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${timezone}`;
}

function dateWithRandomTime(date: Date, random: RandomInt): Date {
  const result = cloneDate(date);
  // Daytime hours make the resulting activity less uniform than midnight-only
  // timestamps while keeping all commits on their selected calendar date.
  result.setHours(9 + random(11), random(60), random(60), 0);
  return result;
}

function runGit(args: string[], repositoryRoot: string, options: { env?: NodeJS.ProcessEnv } = {}): string {
  try {
    return execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const gitError = error as { stdout?: string; stderr?: string; message?: string };
    const details = [gitError.stderr, gitError.stdout, gitError.message]
      .filter(Boolean)
      .join("\n")
      .trim();
    throw new Error(`git ${args.join(" ")} failed${details ? `: ${details}` : "."}`);
  }
}

function getRepositoryRoot(): string {
  try {
    return runGit(["rev-parse", "--show-toplevel"], process.cwd());
  } catch {
    throw new Error("This script must be run from inside a Git repository.");
  }
}

function getRemote(repositoryRoot: string): string {
  const remote = runGit(["remote"], repositoryRoot)
    .split("\n")
    .map((value) => value.trim())
    .find(Boolean);
  if (!remote) {
    throw new Error("No Git remote is configured. Add a remote before running the generator.");
  }
  return remote;
}

function assertTargetFileIsUsable(repositoryRoot: string, requireTracked: boolean): string {
  const targetPath = resolve(repositoryRoot, TARGET_FILE);
  const relativeTarget = relative(repositoryRoot, targetPath);
  if (!relativeTarget || relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) {
    throw new Error("The contribution target must be a file inside the repository.");
  }

  let isIgnored = false;
  try {
    runGit(["check-ignore", "--no-index", "--quiet", "--", relativeTarget], repositoryRoot);
    isIgnored = true;
  } catch {
    // A non-zero exit means the target is not ignored, which is what we want.
  }
  if (isIgnored) {
    throw new Error(`The contribution target is ignored by Git: ${relativeTarget}`);
  }

  if (requireTracked) {
    if (!existsSync(targetPath)) {
      throw new Error(`The contribution target does not exist: ${relativeTarget}`);
    }
    try {
      runGit(["ls-files", "--error-unmatch", "--", relativeTarget], repositoryRoot);
    } catch {
      throw new Error(`The contribution target must already be tracked: ${relativeTarget}`);
    }
  }

  return targetPath;
}

function assertCleanWorktree(repositoryRoot: string): void {
  const status = runGit(["status", "--porcelain", "--untracked-files=all"], repositoryRoot);
  if (status) {
    throw new Error("The worktree must be clean before real commit generation begins.");
  }
}

function printSchedule(
  schedule: CommitPlan[],
  start: Date,
  end: Date,
  totalCommits: number,
  dryRun: boolean,
): void {
  const label = dryRun ? "DRY RUN" : "PLAN";
  const scheduledCommits = schedule.reduce((sum, day) => sum + day.commitCount, 0);
  console.log(`[${label}] Window: ${formatDateOnly(start)} through ${formatDateOnly(end)}`);
  console.log(`[${label}] Eligible days: Monday-Saturday only; Sundays excluded`);
  console.log(`[${label}] Commits: ${scheduledCommits}/${totalCommits} across ${schedule.length} active day(s)`);
  for (const day of schedule) {
    console.log(`[${label}] ${formatDateOnly(day.date)} (${day.date.toLocaleDateString("en-US", { weekday: "long" })}): ${day.commitCount} commit(s)`);
  }
}

function appendContributionEntry(targetPath: string, message: string, commitNumber: number, totalCommits: number, date: Date): void {
  const existing = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  appendFileSync(
    targetPath,
    `${separator}[${formatGitDate(date)}] ${message} (${commitNumber}/${totalCommits})\n`,
  );
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run") || (!args.has("--execute") && DRY_RUN);
  const pushAfterSuccess = !dryRun && (args.has("--push") || PUSH_AFTER_SUCCESS);
  const random: RandomInt = (maxExclusive) => randomInt(maxExclusive);
  const repositoryRoot = getRepositoryRoot();
  const remote = getRemote(repositoryRoot);
  const targetPath = assertTargetFileIsUsable(repositoryRoot, !dryRun);
  const { start, end } = getDateRange(new Date(), MONTHS_BACK);
  const schedule = createSchedule(TOTAL_COMMITS, MONTHS_BACK, new Date(), random);

  console.log(`[INFO] Repository: ${repositoryRoot}`);
  console.log(`[INFO] Remote: ${remote}`);
  printSchedule(schedule, start, end, TOTAL_COMMITS, dryRun);

  if (dryRun) {
    console.log(`[DRY RUN] No files, commits, or pushes were changed.`);
    return;
  }

  assertCleanWorktree(repositoryRoot);

  let commitNumber = 0;
  try {
    for (const day of schedule) {
      if (day.date.getDay() === 0) {
        throw new Error(`Refusing to create activity on Sunday: ${formatDateOnly(day.date)}`);
      }

      for (let dayCommit = 0; dayCommit < day.commitCount; dayCommit += 1) {
        commitNumber += 1;
        const commitDate = dateWithRandomTime(day.date, random);
        const message = COMMIT_MESSAGES[random(COMMIT_MESSAGES.length)];
        appendContributionEntry(targetPath, message, commitNumber, TOTAL_COMMITS, commitDate);
        runGit(["add", "--", relative(repositoryRoot, targetPath)], repositoryRoot);
        runGit(
          ["commit", "-m", `${message} (${commitNumber}/${TOTAL_COMMITS})`],
          repositoryRoot,
          {
            env: {
              ...process.env,
              GIT_AUTHOR_DATE: formatGitDate(commitDate),
              GIT_COMMITTER_DATE: formatGitDate(commitDate),
            },
          },
        );
      }
    }
  } catch (error) {
    console.error(`[ERROR] Commit generation stopped after ${commitNumber} commit(s). No push was attempted.`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  if (pushAfterSuccess) {
    try {
      runGit(["push", remote, "HEAD"], repositoryRoot);
      console.log(`[INFO] Pushed ${commitNumber} commit(s) to ${remote}.`);
    } catch (error) {
      console.error(`[ERROR] All commits were created, but the push failed.`);
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  } else {
    console.log(`[INFO] Created ${commitNumber} commit(s). Push was not requested.`);
  }
}

const invokedScript = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedScript) {
  main();
}
