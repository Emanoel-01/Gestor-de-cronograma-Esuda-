import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function mapTeacherFromDb(row: any) {
  if (!row) return row;
  return {
    ...row,
    photoUrl: row.photo_url ?? row.photoUrl,
    hasSubmitted: row.has_submitted ?? row.hasSubmitted,
    createdAt: row.created_at ?? row.createdAt,
  };
}

export function mapTeacherToDb(data: any) {
  const payload: any = { ...data };
  if ('photoUrl' in payload) { payload.photo_url = payload.photoUrl; delete payload.photoUrl; }
  if ('hasSubmitted' in payload) { payload.has_submitted = payload.hasSubmitted; delete payload.hasSubmitted; }
  return payload;
}

export function mapCourseFromDb(row: any) {
  if (!row) return row;
  return {
    ...row,
    marketingSummary: row.marketing_summary ?? row.marketingSummary,
    fullDescription: row.full_description ?? row.fullDescription,
    imageUrl: row.image_url ?? row.imageUrl,
    classDays: row.class_days ?? row.classDays,
    classTime: row.class_time ?? row.classTime,
    enrollmentPeriod: row.enrollment_period ?? row.enrollmentPeriod,
    startDateInfo: row.start_date_info ?? row.startDateInfo,
    enrollmentStatus: row.enrollment_status ?? row.enrollmentStatus,
    websiteUrl: row.website_url ?? row.websiteUrl,
    specificDisciplines: row.specific_disciplines ?? row.specificDisciplines,
  };
}

export function mapCourseToDb(data: any) {
  const payload: any = { ...data };
  if ('marketingSummary' in payload) { payload.marketing_summary = payload.marketingSummary; delete payload.marketingSummary; }
  if ('fullDescription' in payload) { payload.full_description = payload.fullDescription; delete payload.fullDescription; }
  if ('imageUrl' in payload) { payload.image_url = payload.imageUrl; delete payload.imageUrl; }
  if ('classDays' in payload) { payload.class_days = payload.classDays; delete payload.classDays; }
  if ('classTime' in payload) { payload.class_time = payload.classTime; delete payload.classTime; }
  if ('enrollmentPeriod' in payload) { payload.enrollment_period = payload.enrollmentPeriod; delete payload.enrollmentPeriod; }
  if ('startDateInfo' in payload) { payload.start_date_info = payload.startDateInfo; delete payload.startDateInfo; }
  if ('enrollmentStatus' in payload) { payload.enrollment_status = payload.enrollmentStatus; delete payload.enrollmentStatus; }
  if ('websiteUrl' in payload) { payload.website_url = payload.websiteUrl; delete payload.websiteUrl; }
  if ('specificDisciplines' in payload) { payload.specific_disciplines = payload.specificDisciplines; delete payload.specificDisciplines; }
  return payload;
}

export function mapScheduleFromDb(row: any) {
  if (!row) return row;
  return {
    ...row,
    courseIds: row.course_ids ?? row.courseIds,
    className: row.class_name ?? row.className,
    startDate: row.start_date ?? row.startDate,
    createdAt: row.created_at ?? row.createdAt,
    lastUpdated: row.last_updated ?? row.lastUpdated,
  };
}

export function mapScheduleToDb(data: any) {
  const payload: any = { ...data };
  if ('courseIds' in payload) { payload.course_ids = payload.courseIds; delete payload.courseIds; }
  if ('className' in payload) { payload.class_name = payload.className; delete payload.className; }
  if ('startDate' in payload) { payload.start_date = payload.startDate; delete payload.startDate; }
  if ('createdAt' in payload) { payload.created_at = payload.createdAt; delete payload.createdAt; }
  if ('lastUpdated' in payload) { payload.last_updated = payload.lastUpdated; delete payload.lastUpdated; }
  return payload;
}

export function mapCommonDisciplineFromDb(row: any) {
  if (!row) return row;
  return {
    ...row,
    courseIds: row.course_ids ?? row.courseIds,
  };
}

export function mapCommonDisciplineToDb(data: any) {
  const payload: any = { ...data };
  if ('courseIds' in payload) { payload.course_ids = payload.courseIds; delete payload.courseIds; }
  return payload;
}

export function mapClassFromDb(row: any) {
  if (!row) return row;
  return {
    ...row,
    scheduleId: row.schedule_id ?? row.scheduleId,
    disciplineName: row.discipline_name ?? row.disciplineName,
    teacherId: row.teacher_id ?? row.teacherId,
    courseId: row.course_id ?? row.courseId,
    courseName: row.course_name ?? row.courseName,
    classNumber: row.class_number ?? row.classNumber,
    isCommon: row.is_common ?? row.isCommon,
  };
}

export function mapClassToDb(data: any) {
  const payload: any = { ...data };
  if ('scheduleId' in payload) { payload.schedule_id = payload.scheduleId; delete payload.scheduleId; }
  if ('disciplineName' in payload) { payload.discipline_name = payload.disciplineName; delete payload.disciplineName; }
  if ('teacherId' in payload) { payload.teacher_id = payload.teacherId; delete payload.teacherId; }
  if ('courseId' in payload) { payload.course_id = payload.courseId; delete payload.courseId; }
  if ('courseName' in payload) { payload.course_name = payload.courseName; delete payload.courseName; }
  if ('classNumber' in payload) { payload.class_number = payload.classNumber; delete payload.classNumber; }
  if ('isCommon' in payload) { payload.is_common = payload.isCommon; delete payload.isCommon; }
  return payload;
}

export function mapTeacherSubmissionFromDb(row: any) {
  if (!row) return row;
  return {
    ...row,
    submittedAt: row.submitted_at ?? row.submittedAt,
  };
}

export function mapTeacherSubmissionToDb(data: any) {
  const payload: any = { ...data };
  if ('submittedAt' in payload) { payload.submitted_at = payload.submittedAt; delete payload.submittedAt; }
  return payload;
}

