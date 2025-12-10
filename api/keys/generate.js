import clientPromise, { ObjectId } from '../../lib/db.js';
import { authMiddleware } from '../../lib/auth.js';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 4);

function generateKey() {
  return `AGRD-${nanoid()}-${nanoid()}-${nanoid()}`;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { projectId, duration, customerNote } = req.body;

    if (!projectId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID do projeto é obrigatório' 
      });
    }

    const client = await clientPromise;
    const db = client.db('authguard');

    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId),
      userId: new ObjectId(req.user.userId)
    });

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        error: 'Projeto não encontrado' 
      });
    }

    let key;
    let keyExists = true;
    
    while (keyExists) {
      key = generateKey();
      const existing = await db.collection('keys').findOne({ key });
      if (!existing) keyExists = false;
    }

    const durationDays = parseInt(duration) || 0;
    const expiresAt = durationDays === 0 ? null : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const result = await db.collection('keys').insertOne({
      projectId: new ObjectId(projectId),
      userId: new ObjectId(req.user.userId),
      key,
      hwid: null,
      duration: durationDays,
      status: 'active',
      createdAt: new Date(),
      expiresAt,
      lastUsed: null,
      usageCount: 0,
      customerNote: customerNote || ''
    });

    await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { 
        $inc: { 
          'stats.totalKeys': 1,
          'stats.activeKeys': 1
        } 
      }
    );

    res.status(201).json({
      success: true,
      key: {
        id: result.insertedId,
        key,
        duration: durationDays,
        expiresAt,
        customerNote
      }
    });
  } catch (error) {
    console.error('Erro ao gerar key:', error);
    res.status(500).json({ success: false, error: 'Erro ao gerar key' });
  }
}

export default authMiddleware(handler);
