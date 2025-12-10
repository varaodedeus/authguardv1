import clientPromise, { ObjectId } from '../../lib/db.js';
import { authMiddleware } from '../../lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { keyId } = req.body;

    if (!keyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID da key é obrigatório' 
      });
    }

    const client = await clientPromise;
    const db = client.db('authguard');

    const key = await db.collection('keys').findOne({
      _id: new ObjectId(keyId),
      userId: new ObjectId(req.user.userId)
    });

    if (!key) {
      return res.status(404).json({ 
        success: false, 
        error: 'Key não encontrada' 
      });
    }

    await db.collection('keys').updateOne(
      { _id: new ObjectId(keyId) },
      { $set: { hwid: null } }
    );

    res.status(200).json({
      success: true,
      message: 'HWID resetado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao resetar HWID:', error);
    res.status(500).json({ success: false, error: 'Erro ao resetar HWID' });
  }
}

export default authMiddleware(handler);
