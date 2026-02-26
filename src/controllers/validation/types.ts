export interface CSVRowCollection {
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  image: string;
  [key: string]: unknown;
}

export interface CSVStudentRow {
  name: string;
  email: string;
  class: string;
  picture: string;
  level: string;
  [key: string]: unknown;
}

export interface CSVSchoolRow {
  schoolName: string;
  schoolAddress: string;
  schoolCity: string;
  schoolState: string;
  schoolZip: string;
  schoolCountry: string;
  schoolEmail?: string;
  schoolLogoUrl?: string;
  themePrimary?: string;
  themeSecondary?: string;
  [key: string]: unknown;
}

export type McqUpdateData = {
  question?: string;
  options?: string[];
  description?: string;
};

export type CodingUpdateData = {
  question?: string;
  testCases?: unknown;
  description?: string;
};

export type ParagraphUpdateData = {
  question?: string;
  keywords?: string[];
  description?: string;
};
