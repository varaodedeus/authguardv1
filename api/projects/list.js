import clientPromise, { ObjectId } from '../../lib/db.js';
import { authMiddleware } from '../../lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { projectId } = req.query;

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

    const keys = await db.collection('keys')
      .find({ projectId: new ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .toArray();

    const now = new Date();
    for (const key of keys) {
      if (key.expiresAt && key.expiresAt < now && key.status === 'active') {
        await db.collection('keys').updateOne(
          { _id: key._id },
          { $set: { status: 'expired' } }
        );
        key.status = 'expired';
      }
    }

    res.status(200).json({
      success: true,
      keys
    });
  } catch (error) {
    console.error('Erro ao listar keys:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar keys' });
  }
}

export default authMiddleware(handler);
