
import { getDatabase } from '../lib/mongodb';

/**
 * API Handler for FinTrack Pro Sync
 * Handles fetching and saving the entire financial state to MongoDB.
 */
export default async function handler(req: any, res: any) {
  try {
    const db = await getDatabase();
    // Fix: Explicitly using <any> generic on collection to allow string based _id filters
    // This resolves the error where 'admin_vault' (string) was not assignable to ObjectId.
    const collection = db.collection<any>('vault');
    const VAULT_ID = 'admin_vault';

    if (req.method === 'GET') {
      // Fetch the existing vault data
      // Fix: The collection generic <any> allows using a string as _id in the filter
      const vault = await collection.findOne({ _id: VAULT_ID });
      
      if (!vault) {
        // If no data exists, return empty structure (App.tsx will fall back to constants)
        return res.status(200).json({});
      }
      
      return res.status(200).json(vault.data);
    } 
    
    else if (req.method === 'POST') {
      // Save/Update the entire state
      const data = req.body;

      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Invalid data payload' });
      }

      // We use findOneAndReplace to ensure the DB matches the exact state sent by the frontend
      // Fix: Filter accepts string based _id because of the <any> generic type assigned to the collection.
      await collection.findOneAndReplace(
        { _id: VAULT_ID },
        { _id: VAULT_ID, data, updatedAt: new Date().toISOString() },
        { upsert: true }
      );

      return res.status(200).json({ success: true });
    } 
    
    else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error: any) {
    console.error('MongoDB API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
