import mongoose from 'mongoose';
import { getEnv } from './env';
import { DatastoreUnavailableError } from './errors';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Cache the connection on the global object so warm serverless invocations
// reuse a single pooled connection instead of opening a new one per request
// (Constitution Principle VI).
const globalForMongoose = globalThis as typeof globalThis & {
  _mongooseCache?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose._mongooseCache ?? {
  conn: null,
  promise: null,
};
globalForMongoose._mongooseCache = cached;

/**
 * Connect to MongoDB using a cached, pooled Mongoose connection. Throws
 * {@link DatastoreUnavailableError} when the datastore is unreachable so
 * callers can fail safely.
 */
export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  // A connection may already be open (e.g. established by tests).
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose;
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = getEnv('MONGODB_URI');
    cached.promise = mongoose.connect(uri, { bufferCommands: false });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw new DatastoreUnavailableError(error);
  }

  return cached.conn;
}
