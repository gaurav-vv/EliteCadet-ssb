// The curated Resources section is shown to two audiences from the same pages and the same content: students
// (/student/resources) and academy admins (/academy/resources). The platform admin is the only one who
// provides resources, so an academy admin sees exactly what students see, read-only. Every link inside the
// shared pages is built from this base so each audience stays inside its own workspace shell.

export type ResourceAudience = "student" | "academy";

export function resourcesBase(audience: ResourceAudience = "student"): string {
  return audience === "academy" ? "/academy/resources" : "/student/resources";
}
