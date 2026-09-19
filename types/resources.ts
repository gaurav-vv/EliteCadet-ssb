export interface ResourceSummary {
  slug: string;
  title: string;
  category: string;
  description: string;
}

export interface ResourceDetail extends ResourceSummary {
  body: string;
}
