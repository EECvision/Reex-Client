export const REPOSITORY_URL = (
  process.env.NEXT_PUBLIC_REPOSITORY_URL ||
  "https://github.com/EECvision/Reex-api-client"
).replace(/\/$/, "");
export const ISSUES_URL = REPOSITORY_URL + "/issues";
