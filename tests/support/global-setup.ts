import { assertIsolatedTestProcess } from "../../src/config/test-environment";
import { db } from "../../src/lib/db";
export default async function globalSetup() {
  const target = assertIsolatedTestProcess();
  const response = await fetch(`${target.baseUrl}/api/health`);
  const health = await response.json();
  if (
    !response.ok ||
    health.environment !== "test" ||
    health.testRunId !== process.env.TEST_ISOLATION_ID
  )
    throw new Error(
      "Refusing to run fixtures: server is not this isolated test instance.",
    );
  try {
    const [actual] = await db.$queryRaw<
      { name: string }[]
    >`SELECT current_database() as name`;
    if (actual.name !== target.databaseName)
      throw new Error("Refusing mismatched test database.");
  } finally {
    await db.$disconnect();
  }
}
