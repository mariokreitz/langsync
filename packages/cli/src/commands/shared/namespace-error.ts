export function noNamespacesError(referenceLocale: string, inputDir: string): Error {
  return new Error(
    `No namespace files found under "${inputDir}". Run \`langsync init\` or create at least one namespace file for "${referenceLocale}".`,
  );
}
