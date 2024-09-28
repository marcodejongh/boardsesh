import { SearchRequestPagination } from "@/app/lib/types";

// Default climb search parameters
export const defaultClimbSearchParameters: SearchRequestPagination = {
  minGrade: 10,
  maxGrade: 33,
  name: "",
  minAscents: 1,
  sortBy: "ascents",
  sortOrder: "desc",
  minRating: 1.0,
  onlyClassics: false,
  gradeAccuracy: 1,
  settername: "",
  setternameSuggestion: "",
  holds: "",
  mirroredHolds: "",
  pageSize: 20, // Assuming PAGE_LIMIT is 20
  page: 0,
};
