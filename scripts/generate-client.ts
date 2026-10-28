import internals from "@prisma/internals";
import { createDefaultRegistry } from "@prisma/client-generator-registry";
const { getGenerators } = internals;
// The pinned official Prisma 7 generator parses the schema with WASM. The
// stable JS query compiler + pg adapter need no native query-engine download.
const generators = await getGenerators({
  schemaPath: "prisma/schema.prisma",
  skipDownload: true,
  cliCommand: "generate",
  registry: createDefaultRegistry("generate").toInternal(),
});
try {
  for (const generator of generators) await generator.generate();
} finally {
  for (const generator of generators) generator.stop();
}
