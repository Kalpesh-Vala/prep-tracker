import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | undefined;

// Start ONE in-memory MongoDB for the whole test run and share its URI with
// all test files via `provide`. Avoids slow/flaky per-file mongod churn.
export async function setup(ctx: {
  provide: (key: 'mongoUri', value: string) => void;
}): Promise<void> {
  mongod = await MongoMemoryServer.create();
  ctx.provide('mongoUri', mongod.getUri());
}

export async function teardown(): Promise<void> {
  await mongod?.stop();
}
