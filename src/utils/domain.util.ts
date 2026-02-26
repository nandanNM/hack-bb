/**
 * Generates a clean domain string from school name and city
 * Removes special characters, spaces, and other unnecessary characters
 * @param schoolName - The name of the school
 * @param schoolCity - The city where the school is located
 * @returns A cleaned domain string in format: schoolname-city-randomnumber
 */

export const generateSchoolDomain = (schoolName: string, schoolCity: string): string => {
  const cleanSchoolName = schoolName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .trim();

  const cleanSchoolCity = schoolCity
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "")
    .trim();

  const randomSuffix = Math.floor(Math.random() * 10000);

  return `${cleanSchoolName}-${cleanSchoolCity}-${randomSuffix}`;
};
