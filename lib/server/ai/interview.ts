// AI interview (T103, FR-INT-01/02). All writes go through the database
// functions in 0019, which check ownership and the turn order themselves;
// reads follow RLS (the student, and the mentors of their batch).

import { getMyMentee } from "@/lib/server/academy-people/service";
import { feedbackState } from "@/lib/server/ai/feedback";
import { getActor } from "@/lib/server/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { mapDbError, type ServiceResult } from "@/lib/server/users/service";
import { isUuid } from "@/lib/server/users/validation";
import { PIQ_FIELDS } from "@/lib/practice/piq-questions";
import type { FollowUpType, InterviewMode, InterviewSummary, InterviewTopic, InterviewTurn, InterviewView } from "@/types/interview";

type Row = Record<string, unknown>;
const MODES: InterviewMode[] = ["guided", "topic", "mock"];
const FOLLOW_UPS: FollowUpType[] = ["clarification", "evidence", "depth", "consistency", "reflection"];
const KINDS: InterviewTurn["kind"][] = ["opening", "follow_up", "new_topic", "bank"];
export const MAX_ANSWER = 3000;
const NOT_FOUND = "That interview isn't available.";
const fail = <T>(code: "unauthorized" | "not_found" | "validation_error", message: string): ServiceResult<T> => ({ ok: false, error: { code, message } });
const str = (v: unknown, max = 3000) => (typeof v === "string" ? v.slice(0, max) : "");

async function student() {
  const a = await getActor();
  return a && a.profile.role === "student" ? a : null;
}

/** Only known PIQ fields, trimmed and capped — the student chose to share these for this session. */
export function cleanPiqContext(raw: unknown): Record<string, string> {
  if (typeof raw !== "object" || raw === null) return {};
  const r = raw as Row;
  return Object.fromEntries(PIQ_FIELDS.flatMap(({ key }) => (typeof r[key] === "string" && (r[key] as string).trim() ? [[key, (r[key] as string).trim().slice(0, 200)]] : [])));
}

export function toTurn(r: Row): InterviewTurn | null {
  if (typeof r.id !== "string" || typeof r.question !== "string" || !KINDS.includes(r.kind as InterviewTurn["kind"])) return null;
  return {
    id: r.id,
    seq: Number(r.seq) || 0,
    question: r.question,
    kind: r.kind as InterviewTurn["kind"],
    followUpType: FOLLOW_UPS.includes(r.follow_up_type as FollowUpType) ? (r.follow_up_type as FollowUpType) : null,
    answer: typeof r.answer === "string" ? r.answer : null,
    answeredAt: typeof r.answered_at === "string" ? r.answered_at : null,
  };
}

export async function listTopics(): Promise<ServiceResult<InterviewTopic[]>> {
  if (!(await getActor())) return fail("unauthorized", "Please sign in again.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("interview_topics").select("slug, title").order("position");
  if (error) return mapDbError(error, "We couldn't load interview topics. Please try again.");
  return { ok: true, data: ((data ?? []) as Row[]).map((t) => ({ slug: str(t.slug, 40), title: str(t.title, 80) })) };
}

export async function startInterview(mode: unknown, topic: unknown, piq: unknown): Promise<ServiceResult<{ id: string }>> {
  if (!(await student())) return fail("unauthorized", "Only a student can start an interview.");
  if (!MODES.includes(mode as InterviewMode)) return fail("validation_error", "Choose a kind of interview.");
  if (mode === "topic" && (typeof topic !== "string" || !/^[a-z0-9-]{2,40}$/.test(topic))) return fail("validation_error", "Choose a topic.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_interview_session", { p_mode: mode, p_topic: mode === "topic" ? topic : null, p_context: cleanPiqContext(piq) });
  if (error) return mapDbError(error, "We couldn't start the interview. Please try again.");
  return { ok: true, data: { id: String(data) } };
}

export async function answerTurn(turnId: string, answer: unknown): Promise<ServiceResult<null>> {
  if (!(await student())) return fail("unauthorized", "Only a student can answer.");
  if (!isUuid(turnId)) return fail("not_found", NOT_FOUND);
  if (typeof answer !== "string" || answer.length > MAX_ANSWER) return fail("validation_error", `Answers can be up to ${MAX_ANSWER} characters.`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_interview_turn", { p_turn: turnId, p_answer: answer });
  if (error?.code === "23514") return fail("validation_error", "This question is already answered. Reload to continue.");
  if (error) return mapDbError(error, "We couldn't save your answer. It's still here — please try again.");
  return { ok: true, data: null };
}

export async function skipWait(sessionId: string): Promise<ServiceResult<null>> {
  if (!(await student())) return fail("unauthorized", "Only a student can do that.");
  if (!isUuid(sessionId)) return fail("not_found", NOT_FOUND);
  const supabase = await createClient();
  const { error } = await supabase.rpc("skip_interview_wait", { p_session: sessionId });
  if (error) return mapDbError(error, "We couldn't move on. Please try again.");
  return { ok: true, data: null };
}

async function loadInterview(sessionId: string, studentId: string): Promise<ServiceResult<InterviewView>> {
  const supabase = await createClient();
  const { data: s, error } = await supabase.from("interview_sessions").select("id, mode, topic_slug, max_questions, status, created_at, topic:interview_topics(title)").eq("id", sessionId).eq("student_id", studentId).maybeSingle();
  if (error) return mapDbError(error, "We couldn't load this interview. Please try again.");
  if (!s || !MODES.includes(s.mode as InterviewMode)) return fail("not_found", NOT_FOUND);
  const [turns, jobs, evaluations] = await Promise.all([
    supabase.from("interview_turns").select("id, seq, question, kind, follow_up_type, answer, answered_at").eq("session_id", sessionId).order("seq"),
    supabase.from("ai_jobs").select("status").eq("subject_type", "interview_session").eq("subject_id", sessionId).limit(1),
    supabase.from("ai_evaluations").select("dimensions, feedback, overall_confidence, created_at").eq("subject_type", "interview_session").eq("subject_id", sessionId).limit(1),
  ]);
  const failed = turns.error ?? jobs.error ?? evaluations.error;
  if (failed) return mapDbError(failed, "We couldn't load this interview. Please try again.");
  const list = ((turns.data ?? []) as Row[]).map(toTurn).filter((t): t is InterviewTurn => t !== null);
  const last = list[list.length - 1];
  const topic = Array.isArray(s.topic) ? (s.topic[0] as Row | undefined) : (s.topic as Row | null);
  return {
    ok: true,
    data: {
      id: s.id,
      mode: s.mode as InterviewMode,
      topic: topic ? str(topic.title, 80) : null,
      maxQuestions: Number(s.max_questions) || 5,
      status: s.status === "completed" ? "completed" : "active",
      createdAt: str(s.created_at, 40),
      turns: list,
      waitingSince: s.status === "active" && last?.answeredAt ? last.answeredAt : null,
      feedback: s.status === "completed" ? feedbackState(((jobs.data ?? []) as Row[])[0], ((evaluations.data ?? []) as Row[])[0]) : { status: "none" },
    },
  };
}

export async function getMyInterview(sessionId: string): Promise<ServiceResult<InterviewView>> {
  const me = await student();
  if (!me) return fail("unauthorized", "Only a student can open their interview.");
  if (!isUuid(sessionId)) return fail("not_found", NOT_FOUND);
  return loadInterview(sessionId, me.id);
}

export async function getMenteeInterview(studentId: string, sessionId: string): Promise<ServiceResult<InterviewView>> {
  if (!isUuid(sessionId)) return fail("not_found", NOT_FOUND);
  const scope = await getMyMentee(studentId);
  if (!scope.ok) return scope as ServiceResult<never>;
  return loadInterview(sessionId, studentId);
}

async function listFor(studentId: string, limit: number): Promise<ServiceResult<InterviewSummary[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("id, mode, max_questions, status, created_at, topic:interview_topics(title), turns:interview_turns(answered_at)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) return mapDbError(error, "We couldn't load interviews. Please try again.");
  const sessions = (data ?? []) as Row[];
  const ids = sessions.map((s) => s.id as string);
  const [jobs, evaluations] = ids.length
    ? await Promise.all([
        supabase.from("ai_jobs").select("subject_id, status").eq("subject_type", "interview_session").in("subject_id", ids),
        supabase.from("ai_evaluations").select("subject_id, dimensions, feedback, overall_confidence, created_at").eq("subject_type", "interview_session").in("subject_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  const jobBy = new Map(((jobs.data ?? []) as Row[]).map((j) => [j.subject_id as string, j]));
  const evalBy = new Map(((evaluations.data ?? []) as Row[]).map((e) => [e.subject_id as string, e]));
  return {
    ok: true,
    data: sessions.flatMap((s): InterviewSummary[] => {
      if (!MODES.includes(s.mode as InterviewMode)) return [];
      const topic = Array.isArray(s.topic) ? (s.topic[0] as Row | undefined) : (s.topic as Row | null);
      const completed = s.status === "completed";
      return [{
        id: s.id as string,
        mode: s.mode as InterviewMode,
        topic: topic ? str(topic.title, 80) : null,
        status: completed ? "completed" : "active",
        answered: Array.isArray(s.turns) ? (s.turns as Row[]).filter((t) => t.answered_at).length : 0,
        maxQuestions: Number(s.max_questions) || 5,
        createdAt: str(s.created_at, 40),
        feedback: completed ? feedbackState(jobBy.get(s.id as string), evalBy.get(s.id as string)).status : "none",
      }];
    }),
  };
}

export async function getMyInterviews(limit = 10): Promise<ServiceResult<InterviewSummary[]>> {
  const me = await student();
  if (!me) return fail("unauthorized", "Only a student has interviews.");
  return listFor(me.id, limit);
}

export async function getMenteeInterviews(studentId: string, limit = 10): Promise<ServiceResult<InterviewSummary[]>> {
  const scope = await getMyMentee(studentId);
  if (!scope.ok) return scope as ServiceResult<never>;
  return listFor(studentId, limit);
}
