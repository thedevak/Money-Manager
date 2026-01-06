
import { MongoClient, Db } from 'mongodb';

// Ensure we have a valid URI. The hardcoded fallback is provided by the user.
const uri = process.env.MONGODB_URI || 'mongodb+srv://anoop45578_db_user:cDwkTkehl9wHzgSq@mmdata.w6u2pea.mongodb.net/?appName=MMData';
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // Use globalThis to maintain the connection during hot reloads
  let globalWithMongo = globalThis as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production, always create a new client promise
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Returns the connected database instance.
 * Defaults to the database specified in the URI or 'fintrack'.
 */
export async function getDatabase(): Promise<Db> {
  const connectedClient = await clientPromise;
  return connectedClient.db();
}

export default clientPromise;
